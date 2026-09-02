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
    const { xp, level, attrs } = get(userId);
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
        attrs
    };
}

function dailyMultiplier(level) {
    return 1 + Math.min(2, Number(level || 0) * 0.04);
}

function rollAttrGain(double = false) {
    const key = ATTR_KEYS[Math.floor(Math.random() * ATTR_KEYS.length)];
    let amount = 1 + Math.floor(Math.random() * 3);
    if (double) amount *= 2;
    return { key, amount, label: ATTR_LABEL[key] };
}

function addXp(userId, amount) {
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrs: { ...BASE_ATTR } };
    ensureAttrs(cur);

    const before = levelFromXp(cur.xp);
    cur.xp = Math.max(0, Number(cur.xp || 0) + Number(amount || 0));
    const after = levelFromXp(cur.xp);
    cur.level = after;

    const gains = [];
    const items = [];

    if (after > before) {
        let playerUtil = null;
        try {
            playerUtil = require('./player');
        } catch (_) {}

        const levelsGained = after - before;
        for (let i = 0; i < levelsGained; i++) {
            // dobro de atributos por nível (2 rolls)
            for (let r = 0; r < 2; r++) {
                const g = rollAttrGain(false);
                cur.attrs[g.key] = (cur.attrs[g.key] || 0) + g.amount;
                gains.push(g);
            }

            // 5% item de classe
            if (playerUtil && Math.random() < 0.05) {
                const profile = playerUtil.get(userId);
                const classId = profile?.classId || 'guerreiro';
                const item = playerUtil.rollClassItem(classId);
                playerUtil.addItem(userId, item);
                items.push(item);
            }
        }
    }

    data[userId] = cur;
    store.save('xp.json', data);

    return {
        xp: cur.xp,
        level: cur.level,
        attrs: { ...cur.attrs },
        leveled: after > before,
        reward: 0,
        attrGains: gains,
        items,
        oldLevel: before,
        progress: progress(userId)
    };
}

function getAttrs(userId) {
    return get(userId).attrs;
}

function maxHp(userId) {
    const a = getAttrs(userId);
    return 50 + a.vida * 8;
}

function maxMana(userId) {
    try {
        const player = require('./player');
        const profile = player.get(userId);
        const level = get(userId).level;
        return player.maxManaFromLevel(level, profile?.classId || 'guerreiro');
    } catch {
        const level = get(userId).level;
        return 20 + level * 4;
    }
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
    all,
    getAttrs,
    maxHp,
    maxMana,
    ATTR_KEYS,
    ATTR_LABEL,
    BASE_ATTR
};
