const store = require('./store');
const eter = require('./eter');
const xp = require('./xp');

const KEY = 'drops.json';

function all() {
    return store.load(KEY, {});
}

function save(data) {
    store.save(KEY, data);
}

function parseDuration(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return 5 * 60 * 1000;
    const m = s.match(/^(\d+)\s*(s|sec|m|min|h|hr|d)?$/i);
    if (!m) return 5 * 60 * 1000;
    const n = Number(m[1]);
    const u = (m[2] || 'm').toLowerCase();
    if (u.startsWith('s')) return Math.max(15000, n * 1000);
    if (u.startsWith('h')) return n * 60 * 60 * 1000;
    if (u.startsWith('d')) return n * 24 * 60 * 60 * 1000;
    return Math.max(15000, n * 60 * 1000);
}

function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60);
    return h + 'h' + (m % 60 ? m % 60 + 'm' : '');
}

function parsePrize(raw) {
    const t = String(raw || '').trim();
    const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(eter|éter|xp|\S+)?$/i);
    if (!m) return { type: 'eter', amount: 0, label: t || '—' };
    const amount = Math.floor(Number(String(m[1]).replace(',', '.')) || 0);
    const unit = String(m[2] || 'eter').toLowerCase();
    if (unit === 'xp') return { type: 'xp', amount, label: amount.toLocaleString('pt-BR') + ' XP' };
    return { type: 'eter', amount, label: amount.toLocaleString('pt-BR') + ' Éter' };
}

function parseReqFlags(text) {
    const t = String(text || '');
    const out = { minLevel: 0, roles: [], accountAgeDays: 0 };
    if (/(?:nivel|nível|level|xp)[:\s]+max\b/i.test(t)) out.minLevel = 500;
    else {
        const ml = t.match(/(?:nivel|nível|level|xp)[:\s]+(\d+)/i);
        if (ml) out.minLevel = Number(ml[1]) || 0;
    }
    const age = t.match(/(?:conta|account)[:\s]+(\d+)/i);
    if (age) out.accountAgeDays = Number(age[1]) || 0;
    const roleMatches = [...t.matchAll(/<@&(\d{16,20})>/g)];
    out.roles = roleMatches.map((x) => x[1]);
    return out;
}

function createDrop(drop) {
    const data = all();
    data[drop.id] = drop;
    save(data);
    return drop;
}

function getDrop(id) {
    return all()[id] || null;
}

function findByRerollId(rid) {
    const data = all();
    for (const d of Object.values(data)) {
        if (d.rerollId === rid || d.messageId === rid) return d;
    }
    return null;
}

function findByMessageId(mid) {
    const data = all();
    for (const d of Object.values(data)) {
        if (d.messageId === mid) return d;
    }
    return null;
}

function updateDrop(id, patch) {
    const data = all();
    if (!data[id]) return null;
    Object.assign(data[id], patch);
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

function cleanupOld() {
    const data = all();
    const now = Date.now();
    let n = 0;
    for (const [id, d] of Object.entries(data)) {
        if (d.ended && d.endedAt && now - d.endedAt > 7 * 24 * 60 * 60 * 1000) {
            delete data[id];
            n++;
        }
    }
    if (n) save(data);
    return n;
}

function payPrize(userId, prize) {
    if (!prize || !prize.amount) return false;
    if (prize.type === 'xp') {
        xp.addXp(userId, prize.amount);
        return true;
    }
    eter.add(userId, prize.amount, { reason: 'drop prize' });
    return true;
}

function getRequirements(drop) {
    return drop.requirements || { minLevel: 0, roles: [], accountAgeDays: 0 };
}

function checkRequirements(member, drop) {
    const req = getRequirements(drop);
    const fails = [];
    const level = xp.get(member.id).level || 0;
    if (level < (req.minLevel || 0)) fails.push(`nível XP: ${level}/${req.minLevel}`);
    if (req.roles?.length) {
        const has = req.roles.some((rid) => member.roles.cache.has(rid));
        if (!has) fails.push('cargo exigido');
    }
    if (req.accountAgeDays > 0) {
        const age = (Date.now() - member.user.createdTimestamp) / (24 * 60 * 60 * 1000);
        if (age < req.accountAgeDays) fails.push(`conta com ${Math.floor(age)}d / ${req.accountAgeDays}d`);
    }
    return { ok: !fails.length, fails };
}

function calcExtraEntries(member, drop) {
    let total = 1;
    const details = [];
    const rules = drop.extraRules || [];
    for (const rule of rules) {
        const type = rule.type;
        if (type === 'role' && member.roles.cache.has(rule.value)) {
            total += Number(rule.entries || 1);
            details.push(`cargo +${rule.entries || 1}`);
        } else if (type === 'level') {
            const level = xp.get(member.id).level || 0;
            if (level >= Number(rule.value || 0)) {
                total += Number(rule.entries || 1);
                details.push(`nível +${rule.entries || 1}`);
            }
        }
    }
    return { total: Math.max(1, total), details };
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

function leaveDrop(dropId, userId) {
    const data = all();
    const drop = data[dropId];
    if (!drop || drop.ended) return null;
    if (!drop.participants?.[userId]) return false;
    delete drop.participants[userId];
    save(data);
    return drop;
}

function participantCount(drop) {
    return Object.keys(drop?.participants || {}).length;
}

function totalTickets(drop) {
    return Object.values(drop?.participants || {}).reduce((a, p) => a + (p.entries || 1), 0);
}

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
    leaveDrop,
    participantCount,
    totalTickets,
    pickWinners,
    getRequirements,
    all,
    save
};
