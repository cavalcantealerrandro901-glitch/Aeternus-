const store = require('./store');

const ATTR_KEYS = [
    'forca',
    'agilidade',
    'constituicao',
    'inteligencia',
    'espirito',
    'sorte'
];

const ATTR_LABEL = {
    forca: 'Força',
    agilidade: 'Agilidade',
    constituicao: 'Constituição',
    inteligencia: 'Inteligência',
    espirito: 'Espírito',
    sorte: 'Sorte',
    defesa: 'Defesa',
    vida: 'Vida'
};

const BASE_ATTR = {
    forca: 10,
    agilidade: 10,
    constituicao: 10,
    inteligencia: 10,
    espirito: 10,
    sorte: 10
};

function all() {
    return store.load('xp.json', {});
}

function migrateAttrs(raw) {
    const a = raw && typeof raw === 'object' ? { ...raw } : {};
    if (a.constituicao == null) {
        const fromVida = Number(a.vida);
        const fromDef = Number(a.defesa);
        if (Number.isFinite(fromVida) || Number.isFinite(fromDef)) {
            a.constituicao = Math.max(
                BASE_ATTR.constituicao,
                Math.floor(Math.max(fromVida || 0, fromDef || 0))
            );
        }
    }
    return a;
}

function ensureAttrs(d) {
    const a = migrateAttrs(d.attrs);
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
    cur.attrPoints =
        Math.max(0, Math.floor(Number(cur.attrPoints || 0))) +
        Math.max(0, Math.floor(Number(n) || 0));
    data[userId] = cur;
    store.save('xp.json', data);
    return get(userId);
}

function spendAttrPoint(userId, attrKey) {
    return spendAttrPoints(userId, attrKey, 1);
}

/** Gasta `amount` pontos (ou todos se amount >= pts) em um único atributo. */
function spendAttrPoints(userId, attrKey, amount) {
    let key = attrKey;
    if (key === 'defesa' || key === 'vida') key = 'constituicao';
    if (!ATTR_KEYS.includes(key)) {
        return { ok: false, error: 'Atributo inválido.' };
    }
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrPoints: 0, attrs: { ...BASE_ATTR } };
    ensureAttrs(cur);
    const pts = Math.max(0, Math.floor(Number(cur.attrPoints || 0)));
    if (pts <= 0) {
        return { ok: false, error: 'Você não tem pontos de atributo disponíveis.' };
    }
    let n = Math.floor(Number(amount) || 0);
    if (n <= 0) n = 1;
    if (n > pts) n = pts;
    cur.attrPoints = pts - n;
    cur.attrs[key] = Math.max(0, Math.floor(Number(cur.attrs[key] || 0))) + n;
    data[userId] = cur;
    store.save('xp.json', data);
    return { ok: true, spent: n, key, data: get(userId) };
}

function redistribuirAttrs(userId) {
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrPoints: 0, attrs: { ...BASE_ATTR } };
    ensureAttrs(cur);
    let refund = 0;
    for (const k of ATTR_KEYS) {
        const base = BASE_ATTR[k];
        const v = Math.max(0, Math.floor(Number(cur.attrs[k] || base)));
        if (v > base) {
            refund += v - base;
            cur.attrs[k] = base;
        } else {
            cur.attrs[k] = base;
        }
    }
    cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0))) + refund;
    data[userId] = cur;
    store.save('xp.json', data);
    return { ok: true, refund, data: get(userId) };
}

function getAttrs(userId) {
    const a = get(userId).attrs;
    return {
        ...a,
        defesa: a.constituicao,
        vida: a.constituicao
    };
}

function maxHp(userId) {
    const a = getAttrs(userId);
    const con = a.constituicao || a.vida || 10;
    return 50 + con * 40 + Math.floor((a.forca || 0) * 2);
}

function maxMana(userId) {
    const a = getAttrs(userId);
    return (
        40 +
        Math.floor((a.inteligencia || 10) * 12) +
        Math.floor((a.espirito || 10) * 10) +
        Math.floor((a.agilidade || 10) * 2)
    );
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
    spendAttrPoints,
    redistribuirAttrs,
    addAttrPoints,
    pointsForLevel,
    maxHp,
    maxMana,
    leaderboard,
    rankOf,
    rollAttrGain,
    BASE_ATTR
};
