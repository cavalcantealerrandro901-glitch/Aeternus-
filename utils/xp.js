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
        level += 1;
        if (level > 9999) break;
    }
    return level;
}

function progress(userId) {
    const { xp, level, attrs, attrPoints } = get(userId);
    let remain = xp;
    for (let i = 0; i < level; i++) remain -= xpForLevel(i);
    const need = xpForLevel(level);
    return {
        xp,
        level,
        intoLevel: Math.max(0, remain),
        need,
        attrs,
        attrPoints
    };
}

function pointsForLevel(level) {
    const lv = Math.max(0, Math.floor(Number(level) || 0));
    if (lv <= 0) return 0;
    if (lv <= 10) return 1;
    if (lv <= 50) return 2;
    if (lv <= 100) return 3;
    return 4;
}

function dailyMultiplier() {
    return 1;
}

function addXp(userId, amount) {
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrPoints: 0, attrs: { ...BASE_ATTR } };
    ensureAttrs(cur);
    const before = Number(cur.level || levelFromXp(cur.xp || 0));
    cur.xp = Math.max(0, Number(cur.xp || 0) + Math.max(0, Number(amount) || 0));
    cur.level = levelFromXp(cur.xp);
    cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0)));
    let gained = 0;
    if (cur.level > before) {
        for (let lv = before + 1; lv <= cur.level; lv++) {
            const pts = pointsForLevel(lv);
            cur.attrPoints += pts;
            gained += pts;
        }
    }
    data[userId] = cur;
    store.save('xp.json', data);
    return {
        leveled: cur.level > before,
        from: before,
        to: cur.level,
        attrPointsGained: gained,
        ...get(userId)
    };
}

function addAttrPoints(userId, n) {
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrPoints: 0, attrs: { ...BASE_ATTR } };
    ensureAttrs(cur);
    cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0))) + Math.max(0, Math.floor(Number(n) || 0));
    data[userId] = cur;
    store.save('xp.json', data);
    return get(userId);
}

function spendAttrPoint(userId, attrKey) {
    if (!ATTR_KEYS.includes(attrKey)) {
        return { ok: false, error: 'Atributo inválido.' };
    }
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrPoints: 0, attrs: { ...BASE_ATTR } };
    ensureAttrs(cur);
    const pts = Math.max(0, Math.floor(Number(cur.attrPoints || 0)));
    if (pts <= 0) {
        return { ok: false, error: 'Você não tem pontos de atributo disponíveis.' };
    }
    cur.attrPoints = pts - 1;
    cur.attrs[attrKey] = Math.max(0, Math.floor(Number(cur.attrs[attrKey] || 0))) + 1;
    data[userId] = cur;
    store.save('xp.json', data);
    return { ok: true, data: get(userId) };
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

function rollAttrGain() {
    const k = ATTR_KEYS[Math.floor(Math.random() * ATTR_KEYS.length)];
    return { key: k, label: ATTR_LABEL[k] || k, amount: 1 };
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
