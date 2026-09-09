/**
 * Cargos temporários por servidor
 * Store: temp_roles.json
 */
const store = require('./store');

const KEY = 'temp_roles.json';

const DEFAULT_AVISO =
    'Olá {user}! Seu cargo **{cargo}** em **{servidor}** acaba em breve ({tempo_restante}).';
const DEFAULT_EXPIRADO =
    'Seu cargo temporário **{cargo}** em **{servidor}** acabou e foi removido.';

function all() {
    return store.load(KEY, {});
}

function save(data) {
    store.save(KEY, data);
}

function guildData(guildId) {
    const data = all();
    if (!data[guildId]) {
        data[guildId] = {
            entries: {},
            messages: { aviso: DEFAULT_AVISO, expirado: DEFAULT_EXPIRADO }
        };
    }
    if (!data[guildId].entries) data[guildId].entries = {};
    if (!data[guildId].messages) {
        data[guildId].messages = { aviso: DEFAULT_AVISO, expirado: DEFAULT_EXPIRADO };
    }
    return data;
}

function entryKey(userId, roleId) {
    return `${userId}_${roleId}`;
}

function parseDuration(raw) {
    const s = String(raw || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return null;
    const m = s.match(/^(\d+)(s|sec|segs?|m|min|mins?|h|hr|hrs|d|dia|dias|w|sem|semana)?$/i);
    if (!m) return null;
    const n = Number(m[1]);
    if (!n || n < 1) return null;
    const u = (m[2] || 'm').toLowerCase();
    let ms = n * 60 * 1000;
    if (u.startsWith('s')) ms = n * 1000;
    else if (u.startsWith('m')) ms = n * 60 * 1000;
    else if (u.startsWith('h')) ms = n * 60 * 60 * 1000;
    else if (u.startsWith('d') || u.includes('dia')) ms = n * 24 * 60 * 60 * 1000;
    else if (u.startsWith('w') || u.includes('sem')) ms = n * 7 * 24 * 60 * 60 * 1000;
    if (ms < 60 * 1000) ms = 60 * 1000;
    if (ms > 90 * 24 * 60 * 60 * 1000) ms = 90 * 24 * 60 * 60 * 1000;
    return ms;
}

function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h}h${m % 60 ? ` ${m % 60}min` : ''}`;
    const d = Math.floor(h / 24);
    return `${d} dia${d > 1 ? 's' : ''}${h % 24 ? ` ${h % 24}h` : ''}`;
}

function setTempRole(guildId, { userId, roleId, durationMs, notify, by, reason }) {
    const data = guildData(guildId);
    const now = Date.now();
    const endsAt = now + durationMs;
    let notifyAt = null;
    if (notify) {
        const before = Math.min(
            60 * 60 * 1000,
            Math.max(2 * 60 * 1000, Math.floor(durationMs * 0.1))
        );
        notifyAt = endsAt - before;
        if (notifyAt <= now) notifyAt = null;
    }
    const key = entryKey(userId, roleId);
    data[guildId].entries[key] = {
        userId,
        roleId,
        guildId,
        endsAt,
        notifyAt,
        notified: false,
        by: by || null,
        reason: reason || null,
        createdAt: now
    };
    save(data);
    return data[guildId].entries[key];
}

function clearTempRole(guildId, userId, roleId) {
    const data = guildData(guildId);
    const key = entryKey(userId, roleId);
    delete data[guildId].entries[key];
    save(data);
}

function getMessages(guildId) {
    const data = guildData(guildId);
    return {
        aviso: data[guildId].messages.aviso || DEFAULT_AVISO,
        expirado: data[guildId].messages.expirado || DEFAULT_EXPIRADO
    };
}

function setMessage(guildId, tipo, text) {
    const data = guildData(guildId);
    if (tipo === 'aviso' || tipo === 'expirado') {
        data[guildId].messages[tipo] = String(text || '').slice(0, 1500);
        save(data);
        return data[guildId].messages[tipo];
    }
    throw new Error('Tipo inválido. Use aviso ou expirado.');
}

function fillTemplate(tpl, vars) {
    let out = String(tpl || '');
    for (const [k, v] of Object.entries(vars)) {
        out = out.split(`{${k}}`).join(String(v ?? ''));
    }
    return out.slice(0, 2000);
}

function listDue() {
    const data = all();
    const now = Date.now();
    const notify = [];
    const expire = [];
    for (const [gid, g] of Object.entries(data)) {
        if (!g?.entries) continue;
        for (const [key, e] of Object.entries(g.entries)) {
            if (!e) continue;
            if (e.endsAt <= now) expire.push({ ...e, key, guildId: gid });
            else if (e.notifyAt && !e.notified && e.notifyAt <= now) {
                notify.push({ ...e, key, guildId: gid });
            }
        }
    }
    return { notify, expire };
}

function markNotified(guildId, key) {
    const data = all();
    if (data[guildId]?.entries?.[key]) {
        data[guildId].entries[key].notified = true;
        save(data);
    }
}

function removeEntry(guildId, key) {
    const data = all();
    if (data[guildId]?.entries?.[key]) {
        delete data[guildId].entries[key];
        save(data);
    }
}

module.exports = {
    parseDuration,
    formatDuration,
    setTempRole,
    clearTempRole,
    getMessages,
    setMessage,
    fillTemplate,
    listDue,
    markNotified,
    removeEntry,
    DEFAULT_AVISO,
    DEFAULT_EXPIRADO
};
