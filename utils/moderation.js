const { EmbedBuilder } = require('discord.js');
const store = require('./store');
const { getSettings } = require('./settings');

const SAFE_MENTIONS = { parse: [], repliedUser: false };
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

function sanitizeReason(value, fallback = 'Sem motivo') {
    const reason = String(value || fallback)
        .replace(/@everyone/gi, '@ everyone')
        .replace(/@here/gi, '@ here')
        .replace(/<@!?&?\d{15,25}>/g, '[menção]')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .trim().slice(0, 400);
    return reason || fallback;
}

function parseDuration(value) {
    if (value == null || String(value).trim() === '') return 10 * 60 * 1000;
    const match = String(value).trim().toLowerCase().match(/^(\d{1,5})\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)?$/);
    if (!match) return null;
    const amount = Number(match[1]);
    const unit = match[2] || 'm';
    const multiplier = /^h|^hr|^hour/.test(unit) ? 60 * 60 * 1000
        : /^d|^day/.test(unit) ? 24 * 60 * 60 * 1000 : 60 * 1000;
    const duration = amount * multiplier;
    if (!Number.isSafeInteger(duration) || duration < 60 * 1000 || duration > MAX_TIMEOUT_MS) return null;
    return duration;
}

function durationLabel(ms) {
    if (ms % (24 * 60 * 60 * 1000) === 0) return (ms / (24 * 60 * 60 * 1000)) + ' dia(s)';
    if (ms % (60 * 60 * 1000) === 0) return (ms / (60 * 60 * 1000)) + ' hora(s)';
    return Math.ceil(ms / (60 * 1000)) + ' minuto(s)';
}

function resolveMember(message, args) {
    const mentioned = message.mentions?.members?.first();
    if (mentioned) return mentioned;
    const id = String(args?.[0] || '').match(/^\d{15,25}$/)?.[0];
    return id ? message.guild.members.cache.get(id) || null : null;
}

function checkAction(guild, moderator, target, botMember, permission, capability) {
    if (!guild || !moderator || !target || !botMember) {
        return { ok: false, error: 'Não consegui verificar os membros atuais. Nenhuma ação foi executada.' };
    }
    if (!moderator.permissions.has(permission)) return { ok: false, error: 'Você não tem a permissão necessária para esta ação.' };
    if (!botMember.permissions.has(permission)) return { ok: false, error: 'O Aeternus não tem a permissão necessária para esta ação.' };
    if (target.id === moderator.id) return { ok: false, error: 'Você não pode aplicar esta ação a si mesmo.' };
    if (target.id === botMember.id) return { ok: false, error: 'Não posso aplicar esta ação a mim mesmo.' };
    if (target.id === guild.ownerId) return { ok: false, error: 'Esta ação não pode ser aplicada ao dono do servidor.' };
    if (guild.ownerId !== moderator.id && target.roles.highest.comparePositionTo(moderator.roles.highest) >= 0) {
        return { ok: false, error: 'Seu cargo precisa estar acima do cargo do membro.' };
    }
    if (capability && !target[capability]) {
        return { ok: false, error: 'Não consigo executar esta ação nesse membro. Confira a hierarquia e as permissões do Aeternus.' };
    }
    return { ok: true };
}

async function recordAction(guild, action, moderator, target, reason, details = {}) {
    const entry = {
        id: String(Date.now()) + '-' + String(target?.id || 'unknown'),
        action: String(action).slice(0, 32),
        moderatorId: String(moderator?.id || ''),
        targetId: String(target?.id || ''),
        targetTag: String(target?.user?.tag || target?.tag || target?.id || 'Desconhecido').slice(0, 100),
        reason: sanitizeReason(reason), at: Date.now(),
        details: details && typeof details === 'object' ? details : {}
    };
    try {
        const all = store.load('moderation-history.json', {});
        const list = Array.isArray(all[guild.id]) ? all[guild.id] : [];
        list.push(entry);
        all[guild.id] = list.slice(-500);
        store.save('moderation-history.json', all);
    } catch (error) {
        console.error('[moderation] Não foi possível salvar o histórico:', error?.message || error);
    }
    try {
        const settings = getSettings(guild.id);
        if (!settings.logs?.enabled || !settings.logs?.channelId) return;
        const channel = await guild.channels.fetch(settings.logs.channelId).catch(() => null);
        if (!channel || !channel.isTextBased?.() || !channel.send) return;
        const colors = { ban: 0x7f1d1d, kick: 0xea580c, mute: 0x7c3aed, unmute: 0x16a34a };
        const embed = new EmbedBuilder().setColor(colors[action] || 0x64748b)
            .setTitle('Registro de moderação • ' + String(action).toUpperCase())
            .addFields(
                { name: 'Moderador', value: moderator ? '<@' + moderator.id + '> (' + moderator.id + ')' : 'Desconhecido', inline: true },
                { name: 'Membro', value: target ? '<@' + target.id + '> (' + target.id + ')' : entry.targetTag, inline: true },
                { name: 'Motivo', value: entry.reason.slice(0, 400) }
            ).setTimestamp(entry.at);
        if (details.duration) embed.addFields({ name: 'Duração', value: String(details.duration).slice(0, 100), inline: true });
        await channel.send({ embeds: [embed], allowedMentions: SAFE_MENTIONS }).catch(error =>
            console.warn('[moderation] Não foi possível enviar log:', error?.message || error));
    } catch (error) {
        console.warn('[moderation] Falha no registro de log:', error?.message || error);
    }
}

function buildResult(title, description, color = 0x22c55e) {
    return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp()
        .setFooter({ text: 'Aeternus • Registro de moderação' });
}

module.exports = { SAFE_MENTIONS, MAX_TIMEOUT_MS, sanitizeReason, parseDuration, durationLabel, resolveMember, checkAction, recordAction, buildResult };
