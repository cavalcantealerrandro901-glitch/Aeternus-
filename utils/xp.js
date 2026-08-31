const store = require('./store');
const flocos = require('./flocos');

function all() {
    return store.load('xp.json', {});
}

function get(userId) {
    const d = all()[userId] || { xp: 0, level: 0 };
    return { xp: Number(d.xp || 0), level: Number(d.level || 0) };
}

function xpForLevel(level) {
    return 100 + Number(level || 0) * 85;
}

function levelFromXp(totalXp) {
    let level = 0;
    let remain = Number(totalXp || 0);
    while (remain >= xpForLevel(level)) {
        remain -= xpForLevel(level);
        level++;
        if (level > 500) break;
    }
    return level;
}

/** XP dentro do nível atual e quanto falta pro próximo */
function progress(userId) {
    const { xp, level } = get(userId);
    let remain = Number(xp || 0);
    for (let lv = 0; lv < level; lv++) {
        remain -= xpForLevel(lv);
    }
    if (remain < 0) remain = 0;
    const need = xpForLevel(level);
    const pct = Math.min(100, Math.floor((remain / Math.max(1, need)) * 100));
    return {
        totalXp: xp,
        level,
        current: Math.floor(remain),
        need,
        pct,
        toNext: Math.max(0, need - Math.floor(remain)),
        mult: dailyMultiplier(level)
    };
}

/** Multiplicador do daily: +4% por nível, máximo ×3.00 */
function dailyMultiplier(level) {
    return 1 + Math.min(2, Number(level || 0) * 0.04);
}

function addXp(userId, amount) {
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0 };
    const before = levelFromXp(cur.xp);
    cur.xp = Math.max(0, Number(cur.xp || 0) + Number(amount || 0));
    const after = levelFromXp(cur.xp);
    cur.level = after;
    data[userId] = cur;
    store.save('xp.json', data);

    let reward = 0;
    if (after > before) {
        // 300–5000 flocos por nível (pode subir vários de uma vez)
        const levelsGained = after - before;
        for (let i = 0; i < levelsGained; i++) {
            reward += 300 + Math.floor(Math.random() * 4701);
        }
        flocos.add(userId, reward, { reason: `levelup:${before}->${after}` });
    }

    return {
        ...cur,
        leveled: after > before,
        reward,
        oldLevel: before,
        progress: progress(userId)
    };
}

function leaderboard(limit = 10) {
    const data = all();
    return Object.entries(data)
        .map(([id, v]) => ({
            userId: id,
            xp: Number(v.xp || 0),
            level: Number(v.level || levelFromXp(v.xp || 0))
        }))
        .sort((a, b) => b.xp - a.xp || b.level - a.level)
        .slice(0, Math.max(1, Math.min(25, limit)));
}

function rankOf(userId) {
    const data = all();
    const list = Object.entries(data)
        .map(([id, v]) => ({ userId: id, xp: Number(v.xp || 0) }))
        .sort((a, b) => b.xp - a.xp);
    const idx = list.findIndex((x) => x.userId === userId);
    if (idx < 0) return { rank: list.length + 1, total: list.length || 1 };
    return { rank: idx + 1, total: list.length };
}

module.exports = {
    get,
    addXp,
    levelFromXp,
    xpForLevel,
    dailyMultiplier,
    progress,
    leaderboard,
    rankOf,
    all
};
