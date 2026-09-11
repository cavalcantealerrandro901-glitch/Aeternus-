const store = require('./store');

const PLANOS = ['VIP', 'VIP+', 'VIP++', 'MVP', 'Booster', 'Premium'];

const TIPOS = [
    { name: 'Compra', value: 'compra' }
];

function loadAll() {
    return store.load('vips.json', {});
}

function saveAll(all) {
    store.save('vips.json', all);
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

/** Lista registros ativos (não expirados), mais recentes primeiro. */
function listActive(guildId) {
    const { map } = guildMap(guildId);
    const now = Date.now();
    return Object.entries(map)
        .filter(([, v]) => !v.expiresAt || Number(v.expiresAt) === 0 || Number(v.expiresAt) > now)
        .map(([userId, v]) => ({ userId, ...v }))
        .sort((a, b) => Number(b.registeredAt || 0) - Number(a.registeredAt || 0));
}

/** Todos os registros (ativos + expirados), mais recentes primeiro. */
function listAll(guildId) {
    const { map } = guildMap(guildId);
    return Object.entries(map)
        .map(([userId, v]) => {
            const expired =
                v.expiresAt && Number(v.expiresAt) > 0 && Date.now() > Number(v.expiresAt);
            return { userId, ...v, expired: !!expired };
        })
        .sort((a, b) => Number(b.registeredAt || 0) - Number(a.registeredAt || 0));
}

function register({
    guildId,
    userId,
    vipName,
    registeredBy,
    days,
    note,
    roleId,
    roleName,
    type
}) {
    const { all, map } = guildMap(guildId);
    const now = Date.now();
    const d = days == null || Number(days) <= 0 ? null : Number(days);
    const expiresAt = d ? now + d * 24 * 60 * 60 * 1000 : null;
    const name = String(vipName || roleName || 'VIP').trim().slice(0, 40);
    map[userId] = {
        type: String(type || 'compra'),
        vip: name,
        tier: name,
        roleId: roleId ? String(roleId) : null,
        roleName: roleName ? String(roleName).slice(0, 80) : name,
        registeredBy: String(registeredBy),
        registeredAt: now,
        expiresAt,
        note: note ? String(note).slice(0, 120) : ''
    };
    saveAll(all);
    return { userId, ...map[userId] };
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
    return rec.vip || rec.tier || rec.roleName || 'VIP';
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
    TIPOS,
    get,
    listActive,
    listAll,
    register,
    remove,
    vipLabel,
    timeHeld,
    timeLeft,
    formatDuration
};
