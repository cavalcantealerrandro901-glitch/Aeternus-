const store = require('./store');
const flocos = require('./flocos');
function all() { return store.load('xp.json', {}); }
function get(userId) {
    const d = all()[userId] || { xp: 0, level: 0 };
    return { xp: Number(d.xp || 0), level: Number(d.level || 0) };
}
function xpForLevel(level) { return 100 + level * 85; }
function levelFromXp(xp) {
    let level = 0, remain = Number(xp || 0);
    while (remain >= xpForLevel(level)) {
        remain -= xpForLevel(level);
        level++;
        if (level > 500) break;
    }
    return level;
}
function dailyMultiplier(level) { return 1 + Math.min(2, Number(level || 0) * 0.04); }
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
        reward = 300 + Math.floor(Math.random() * 4700);
        flocos.add(userId, reward);
    }
    return { ...cur, leveled: after > before, reward, oldLevel: before };
}
module.exports = { get, addXp, levelFromXp, xpForLevel, dailyMultiplier, all };
