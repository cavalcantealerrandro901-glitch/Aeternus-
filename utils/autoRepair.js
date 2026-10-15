const crypto = require('crypto');
const repairWorkflow = require('./repairWorkflow');
const seen = new Map();
let minuteAt = Date.now();
let minuteCount = 0;

function errorText(error) {
    if (error instanceof Error) return [error.name + ': ' + error.message, error.stack || ''].filter(Boolean).join('\n');
    if (typeof error === 'string') return error;
    try { return JSON.stringify(error, null, 2) || String(error); } catch (_) { return String(error); }
}
async function getChannel(clientHint) {
    const guildId = String(process.env.AUTO_REPAIR_GUILD_ID || '').trim();
    const channelId = String(process.env.AUTO_REPAIR_CHANNEL_ID || '').trim();
    if (!channelId) throw new Error('AUTO_REPAIR_CHANNEL_ID não configurado no Render.');
    const client = clientHint || global.aeternusClient;
    if (!client) throw new Error('Cliente Discord indisponível.');
    let channel = client.channels.cache.get(channelId);
    if (!channel) channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased?.() || typeof channel.send !== 'function') throw new Error('Canal de reparo não encontrado ou sem permissão de envio.');
    if (guildId && String(channel.guildId || '') !== guildId) throw new Error('Canal não pertence ao servidor configurado.');
    return channel;
}
async function diagnose(source, cmdName, error, context) {
    const prompt = [
        'Você é a IA de diagnóstico do bot Discord Aeternus. Responda em português brasileiro.',
        'Explique causa provável, arquivo/linha quando houver, correção recomendada e como validar.',
        'Não diga que corrigiu ou testou código. Não solicite nem revele segredos.',
        'Origem: ' + String(source || 'sistema'),
        'Comando: ' + String(cmdName || 'não identificado'),
        'Contexto: ' + String(context || 'não informado').slice(0, 500),
        'Erro:', errorText(error).slice(0, 5500)
    ].join('\n');
    const providers = [];
    if (process.env.GROQ_API_KEY) providers.push({ name: 'Groq', key: process.env.GROQ_API_KEY, url: 'https://api.groq.com/openai/v1/chat/completions', model: process.env.GROQ_REPAIR_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b' });
    if (process.env.OPENAI_API_KEY) providers.push({ name: 'OpenAI', key: process.env.OPENAI_API_KEY, url: 'https://api.openai.com/v1/chat/completions', model: process.env.OPENAI_REPAIR_MODEL || 'gpt-4.1-mini' });
    for (const p of providers) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 16000);
            let response;
            try {
                response = await fetch(p.url, {
                    method: 'POST', signal: controller.signal,
                    headers: { Authorization: 'Bearer ' + p.key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: p.model, messages: [
                        { role: 'system', content: 'Diagnostique erros com cautela. Não invente resultados.' },
                        { role: 'user', content: prompt }
                    ], temperature: 0.2, max_tokens: 650 })
                });
            } finally { clearTimeout(timer); }
            if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + (await response.text()).slice(0, 180));
            const data = await response.json();
            const answer = data.choices?.[0]?.message?.content;
            if (answer) return { provider: p.name, text: String(answer).slice(0, 3000) };
        } catch (e) { console.warn('[autoRepair] ' + p.name + ' falhou: ' + e.message); }
    }
    return { provider: 'indisponível', text: 'A IA não conseguiu responder. Configure GROQ_API_KEY ou OPENAI_API_KEY no Render e confirme se a chave/modelo são válidos.' };
}
async function reportError({ source = 'system', error, context = '', tryReload = false, fromCommand = false, cmdName, message, interaction, client } = {}) {
    const stack = errorText(error).slice(0, 5800);
    const fingerprint = crypto.createHash('sha1').update([source, cmdName || '', context, stack.split('\n').slice(0, 3).join('\n')].join('|')).digest('hex').slice(0, 12);
    console.warn('[autoRepair][' + source + '][' + fingerprint + '] ' + stack.slice(0, 1200));
    const now = Date.now();
    if (now - minuteAt >= 60000) { minuteAt = now; minuteCount = 0; }
    if (minuteCount >= 25) { console.warn('[autoRepair] Limite de segurança: 25 alertas por minuto.'); return { ok: false, reason: 'rate_limited', fingerprint }; }
    minuteCount++;
    const previous = seen.get(fingerprint);
    const duplicate = previous && now - previous < 30000;
    seen.set(fingerprint, now);
    if (seen.size > 400) for (const [key, time] of seen) if (now - time > 120000) seen.delete(key);
    let channel;
    try { channel = await getChannel(client || message?.client || interaction?.client); }
    catch (e) { console.warn('[autoRepair] Canal de reparo indisponível: ' + e.message); return { ok: false, reason: 'channel_unavailable', error: e.message, fingerprint }; }
    const roleId = String(process.env.AUTO_REPAIR_ROLE_ID || '').trim();
    const mention = roleId ? '<@&' + roleId + '>' : '';
    const shortError = String(stack.split('\n')[0] || 'Erro sem descrição').replace(/\s+/g, ' ').slice(0, 220);
    const report = [
        mention, '⚠️ **AETERNUS · ERRO DETECTADO**',
        '**Tipo:** ' + String(source || 'sistema').slice(0, 35),
        '**Comando:** ' + String(cmdName || 'não identificado').slice(0, 65),
        '**Resumo:** ' + shortError,
        '**ID:** ' + fingerprint,
        duplicate ? 'Erro repetido. Use **Testar** para gerar uma nova proposta.' : 'A equipe pode testar a correção pelos botões abaixo.'
    ].filter(Boolean).join('\n');
    try {
        repairWorkflow.registerIncident({
            id: fingerprint,
            source,
            cmdName,
            context,
            error,
            errorText: stack
        });
        const alertMessage = await channel.send({
            content: report.slice(0, 1950),
            components: [repairWorkflow.createActionRow(fingerprint, false, false)],
            allowedMentions: { parse: [], roles: roleId ? [roleId] : [] }
        });
        repairWorkflow.registerIncidentMessage(fingerprint, alertMessage);
    } catch (e) { console.warn('[autoRepair] Falha ao enviar alerta: ' + e.message); return { ok: false, reason: 'send_failed', error: e.message, fingerprint }; }
    if (!duplicate) {
        const result = await diagnose(source, cmdName, error, context);
        try {
            const diagnosisMessage = await channel.send({ content: ('# DIAGNÓSTICO DA IA\n**Provedor:** ' + result.provider + '\n**Incidente:** ' + fingerprint + '\n\n' + result.text).slice(0, 1950), allowedMentions: { parse: [] } });
            repairWorkflow.registerIncidentMessage(fingerprint, diagnosisMessage);
        } catch (e) { console.warn('[autoRepair] Falha ao enviar diagnóstico: ' + e.message); }
    }
    return { ok: true, fingerprint, duplicate, tryReload: !!tryReload, fromCommand: !!fromCommand };
}
async function handleCommandError({ cmdName, error, context, message, interaction }) {
    const result = await reportError({ source: 'command', cmdName, error, context, message, interaction, client: message?.client || interaction?.client, fromCommand: true });
    const response = 'Ocorreu um erro ao executar este comando. Incidente: ' + (result.fingerprint || 'não identificado') + '. A equipe foi avisada se o canal estiver configurado.';
    try {
        if (interaction && !interaction.replied && !interaction.deferred) await interaction.reply({ content: response, ephemeral: true }).catch(() => {});
        else if (interaction && interaction.deferred) await interaction.editReply({ content: response }).catch(() => {});
        else if (interaction && interaction.replied) await interaction.followUp({ content: response, ephemeral: true }).catch(() => {});
        else if (message?.reply) await message.reply(response).catch(() => {});
    } catch (_) {}
    return result;
}
module.exports = { reportError, handleCommandError };
