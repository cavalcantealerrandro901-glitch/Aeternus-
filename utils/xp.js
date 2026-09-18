const store = require('./store');

const ATTR_KEYS = ['forca', 'defesa', 'agilidade', 'vida'];
const ATTR_LABEL = {
    forca: 'Força',
    defesa: 'Defesa',
    agilidade: 'Agilidade',
    vida: 'Vida'
};

const BASE_ATTR = {
    forca: 5,
    defesa: 5,
    agilidade: 5,
    vida: 10
};

function all() {
    return store.load('xp.json', {});
}

function ensureAttrs(d) {
    const a = d.attrs && typeof d.attrs === 'object' ? { ...d.attrs } : {};
    for (const k of ATTR_KEYS) {
        a[k] = Math.max(0, Math.floor(Number(a[k] ?? BASE_ATTR[k]) || BASE_ATTR[k]));
    }
    d.attrs = a;
    return a;
}

function get(userId) {
    const raw = all()[userId] || { xp: 0, level: 0 };
    return {
        xp: Number(raw.xp || 0),
        level: Number(raw.level || 0),
        attrPoints: Math.max(0, Math.floor(Number(raw.attrPoints || 0))),
        attrs: ensureAttrs({ attrs: raw.attrs })
    };
}

function xpForLevel(level) {
    const lv = Math.max(0, Number(level) || 0);
    return Math.floor(100 + lv * 85 + Math.pow(lv, 1.15) * 2);
}

function levelFromXp(totalXp) {
    let level = 0;
    let remain = Number(totalXp || 0);
    while (remain >= xpForLevel(level)) {
        remain -= xpForLevel(level);
        level++;
        if (level > 10000) break;
    }
    return level;
}

function progress(userId) {
    const { xp, level, attrs, attrPoints } = get(userId);
    let remain = Number(xp || 0);
    for (let lv = 0; lv < level; lv++) remain -= xpForLevel(lv);
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
        mult: dailyMultiplier(level),
        attrs,
        attrPoints
    };
}

function dailyMultiplier(level) {
    return 1 + Math.min(2, Number(level || 0) * 0.04);
}

function pointsForLevel(level) {
    return 1 + (Number(level || 0) % 5 === 0 ? 1 : 0);
}

function rollAttrGain(double = false) {
    const n = double ? 2 : 1;
    const key = ATTR_KEYS[Math.floor(Math.random() * ATTR_KEYS.length)];
    return { key, amount: n };
}

function addXp(userId, amount) {
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrPoints: 0, attrs: { ...BASE_ATTR } };
    cur.xp = Number(cur.xp || 0) + Math.max(0, Number(amount) || 0);
    const oldLevel = Number(cur.level || 0);
    const newLevel = levelFromXp(cur.xp);
    cur.level = newLevel;
    cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0)));
    ensureAttrs(cur);

    const leveled = [];
    for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
        const pts = pointsForLevel(lv);
        cur.attrPoints += pts;
        leveled.push({ level: lv, points: pts });
    }

    data[userId] = cur;
    store.save('xp.json', data);
    return { ...get(userId), leveled };
}

function addAttrPoints(userId, amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (!n) return get(userId);
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrPoints: 0, attrs: { ...BASE_ATTR } };
    cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0))) + n;
    ensureAttrs(cur);
    data[userId] = cur;
    store.save('xp.json', data);
    return get(userId);
}

function spendAttrPoint(userId, attrKey) {
    if (!ATTR_KEYS.includes(attrKey)) return null;
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrPoints: 0, attrs: { ...BASE_ATTR } };
    ensureAttrs(cur);
    const pts = Math.max(0, Math.floor(Number(cur.attrPoints || 0)));
    if (pts <= 0) return null;
    cur.attrPoints = pts - 1;
    cur.attrs[attrKey] = Math.max(0, Math.floor(Number(cur.attrs[attrKey] || 0))) + 1;
    data[userId] = cur;
    store.save('xp.json', data);
    return get(userId);
}

function getAttrs(userId) {
    return get(userId).attrs;
}

function maxHp(userId) {
    const a = getAttrs(userId);
    return 50 + (a.vida || 10) * 8;
}

function maxMana(userId) {
    const a = getAttrs(userId);
    return 40 + Math.floor((a.agilidade || 5) * 1.5) + Math.floor((a.forca || 5) * 0.5);
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
        .map(([id, v]) => ({
            userId: id,
            xp: Number(v.xp || 0),
            level: Number(v.level || levelFromXp(v.xp || 0))
        }))
        .sort((a, b) => b.xp - a.xp || b.level - a.level);
    const idx = list.findIndex((r) => String(r.userId) === String(userId));
    return {
        rank: idx >= 0 ? idx + 1 : list.length + 1,
        total: list.length,
        entry: idx >= 0 ? list[idx] : null
    };
}

module.exports = {
    ATTR_KEYS,
    ATTR_LABEL,
    all,
    get,
    getAttrs,
    xpForLevel,
    levelFromXp,
    progress,
    dailyMultiplier,
    addXp,
    spendAttrPoint,
    addAttrPoints,
    pointsForLevel,
    maxHp,
    maxMana,
    leaderboard,
    rankOf,
    rollAttrGain,
    BASE_ATTR
};
