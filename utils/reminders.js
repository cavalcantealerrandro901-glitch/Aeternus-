const store = require('./store');
const crypto = require('crypto');

const KEY = 'reminders.json';

function load() {
    return store.load(KEY, { list: [] });
}

function save(data) {
    store.save(KEY, data);
}

function newId() {
    return crypto.randomBytes(4).toString('hex');
}

/**
 * Parse tempo relativo ou absoluto.
 * Exemplos: 30m, 2h, 1d, 1w, 15:30, 2026-09-11 15:30
 */
function parseWhen(input, now = Date.now()) {
    const s = String(input || '').trim().toLowerCase();
    if (!s) return null;

    const rel = s.match(/^(\d+)\s*(s|sec|segs?|m|min|mins?|h|hr|hrs?|d|dias?|w|semanas?)$/i);
    if (rel) {
        const n = Number(rel[1]);
        const u = rel[2].toLowerCase();
        let ms = 0;
        if (/^s|sec|seg/.test(u)) ms = n * 1000;
        else if (/^m|min/.test(u)) ms = n * 60 * 1000;
        else if (/^h|hr/.test(u)) ms = n * 3600 * 1000;
        else if (/^d|dia/.test(u)) ms = n * 86400 * 1000;
        else if (/^w|semana/.test(u)) ms = n * 7 * 86400 * 1000;
        if (ms > 0 && ms <= 366 * 86400 * 1000) return now + ms;
        return null;
    }

    const hm = s.match(/^(\d{1,2}):(\d{2})$/);
    if (hm) {
        const h = Number(hm[1]);
        const m = Number(hm[2]);
        if (h > 23 || m > 59) return null;
        const d = new Date(now);
        d.setSeconds(0, 0);
        d.setHours(h, m, 0, 0);
        let ts = d.getTime();
        if (ts <= now) ts += 86400 * 1000;
        return ts;
    }

    const full = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{1,2}):(\d{2}))?$/);
    if (full) {
        const y = Number(full[1]);
        const mo = Number(full[2]) - 1;
        const day = Number(full[3]);
        const h = full[4] != null ? Number(full[4]) : 12;
        const m = full[5] != null ? Number(full[5]) : 0;
        const d = new Date(y, mo, day, h, m, 0, 0);
        const ts = d.getTime();
        if (!Number.isFinite(ts) || ts <= now) return null;
        return ts;
    }

    return null;
}

function add({ guildId, channelId, userId, text, at }) {
    const data = load();
    if (!Array.isArray(data.list)) data.list = [];
    const rec = {
        id: newId(),
        guildId: String(guildId),
        channelId: String(channelId),
        userId: String(userId),
        text: String(text).trim().slice(0, 500),
        at: Number(at),
        createdAt: Date.now(),
        sent: false
    };
    data.list.push(rec);
    save(data);
    return rec;
}

function listUser(userId, guildId) {
    const data = load();
    return (data.list || [])
        .filter(
            (r) =>
                !r.sent &&
                String(r.userId) === String(userId) &&
                (!guildId || String(r.guildId) === String(guildId))
        )
        .sort((a, b) => a.at - b.at);
}

function cancel(id, userId) {
    const data = load();
    const idx = (data.list || []).findIndex(
        (r) => String(r.id) === String(id) && String(r.userId) === String(userId) && !r.sent
    );
    if (idx < 0) return null;
    const [rec] = data.list.splice(idx, 1);
    save(data);
    return rec;
}

function due(now = Date.now()) {
    const data = load();
    return (data.list || []).filter((r) => !r.sent && Number(r.at) <= now);
}

function markSent(id) {
    const data = load();
    const r = (data.list || []).find((x) => String(x.id) === String(id));
    if (!r) return;
    r.sent = true;
    data.list = data.list.filter((x) => !x.sent || Date.now() - Number(x.at) < 7 * 864e5);
    save(data);
}

module.exports = {
    parseWhen,
    add,
    listUser,
    cancel,
    due,
    markSent
};
