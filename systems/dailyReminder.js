/**
 * Lembrete de daily por DM — meia-noite (Brasília), 1x por dia.
 * Mensagens personalizadas por nome, sequência, nível e saldo.
 *
 * ENV: DAILY_REMINDER=off para desligar
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');
const daily = require('../utils/daily');
const eter = require('../utils/eter');

const CHECK_MS = 60 * 1000;
const BATCH_DELAY_MS = 1200;

let lastRunDay = null;

function reminders() {
    return store.load('daily_reminders.json', {});
}

function saveReminders(data) {
    store.save('daily_reminders.json', data);
}

function nowBRT() {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    return {
        day: `${parts.year}-${parts.month}-${parts.day}`,
        hour: Number(parts.hour),
        minute: Number(parts.minute)
    };
}

function isEnabled() {
    const v = String(process.env.DAILY_REMINDER || 'on').toLowerCase();
    return v !== 'off' && v !== '0' && v !== 'false' && v !== 'no';
}

function candidateIds() {
    const ids = new Set();
    try {
        for (const id of Object.keys(store.load('daily.json', {}) || {})) ids.add(id);
    } catch (_) {}
    try {
        const e = typeof eter.all === 'function' ? eter.all() : store.load('eter.json', {});
        for (const id of Object.keys(e || {})) ids.add(id);
    } catch (_) {}
    try {
        for (const id of Object.keys(store.load('xp.json', {}) || {})) ids.add(id);
    } catch (_) {}
    return [...ids].filter((id) => /^\d{16,20}$/.test(id));
}

function fmt(n) {
    if (typeof eter.formatPlain === 'function') return eter.formatPlain(n);
    return Number(n || 0).toLocaleString('pt-BR');
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildEmbed(user, st) {
    const name = user?.username || 'viajante';
    const streak = Number(st.nextStreak || st.streak || 0);
    const level = Number(st.level || 0);
    const bal = Number(st.balance || 0);
    const min = st.dailyMin ?? 5000;
    const max = st.dailyMax ?? 15000;
    const mult = Number(st.multiplier || 1);
    const inactiveDays = daily.daysSince(st.last);
    if (inactiveDays === 6) {
        return new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle('Aviso de sequência diária')
            .setDescription(
                `Olá, **${name}**! Faz 6 dias desde seu último resgate.\\n\\n` +
                `Sua sequência atual é de **${Number(st.streak || 0)} dia(s)**.\\n` +
                'Resgate o daily hoje para manter a sequência. Ao completar 7 dias sem resgatar, ela será reiniciada no próximo resgate.\\n\\n' +
                'Use **O.daily** ou **/daily** em um servidor com o Aeternus.'
            )
            .setFooter({ text: 'Aeternus Economy • Aviso por mensagem privada' });
    }


    let color = 0xa78bfa;
    let title = '✦ Daily disponível';
    let body = '';

    if (streak >= 30) {
        color = 0xfbbf24;
        title = pick(['👑 Lenda da sequência', '✦ Trinta dias e além', '🌟 Constância rara']);
        body = pick([
            [
                `**${name}**, sua marca é difícil de ignorar.`,
                `Hoje a sequência pode chegar a **${streak} dias**.`,
                '',
                'O éter de hoje espera por quem não quebra o ritmo.',
                `Faixa estimada: ✨ **${fmt(min)} – ${fmt(max)}**` +
                    (mult > 1 ? ` · bônus ×${mult.toFixed(2)}` : '') +
                    '.',
                '',
                'Resgate agora: **O.daily** ou **/diario**'
            ].join('\n'),
            [
                `A madrugada reconhece **${name}**.`,
                `**${streak} dias** de caminho — continue.`,
                '',
                'Um único resgate mantém tudo o que você construiu.',
                '',
                '→ **O.daily**  ·  **/diario**'
            ].join('\n')
        ]);
    } else if (streak >= 7) {
        color = 0x34d399;
        title = pick(['🔥 Semana em chamas', '✦ Sequência firme', '💪 Ritmo conquistado']);
        body = pick([
            [
                `**${name}**, você já segura **${Math.max(streak - 1, 1)}+ dias** seguidos.`,
                `Hoje pode ser o dia **${streak}**.`,
                '',
                'Não deixe a meia-noite passar em branco.',
                `Recompensa na faixa ✨ **${fmt(min)} – ${fmt(max)}**.`,
                '',
                '**O.daily** ou **/diario** — e a sequência segue.'
            ].join('\n'),
            [
                `Bom recomeço de ciclo, **${name}**.`,
                `Sua sequência está viva. O próximo passo é **${streak}**.`,
                '',
                'Resgate em segundos e siga o dia mais leve.',
                '',
                '→ **/diario**'
            ].join('\n')
        ]);
    } else if (streak <= 1 && !st.last) {
        color = 0x60a5fa;
        title = pick(['✨ Primeiro passo', '🌕 Novo no éter', '✦ Comece aqui']);
        body = pick([
            [
                `Olá, **${name}**.`,
                '',
                'Todo dia o Aeternus libera uma recompensa só sua.',
                `Hoje, algo entre ✨ **${fmt(min)}** e **${fmt(max)}** pode ser seu.`,
                '',
                'É rápido — e abre a sua sequência.',
                '',
                'Use **O.daily** ou **/diario** no servidor.'
            ].join('\n'),
            [
                `**${name}**, bem-vindo ao ciclo diário.`,
                '',
                'Um resgate por dia. Sem mistério.',
                'Depois, cada dia conta.',
                '',
                '→ **O.daily**'
            ].join('\n')
        ]);
    } else if (streak <= 1) {
        color = 0xf472b6;
        title = pick(['🔄 De volta ao ciclo', '✦ Recomeço', '🌓 Outra chance']);
        body = pick([
            [
                `**${name}**, um novo dia limpa a contagem — e reabre o prêmio.`,
                '',
                'Resgatar hoje é recomeçar a sequência do zero, com éter na conta.',
                `Faixa: ✨ **${fmt(min)} – ${fmt(max)}**.`,
                '',
                '**O.daily** · **/diario**'
            ].join('\n'),
            [
                `A meia-noite não pergunta o que ficou para trás, **${name}**.`,
                'Só oferece o que você faz agora.',
                '',
                'Colete o daily e comece de novo.',
                '',
                '→ **/diario**'
            ].join('\n')
        ]);
    } else {
        color = 0xa78bfa;
        title = pick(['✦ Um novo ciclo começou', '🌑 Daily à espera', '✨ Éter da madrugada']);
        body = pick([
            [
                `Olá, **${name}**.`,
                '',
                `Sua sequência está em **${Math.max(streak - 1, 1)} dia(s)**.`,
                `Resgate hoje e avance para **${streak}**.`,
                '',
                `Estimativa: ✨ **${fmt(min)} – ${fmt(max)}**` +
                    (mult > 1 ? ` (bônus ×${mult.toFixed(2)})` : '') +
                    '.',
                '',
                '**O.daily** ou **/diario**'
            ].join('\n'),
            [
                `**${name}**, a recompensa diária abriu com a meia-noite.`,
                '',
                level > 0
                    ? `Nível **${level}** · saldo **✨ ${fmt(bal)}**.`
                    : `Saldo atual: **✨ ${fmt(bal)}**.`,
                'Um comando é o bastante para garantir o dia.',
                '',
                '→ **O.daily**  ·  **/diario**'
            ].join('\n'),
            [
                `Madrugada quieta, **${name}** — e o daily já é seu se quiser.`,
                '',
                `Sequência à vista: **${streak}**. Não quebre o fio.`,
                '',
                'Resgate: **/diario**'
            ].join('\n')
        ]);
    }

    return new EmbedBuilder().setColor(color).setTitle(title).setDescription(body);
}

let ticking = false;

async function tick(client) {
    if (!isEnabled() || ticking) return;
    ticking = true;
    try {
        // Não depende de o bot estar online exatamente à meia-noite:
        // avisa no primeiro ciclo disponível; falhas permanentes de DM são registradas no dia para evitar tentativas repetidas a cada minuto.
        const { day } = nowBRT();
        const data = reminders();
        const ids = candidateIds();
        let sent = 0;
        let failedDM = 0;
        let fetchFailed = 0;

        for (const id of ids) {
            if (data[id] === day) continue;

            try {
                const st = daily.status(id);
                // Não avisa quem já resgatou o daily neste dia.
                if (st.claimed) {
                    data[id] = day;
                    continue;
                }

                const user = await client.users.fetch(id).catch(() => null);
                if (!user) {
                    fetchFailed += 1;
                    continue;
                }

                try {
                    await user.send({ embeds: [buildEmbed(user, st)] });
                    data[id] = day;
                    sent += 1;
                    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
                } catch (error) {
                    // Falhas comuns de DM (privacidade, bloqueio ou nenhum servidor em comum)
                    // não precisam poluir os logs nem provocar novas tentativas a cada minuto.
                    const code = Number(error?.code);
                    const message = String(error?.message || '');
                    const cannotDM = code === 50007 ||
                        /Cannot send messages to this user|no mutual guilds/i.test(message);

                    if (cannotDM) {
                        data[id] = day;
                        failedDM += 1;
                    } else {
                        console.warn('[dailyReminder] Erro inesperado ao enviar DM:', error?.message || error);
                    }
                }
            } catch (error) {
                console.warn('[dailyReminder] Falha ao processar lembrete:', error?.message || error);
            }
        }

        saveReminders(data);
        if (sent || failedDM || fetchFailed) {
            console.log(`[dailyReminder] ${day} · enviadas: ${sent} · DMs indisponíveis: ${failedDM} · usuários não encontrados: ${fetchFailed}`);
        }
    } finally {
        ticking = false;
    }
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[dailyReminder] desligado (DAILY_REMINDER=off)');
        return;
    }
    console.log('[dailyReminder] ativo · meia-noite BRT');
    setTimeout(() => tick(client).catch(() => {}), 8000);
    setInterval(() => tick(client).catch(() => {}), CHECK_MS);
}

module.exports = { setup, tick, buildEmbed };
