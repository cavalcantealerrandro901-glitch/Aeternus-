const { PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('./settings');

/** guild:user -> { times, lastContent, repeats, strikes, lastStrikeAt } */
const buckets = new Map();

function key(guildId, userId) {
    return `${guildId}:${userId}`;
}

function normalize(content) {
    return String(content || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function isCharFlood(content) {
    const c = content.replace(/\s/g, '');
    if (c.length < 1) return false;
    if (/^(.)\1*$/u.test(c)) return true;
    const parts = content.split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts.every((p) => p === parts[0] && p.length <= 3)) {
        return true;
    }
    return false;
}

function getBucket(guildId, userId) {
    const k = key(guildId, userId);
    let b = buckets.get(k);
    if (!b) {
        b = {
            times: [],
            lastContent: '',
            repeats: 0,
            strikes: 0,
            lastStrikeAt: 0
        };
        buckets.set(k, b);
    }
    if (b.strikes > 0 && Date.now() - b.lastStrikeAt > 2 * 3600_000) {
        b.strikes = 0;
    }
    return b;
}

function check(message) {
    if (!message.guild || message.author.bot) return { block: false };
    if (message.member?.permissions?.has?.(PermissionFlagsBits.ManageMessages)) {
        return { block: false };
    }

    const conf = getSettings(message.guild.id).automod || {};
    if (conf.enabled === false) return { block: false };

    const antiSpam = conf.antiSpam !== false;
    if (!antiSpam) return { block: false };

    const maxDup = Math.max(2, Math.min(10, conf.maxDuplicates ?? 2));
    const maxMsgs = conf.maxMessages ?? 6;
    const windowMs = conf.windowMs ?? 5000;

    const b = getBucket(message.guild.id, message.author.id);
    const now = Date.now();
    b.times = b.times.filter((t) => now - t < windowMs);
    b.times.push(now);

    const content = normalize(message.content);
    let violated = false;
    let reason = '';

    if (b.times.length > maxMsgs) {
        violated = true;
        reason = `Spam rápido (mais de ${maxMsgs} msgs em ${Math.round(windowMs / 1000)}s)`;
    }

    if (!violated && content.length > 0) {
        const shortSpam = content.length <= 2 || isCharFlood(content);
        const prevShort = b.lastContent.length <= 2 || isCharFlood(b.lastContent);

        if (content === b.lastContent) {
            b.repeats++;
        } else if (shortSpam && prevShort) {
            b.repeats++;
            b.lastContent = content;
        } else {
            b.lastContent = content;
            b.repeats = 1;
        }

        if (b.repeats > maxDup) {
            violated = true;
            reason = `Repetição excessiva ("${content.slice(0, 20)}") — máximo ${maxDup} vezes`;
        }
    }

    if (
        !violated &&
        conf.antiInvite &&
        /(discord\.gg|discord(?:app)?\.com\/invite)\//i.test(message.content || '')
    ) {
        return { block: true, reason: 'Convites bloqueados', punish: 'delete' };
    }
    if (!violated && conf.antiLink && /https?:\/\//i.test(message.content || '')) {
        return { block: true, reason: 'Links bloqueados', punish: 'delete' };
    }

    if (!violated) return { block: false };

    b.strikes++;
    b.lastStrikeAt = now;
    b.repeats = 0;

    if (b.strikes === 1) return { block: true, reason, punish: 'warn' };
    if (b.strikes === 2) return { block: true, reason, punish: 'mute' };
    return { block: true, reason, punish: 'ban' };
}

async function apply(message, result) {
    if (!result.block) return;
    const member = message.member;
    const user = message.author;

    try {
        await message.delete().catch(() => {});
    } catch (_) {}

    const punish = result.punish || 'delete';

    try {
        if (punish === 'warn') {
            const w = await message.channel
                .send(
                    `⚠️ ${user}, pare de repetir mensagens/letras/números.\n` +
                        `Motivo: **${result.reason}**\n` +
                        `Próxima vez: **mute de 1 hora**. Depois: **ban**.`
                )
                .catch(() => null);
            if (w) setTimeout(() => w.delete().catch(() => {}), 12_000);
            return;
        }

        if (punish === 'mute' && member?.moderatable) {
            await member
                .timeout(60 * 60 * 1000, `Anti-spam: ${result.reason}`)
                .catch(() => {});
            const w = await message.channel
                .send(
                    `🔇 ${user} recebeu **mute de 1 hora** por spam/repetição.\n` +
                        `Se continuar após o mute: **ban**.`
                )
                .catch(() => null);
            if (w) setTimeout(() => w.delete().catch(() => {}), 15_000);
            return;
        }

        if (punish === 'ban' && member?.bannable) {
            await member
                .ban({
                    reason: `Anti-spam (3ª infração): ${result.reason}`,
                    deleteMessageSeconds: 0
                })
                .catch(() => {});
            const w = await message.channel
                .send(`🔨 ${user.tag} foi **banido** por ignorar avisos de anti-spam.`)
                .catch(() => null);
            if (w) setTimeout(() => w.delete().catch(() => {}), 15_000);
            return;
        }

        const w = await message.channel
            .send(`⚠️ ${user}: ${result.reason}`)
            .catch(() => null);
        if (w) setTimeout(() => w.delete().catch(() => {}), 8000);
    } catch (_) {}
}

module.exports = { check, apply };
