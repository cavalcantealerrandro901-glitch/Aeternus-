const store = require('./store');

/** Planos padrão (podem ser usados livres também) */
const PLANOS = ['VIP', 'VIP+', 'VIP Gold', 'VIP Platinum', 'MVP', 'Booster'];

function loadAll() {
    return store.load('vips.json', {});
}

function saveAll(data) {
    store.save('vips.json', data);
}

function guildMap(guildId) {
    const all = loadAll();
    if (!all[guildId]) all[guildId] = {};
    return { all, map: all[guildId] };
}

function get(guildId, userId) {
    const { map } = guildMap(guildId);
    const v = map[userId];
    if (!v) return null;
    if (v.expiresAt && Number(v.expiresAt) > 0 && Date.now() > Number(v.expiresAt)) {
        return { ...v, expired: true };
    }
    return { ...v, expired: false };
}

function listActive(guildId) {
    const { map } = guildMap(guildId);
    const now = Date.now();
    return Object.entries(map)
        .filter(([, v]) => !v.expiresAt || Number(v.expiresAt) === 0 || Number(v.expiresAt) > now)
        .map(([userId, v]) => ({ userId, ...v }))
        .sort((a, b) => Number(b.registeredAt || 0) - Number(a.registeredAt || 0));
}

function register({ guildId, userId, vipName, registeredBy, days, note }) {
    const { all, map } = guildMap(guildId);
    const now = Date.now();
    const d = days == null || Number(days) <= 0 ? null : Number(days);
    const expiresAt = d ? now + d * 24 * 60 * 60 * 1000 : null;
    const name = String(vipName || 'VIP').trim().slice(0, 40);
    map[userId] = {
        vip: name,
        tier: name,
        registeredBy: String(registeredBy),
        registeredAt: now,
        expiresAt,
        note: note ? String(note).slice(0, 120) : ''
    };
    saveAll(all);
    return map[userId];
}

function remove(guildId, userId) {
    const { all, map } = guildMap(guildId);
    if (!map[userId]) return false;
    delete map[userId];
    saveAll(all);
    return true;
}

function vipLabel(rec) {
    if (!rec) return null;
    return rec.vip || rec.tier || 'VIP';
}

function formatDuration(ms) {
    if (ms == null || ms <= 0) return 'permanente';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    if (d > 0) return `${d} dia${d === 1 ? '' : 's'}${h > 0 ? ` e ${h}h` : ''}`;
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${Math.max(1, m)} min`;
}

function timeHeld(registeredAt) {
    if (!registeredAt) return '—';
    return formatDuration(Date.now() - Number(registeredAt));
}

function timeLeft(expiresAt) {
    if (!expiresAt) return 'permanente';
    const left = Number(expiresAt) - Date.now();
    if (left <= 0) return 'expirado';
    return formatDuration(left);
}

module.exports = {
    PLANOS,
    get,
    listActive,
    register,
    remove,
    vipLabel,
    timeHeld,
    timeLeft,
    formatDuration
};
