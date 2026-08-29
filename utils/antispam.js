const store = require('./store');
const { getSettings } = require('./settings');

/** Janela em memória: guild:user -> { times: number[], lastContent, repeats } */
const buckets = new Map();

function key(guildId, userId) {
    return `${guildId}:${userId}`;
}

/**
 * Retorna { block: boolean, reason?: string, action?: 'delete'|'timeout'|'warn' }
 */
function check(message) {
    if (!message.guild || message.author.bot) return { block: false };
    const conf = getSettings(message.guild.id).automod || {};
    if (conf.enabled === false) return { block: false };

    const antiSpam = conf.antiSpam !== false;
    const maxMsgs = conf.maxMessages ?? 6;
    const windowMs = conf.windowMs ?? 5000;
    const maxDup = conf.maxDuplicates ?? 3;
    const minLen = conf.minLength ?? 0;

    const k = key(message.guild.id, message.author.id);
    const now = Date.now();
    let b = buckets.get(k);
    if (!b) {
        b = { times: [], lastContent: '', repeats: 0 };
        buckets.set(k, b);
    }

    // limpa janela
    b.times = b.times.filter((t) => now - t < windowMs);
    b.times.push(now);

    const content = (message.content || '').trim().toLowerCase();

    if (antiSpam && b.times.length > maxMsgs) {
        return { block: true, reason: `Spam: mais de ${maxMsgs} msgs em ${Math.round(windowMs / 1000)}s`, action: conf.punish || 'delete' };
    }

    if (antiSpam && content.length >= 3) {
        if (content === b.lastContent) b.repeats++;
        else {
            b.lastContent = content;
            b.repeats = 1;
        }
        if (b.repeats >= maxDup) {
            return { block: true, reason: 'Mensagens repetidas', action: conf.punish || 'delete' };
        }
    }

    if (conf.antiInvite && /(discord\.gg|discord(?:app)?\.com\/invite)\//i.test(message.content || '')) {
        if (!message.member?.permissions?.has?.('ManageMessages')) {
            return { block: true, reason: 'Convites bloqueados', action: 'delete' };
        }
    }

    if (conf.antiLink && /https?:\/\//i.test(message.content || '')) {
        if (!message.member?.permissions?.has?.('ManageMessages')) {
            return { block: true, reason: 'Links bloqueados', action: 'delete' };
        }
    }

    if (minLen > 0 && content.length > 0 && content.length < minLen) {
        return { block: true, reason: `Mensagem muito curta (mín. ${minLen})`, action: 'delete' };
    }

    return { block: false };
}

async function apply(message, result) {
    if (!result.block) return;
    try {
        await message.delete().catch(() => {});
        if (result.action === 'timeout' && message.member?.moderatable) {
            await message.member.timeout(60_000, `Anti-spam: ${result.reason}`).catch(() => {});
        }
        const warn = await message.channel
            .send(`⚠️ ${message.author}: ${result.reason}`)
            .catch(() => null);
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 5000);
    } catch (_) {}
}

module.exports = { check, apply };
