const store = require('./store');
const { getSettings, setSettings } = require('./settings');

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 horas

function loadState() {
    return store.load('boom_state.json', {});
}

function saveState(data) {
    store.save('boom_state.json', data);
}

function getGuildState(guildId) {
    const all = loadState();
    const cur = all[guildId] || {};
    return {
        lastUsedAt: Number(cur.lastUsedAt || 0),
        readyNotified: !!cur.readyNotified,
        lastInviteUrl: cur.lastInviteUrl || null,
        lastUsedBy: cur.lastUsedBy || null
    };
}

function setGuildState(guildId, patch) {
    const all = loadState();
    all[guildId] = { ...getGuildState(guildId), ...patch };
    saveState(all);
    return all[guildId];
}

function getConfig(guildId) {
    const s = getSettings(guildId);
    const b = s.boom || {};
    return {
        enabled: b.enabled !== false,
        channelId: b.channelId || null,
        notifyRoleId: b.notifyRoleId || null,
        staffRoleId: b.staffRoleId || null,
        message:
            b.message ||
            '🚀 **Boom de convites!**\nEntre no servidor: {invite}\nChamado por: {user}',
        cooldownMs: Number(b.cooldownMs) > 0 ? Number(b.cooldownMs) : COOLDOWN_MS
    };
}

function setConfig(guildId, patch) {
    return setSettings(guildId, { boom: patch });
}

function remainingMs(guildId) {
    const cfg = getConfig(guildId);
    const st = getGuildState(guildId);
    if (!st.lastUsedAt) return 0;
    const left = st.lastUsedAt + cfg.cooldownMs - Date.now();
    return Math.max(0, left);
}

function isReady(guildId) {
    return remainingMs(guildId) <= 0;
}

function formatDuration(ms) {
    const s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + 'h ' + m + 'min';
    if (m > 0) return m + 'min ' + sec + 's';
    return sec + 's';
}

function markUsed(guildId, { userId, inviteUrl }) {
    return setGuildState(guildId, {
        lastUsedAt: Date.now(),
        readyNotified: false,
        lastInviteUrl: inviteUrl || null,
        lastUsedBy: userId || null
    });
}

function listReadyToNotify() {
    const all = loadState();
    const out = [];
    for (const [guildId, st] of Object.entries(all || {})) {
        if (!st || !st.lastUsedAt) continue;
        if (st.readyNotified) continue;
        if (remainingMs(guildId) > 0) continue;
        out.push(guildId);
    }
    return out;
}

function markReadyNotified(guildId) {
    return setGuildState(guildId, { readyNotified: true });
}

module.exports = {
    COOLDOWN_MS,
    getConfig,
    setConfig,
    getGuildState,
    setGuildState,
    remainingMs,
    isReady,
    formatDuration,
    markUsed,
    listReadyToNotify,
    markReadyNotified
};
