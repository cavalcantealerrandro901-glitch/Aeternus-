const store = require('./store');

const ATTR_KEYS = [
    'forca',
    'defesa',
    'agilidade',
    'vida',
    'inteligencia',
    'sorte',
    'precisao',
    'resistencia'
];
const ATTR_LABEL = {
    forca: 'Força',
    defesa: 'Defesa',
    agilidade: 'Agilidade',
    vida: 'Vida',
    inteligencia: 'Inteligência',
    sorte: 'Sorte',
    precisao: 'Precisão',
    resistencia: 'Resistência'
};

const BASE_ATTR = {
    forca: 5,
    defesa: 5,
    agilidade: 5,
    vida: 10,
    inteligencia: 5,
    sorte: 5,
    precisao: 5,
    resistencia: 5
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
    const attrs = ensureAttrs({ attrs: raw.attrs });
    return {
        xp: Math.max(0, Math.floor(Number(raw.xp) || 0)),
        level: Math.max(0, Math.floor(Number(raw.level) || 0)),
        attrs,
        attrPoints: Math.max(0, Math.floor(Number(raw.attrPoints) || 0))
    };
}

function progress(userId) {
    const cur = get(userId);
    const need = xpForLevel(cur.level + 1);
    return { ...cur, need, pct: need > 0 ? Math.min(100, Math.floor((cur.xp / need) * 100)) : 100 };
}

function levelFromXp(totalXp) {
    let xp = Math.max(0, Math.floor(Number(totalXp) || 0));
    let level = 0;
    while (xp >= xpForLevel(level + 1)) {
        xp -= xpForLevel(level + 1);
        level++;
        if (level > 500) break;
    }
    return { level, xp };
}

function totalXpForLevel(level) {
    let total = 0;
    for (let i = 1; i <= level; i++) total += xpForLevel(i);
    return total;
}

function xpForLevel(level) {
    const lv = Math.max(1, Math.floor(Number(level) || 1));
    return Math.floor(50 + lv * 25 + Math.pow(lv, 1.4) * 8);
}

function dailyMultiplier() {
    return 1;
}

function rollAttrGain() {
    // Cada ponto gasto concede entre 3 e 5 no atributo escolhido
    return 3 + Math.floor(Math.random() * 3);
}

function loadCur(userId) {
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrs: { ...BASE_ATTR }, attrPoints: 0 };
    ensureAttrs(cur);
    cur.xp = Math.max(0, Math.floor(Number(cur.xp) || 0));
    cur.level = Math.max(0, Math.floor(Number(cur.level) || 0));
    cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints) || 0));
    return { data, cur };
}

function saveCur(data, userId, cur) {
    data[userId] = cur;
    store.save('xp.json', data);
}

function addXp(userId, amount, meta) {
    const n = Math.floor(Number(amount) || 0);
    if (n === 0) return get(userId);
    const { data, cur } = loadCur(userId);
    const oldLevel = cur.level;
    cur.xp = Math.max(0, cur.xp + n);
    let leveled = 0;
    while (cur.xp >= xpForLevel(cur.level + 1)) {
        cur.xp -= xpForLevel(cur.level + 1);
        cur.level++;
        cur.attrPoints = (cur.attrPoints || 0) + 3;
        leveled++;
        if (cur.level > 500) break;
    }
    saveCur(data, userId, cur);
    return {
        ...get(userId),
        leveled,
        levelsGained: leveled,
        oldLevel,
        gained: n
    };
}

function setXp(userId, amount) {
    const { data, cur } = loadCur(userId);
    cur.xp = Math.max(0, Math.floor(Number(amount) || 0));
    saveCur(data, userId, cur);
    return get(userId);
}

function removeXp(userId, amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    const { data, cur } = loadCur(userId);
    cur.xp = Math.max(0, cur.xp - n);
    saveCur(data, userId, cur);
    return get(userId);
}

function getAttrs(userId) {
    return get(userId).attrs;
}

function maxHp(userId) {
    const st = get(userId);
    return 50 + st.level * 10 + (st.attrs.vida || 0) * 5;
}

function maxMana(userId) {
    const st = get(userId);
    return 20 + st.level * 4 + (st.attrs.inteligencia || 0) * 2;
}

function leaderboard(limit = 10) {
    const data = all();
    return Object.entries(data)
        .map(([id, v]) => ({ id, level: Number(v.level) || 0, xp: Number(v.xp) || 0 }))
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .slice(0, limit);
}

function rankOf(userId) {
    const board = leaderboard(10000);
    const idx = board.findIndex((x) => String(x.id) === String(userId));
    return idx >= 0 ? idx + 1 : null;
}

function spendAttrPoint(userId, attrKey) {
    return spendAttrPoints(userId, attrKey, 1);
}

function addAttrPoints(userId, amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 0) return { ok: false, error: 'Quantidade inválida.', added: 0 };
    const { data, cur } = loadCur(userId);
    cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0))) + n;
    saveCur(data, userId, cur);
    return { ok: true, added: n, attrPoints: cur.attrPoints };
}

function spendAttrPoints(userId, attrKey, amount) {
    const key = String(attrKey || '').toLowerCase();
    if (!ATTR_KEYS.includes(key)) return { ok: false, error: 'Atributo inválido.' };
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 0) return { ok: false, error: 'Quantidade inválida.' };
    const { data, cur } = loadCur(userId);
    const pts = Math.max(0, Math.floor(Number(cur.attrPoints || 0)));
    if (pts < n) return { ok: false, error: 'Pontos insuficientes.' };
    ensureAttrs(cur);
    let gained = 0;
    const rolls = [];
    for (let i = 0; i < n; i++) {
        const roll = rollAttrGain(); // 3–5 por ponto gasto
        rolls.push(roll);
        gained += roll;
    }
    cur.attrs[key] = (cur.attrs[key] || 0) + gained;
    cur.attrPoints = pts - n;
    saveCur(data, userId, cur);
    return { ok: true, gained, spent: n, rolls, attrs: cur.attrs, attrPoints: cur.attrPoints };
}

function redistribuirAttrs(userId) {
    const { data, cur } = loadCur(userId);
    ensureAttrs(cur);
    let refund = 0;
    for (const k of ATTR_KEYS) {
        const base = BASE_ATTR[k] || 0;
        const val = Number(cur.attrs[k] || 0);
        if (val > base) {
            refund += val - base;
            cur.attrs[k] = base;
        }
    }
    cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0))) + refund;
    saveCur(data, userId, cur);
    return { ok: true, refund, attrPoints: cur.attrPoints, attrs: cur.attrs };
}

function transferAttrPoints(fromId, toId, amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 0) return { ok: false, error: 'Quantidade inválida.' };
    const a = loadCur(fromId);
    if ((a.cur.attrPoints || 0) < n) return { ok: false, error: 'Pontos insuficientes.' };
    a.cur.attrPoints -= n;
    saveCur(a.data, fromId, a.cur);
    const b = loadCur(toId);
    b.cur.attrPoints = (b.cur.attrPoints || 0) + n;
    saveCur(b.data, toId, b.cur);
    return { ok: true, amount: n };
}

function scanInvalidAttrs(userId) {
    const cur = get(userId);
    const orphanKeys = Object.keys(cur.attrs || {}).filter((k) => !ATTR_KEYS.includes(k));
    let recoverable = 0;
    for (const k of orphanKeys) recoverable += Math.max(0, Math.floor(Number(cur.attrs[k]) || 0));
    return { hasInvalid: orphanKeys.length > 0, orphanKeys, recoverable };
}

function convertInvalidAttrs(userId) {
    const scan = scanInvalidAttrs(userId);
    if (!scan.hasInvalid) return { ok: false, error: 'Nada a converter.' };
    const { data, cur } = loadCur(userId);
    ensureAttrs(cur);
    let gained = 0;
    for (const k of scan.orphanKeys) {
        gained += Math.max(0, Math.floor(Number(cur.attrs[k]) || 0));
        delete cur.attrs[k];
    }
    let ap = Number(cur.attrPoints);
    if (!Number.isFinite(ap) || ap < 0) ap = 0;
    ap = Math.floor(ap);
    cur.attrPoints = ap + gained;
    saveCur(data, userId, cur);
    return {
        ok: true,
        converted: gained,
        attrPoints: cur.attrPoints,
        orphanKeys: scan.orphanKeys
    };
}

function remove(userId) {
    const data = all();
    if (!data[userId]) return false;
    delete data[userId];
    store.save('xp.json', data);
    return true;
}

module.exports = {
    all,
    remove,
    get,
    progress,
    addXp,
    setXp,
    removeXp,
    getAttrs,
    maxHp,
    maxMana,
    leaderboard,
    rankOf,
    levelFromXp,
    totalXpForLevel,
    xpForLevel,
    dailyMultiplier,
    rollAttrGain,
    spendAttrPoint,
    addAttrPoints,
    spendAttrPoints,
    redistribuirAttrs,
    transferAttrPoints,
    scanInvalidAttrs,
    convertInvalidAttrs,
    ATTR_KEYS,
    ATTR_LABEL,
    BASE_ATTR
};
