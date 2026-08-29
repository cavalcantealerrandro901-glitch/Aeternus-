const store = require('./store');

function load() { return store.load('invites.json', {}); }
function save(d) { store.save('invites.json', d); }

function getStats(guildId, userId) {
    const g = load()[guildId] || {};
    const u = g[userId] || { total: 0, joined: [], left: 0 };
    const total = u.total || 0;
    const left = u.left || 0;
    return { total, left, active: Math.max(0, total - left), recent: (u.joined || []).slice(-10).reverse() };
}

function addInvite(guildId, inviterId, member, code) {
    const all = load();
    if (!all[guildId]) all[guildId] = {};
    if (!all[guildId][inviterId]) all[guildId][inviterId] = { total: 0, joined: [], left: 0 };
    const u = all[guildId][inviterId];
    u.total = (u.total || 0) + 1;
    u.joined = u.joined || [];
    u.joined.push({ userId: member.id, username: member.user?.username || '?', at: Date.now(), code: code || null });
    if (u.joined.length > 50) u.joined = u.joined.slice(-50);
    save(all);
    return u;
}

function markLeft(guildId, leftUserId) {
    const all = load();
    const g = all[guildId];
    if (!g) return null;
    for (const inviterId of Object.keys(g)) {
        const u = g[inviterId];
        const hit = (u.joined || []).find((j) => j.userId === leftUserId);
        if (hit) {
            u.left = (u.left || 0) + 1;
            hit.leftAt = Date.now();
            save(all);
            return { inviterId, data: u };
        }
    }
    return null;
}

function leaderboard(guildId, limit = 10) {
    const g = load()[guildId] || {};
    return Object.entries(g)
        .map(([userId, u]) => ({ userId, total: u.total || 0, left: u.left || 0, active: Math.max(0, (u.total || 0) - (u.left || 0)) }))
        .filter((x) => x.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
}

module.exports = { getStats, addInvite, markLeft, leaderboard };
