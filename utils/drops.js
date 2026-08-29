const store = require('./store');
const flocos = require('./flocos');
const cristais = require('./cristais');
const msgStats = require('./msgStats');
const { getSettings } = require('./settings');
const xp = require('./xp');

function all() {
    return store.load('drops.json', {});
}

function save(data) {
    store.save('drops.json', data);
}

function parseDuration(str) {
    if (!str) return null;
    const m = String(str)
        .trim()
        .toLowerCase()
        .match(/^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|dia|dias)?$/i);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    if (!n || n < 1) return null;
    const u = (m[2] || 'm').toLowerCase();
    if (u.startsWith('s')) return Math.min(n, 86400) * 1000;
    if (u.startsWith('h')) return Math.min(n, 168) * 3600 * 1000;
    if (u.startsWith('d')) return Math.min(n, 14) * 86400 * 1000;
    return Math.min(n, 10080) * 60 * 1000;
}

function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
}

function parsePrize(text) {
    const t = String(text || '').trim();
    const m = t.match(/^(\d+(?:[.,]\d+)?[km]?)\s*(flocos?|cristais?|❄️|💠)?$/i);
    if (m) {
        const { parseAmount } = require('./parseAmount');
        const amount = parseAmount(m[1]);
        const coinRaw = (m[2] || 'flocos').toLowerCase();
        const coin = coinRaw.includes('cristal') || coinRaw === '💠' ? 'cristais' : 'flocos';
        if (amount > 0) return { type: coin, amount, label: t };
    }
    return { type: 'text', amount: 0, label: t || 'Prêmio misterioso' };
}

/**
 * Parse: msgs:10 semana:50 mes:100 nivel:5 cargo:ID invites:2 flocos:1000 cristais:10
 */
function parseReqFlags(text, message) {
    const out = {
        minMessagesDay: 0,
        minMessagesWeek: 0,
        minMessagesMonth: 0,
        minLevel: 0,
        minInvites: 0,
        minFlocos: 0,
        minCristais: 0,
        requiredRoleIds: []
    };
    if (!text) return out;
    const t = text.toLowerCase();

    const num = (re) => {
        const m = t.match(re);
        return m ? parseInt(m[1], 10) : 0;
    };

    out.minMessagesDay = num(/(?:msgs?|mensagens?)[:\s]+(\d+)/) || num(/hoje[:\s]+(\d+)/);
    out.minMessagesWeek = num(/(?:semana|week)[:\s]+(\d+)/);
    out.minMessagesMonth = num(/(?:m[eê]s|month)[:\s]+(\d+)/);
    out.minLevel = num(/(?:nivel|nível|level|xp)[:\s]+(\d+)/);
    out.minInvites = num(/(?:invites?|convites?)[:\s]+(\d+)/);
    out.minFlocos = num(/(?:flocos?)[:\s]+(\d+)/);
    out.minCristais = num(/(?:cristais?)[:\s]+(\d+)/);

    // cargo:id ou menção
    const roleMention = text.match(/<@&(\d+)>/);
    const roleId = text.match(/(?:cargo|role)[:\s]+(\d{15,20})/i);
    if (roleMention) out.requiredRoleIds.push(roleMention[1]);
    else if (roleId) out.requiredRoleIds.push(roleId[1]);
    else if (message?.mentions?.roles?.size) {
        out.requiredRoleIds.push(...message.mentions.roles.map((r) => r.id));
    }

    return out;
}

function createDrop(entry) {
    const data = all();
    if (!entry.participants) entry.participants = {};
    data[entry.id] = entry;
    save(data);
    return entry;
}

function getDrop(id) {
    return all()[id] || null;
}

function findByRerollId(rerollId) {
    const id = String(rerollId);
    return Object.values(all()).find((d) => d && (String(d.rerollId) === id || String(d.messageId) === id)) || null;
}

function findByMessageId(messageId) {
    return findByRerollId(messageId);
}

function updateDrop(id, patch) {
    const data = all();
    if (!data[id]) return null;
    data[id] = { ...data[id], ...patch };
    save(data);
    return data[id];
}

function removeDrop(id) {
    const data = all();
    delete data[id];
    save(data);
}

function listActive() {
    return Object.values(all()).filter((d) => d && !d.ended);
}

function cleanupOld(days = 14) {
    const data = all();
    const cut = Date.now() - days * 864e5;
    let n = 0;
    for (const [id, d] of Object.entries(data)) {
        if (d?.ended && (d.endedAt || d.endsAt || 0) < cut) {
            delete data[id];
            n++;
        }
    }
    if (n) save(data);
    return n;
}

function payPrize(userId, prize) {
    if (!prize || prize.type === 'text') return false;
    if (prize.type === 'cristais') {
        cristais.add(userId, prize.amount);
        return true;
    }
    flocos.add(userId, prize.amount);
    return true;
}

function getRequirements(guildId, drop) {
    const conf = getSettings(guildId).drops || {};
    const base = conf.requirements || {};
    const over = drop?.requirements || {};
    return {
        minMessagesDay: Number(over.minMessagesDay ?? base.minMessagesDay ?? 0),
        minMessagesWeek: Number(over.minMessagesWeek ?? base.minMessagesWeek ?? 0),
        minMessagesMonth: Number(over.minMessagesMonth ?? base.minMessagesMonth ?? 0),
        requiredRoleIds: Array.isArray(over.requiredRoleIds)
            ? over.requiredRoleIds
            : Array.isArray(base.requiredRoleIds)
              ? base.requiredRoleIds
              : [],
        minLevel: Number(over.minLevel ?? base.minLevel ?? 0),
        minInvites: Number(over.minInvites ?? base.minInvites ?? 0),
        minFlocos: Number(over.minFlocos ?? base.minFlocos ?? 0),
        minCristais: Number(over.minCristais ?? base.minCristais ?? 0)
    };
}

function checkRequirements(member, drop) {
    const req = getRequirements(member.guild.id, drop);
    const stats = msgStats.getUser(member.guild.id, member.id);
    const fails = [];

    if (req.minMessagesDay > 0 && stats.today < req.minMessagesDay)
        fails.push(`mensagens hoje: ${stats.today}/${req.minMessagesDay}`);
    if (req.minMessagesWeek > 0 && stats.week < req.minMessagesWeek)
        fails.push(`mensagens na semana: ${stats.week}/${req.minMessagesWeek}`);
    if (req.minMessagesMonth > 0 && stats.month < req.minMessagesMonth)
        fails.push(`mensagens no mês: ${stats.month}/${req.minMessagesMonth}`);
    if (req.minLevel > 0) {
        const level = xp.get(member.id).level || 0;
        if (level < req.minLevel) fails.push(`nível XP: ${level}/${req.minLevel}`);
    }
    if (req.minFlocos > 0 && flocos.get(member.id) < req.minFlocos)
        fails.push(`flocos: ${flocos.get(member.id)}/${req.minFlocos}`);
    if (req.minCristais > 0 && cristais.get(member.id) < req.minCristais)
        fails.push(`cristais: ${cristais.get(member.id)}/${req.minCristais}`);

    if (req.requiredRoleIds?.length) {
        const has = req.requiredRoleIds.some((rid) => member.roles.cache.has(rid));
        if (!has) fails.push('cargo exigido ausente');
    }

    if (req.minInvites > 0) {
        try {
            const inv = require('./invites');
            const n = inv.getStats(member.guild.id, member.id).total || 0;
            if (n < req.minInvites) fails.push(`convites: ${n}/${req.minInvites}`);
        } catch (_) {}
    }

    return { ok: fails.length === 0, fails, req, stats };
}

function calcExtraEntries(member, drop) {
    const conf = getSettings(member.guild.id).drops || {};
    const list = Array.isArray(conf.extraEntries) ? conf.extraEntries : [];
    const stats = msgStats.getUser(member.guild.id, member.id);
    let bonus = 0;
    const details = [];

    for (const rule of list) {
        if (!rule || !rule.bonus) continue;
        const b = Math.max(0, Math.floor(Number(rule.bonus) || 0));
        if (!b) continue;
        const type = rule.type || 'role';

        if (type === 'role' && rule.roleId && member.roles.cache.has(rule.roleId)) {
            bonus += b;
            details.push(`+${b} (${rule.name || 'cargo'})`);
        } else if (type === 'messages_day' && stats.today >= Number(rule.value || 0)) {
            bonus += b;
            details.push(`+${b} (${rule.name || 'msgs dia'})`);
        } else if (type === 'messages_week' && stats.week >= Number(rule.value || 0)) {
            bonus += b;
            details.push(`+${b} (${rule.name || 'msgs semana'})`);
        } else if (type === 'messages_month' && stats.month >= Number(rule.value || 0)) {
            bonus += b;
            details.push(`+${b} (${rule.name || 'msgs mês'})`);
        } else if (type === 'level') {
            const level = xp.get(member.id).level || 0;
            if (level >= Number(rule.value || 0)) {
                bonus += b;
                details.push(`+${b} (${rule.name || 'nível'})`);
            }
        }
    }

    return { bonus, details, total: 1 + bonus };
}

function joinDrop(dropId, userId, tag, entries) {
    const data = all();
    const drop = data[dropId];
    if (!drop || drop.ended) return null;
    if (!drop.participants) drop.participants = {};
    drop.participants[userId] = {
        tag,
        entries: Math.max(1, Math.floor(entries || 1)),
        joinedAt: Date.now()
    };
    save(data);
    return drop;
}

function participantCount(drop) {
    return Object.keys(drop?.participants || {}).length;
}

function totalTickets(drop) {
    return Object.values(drop?.participants || {}).reduce((a, p) => a + (p.entries || 1), 0);
}

/** excludeIds: evita repetir o mesmo vencedor no reroll quando possível */
function pickWinners(drop, excludeIds = []) {
    const exclude = new Set(excludeIds || []);
    const pool = [];
    for (const [uid, p] of Object.entries(drop.participants || {})) {
        const n = Math.max(1, p.entries || 1);
        for (let i = 0; i < n; i++) pool.push({ id: uid, tag: p.tag });
    }
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const winners = [];
    const seen = new Set();

    // tenta primeiro quem não estava no último sorteio
    for (const pass of [true, false]) {
        for (const p of pool) {
            if (seen.has(p.id)) continue;
            if (pass && exclude.has(p.id) && Object.keys(drop.participants).length > (drop.winners || 1))
                continue;
            seen.add(p.id);
            winners.push(p);
            if (winners.length >= (drop.winners || 1)) return winners;
        }
    }
    return winners;
}

module.exports = {
    parseDuration,
    formatDuration,
    parsePrize,
    parseReqFlags,
    createDrop,
    getDrop,
    findByRerollId,
    findByMessageId,
    updateDrop,
    removeDrop,
    listActive,
    cleanupOld,
    payPrize,
    checkRequirements,
    calcExtraEntries,
    joinDrop,
    participantCount,
    totalTickets,
    pickWinners,
    getRequirements,
    all,
    save
};
