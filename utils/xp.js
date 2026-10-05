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
    const totalXp = Math.max(0, Math.floor(Number(raw.xp || 0)));
    const level = levelFromXp(totalXp);
    return {
        xp: totalXp,
        level,
        attrs,
        attrPoints: Math.max(0, Math.floor(Number(raw.attrPoints || 0)))
    };
}

const XP_PER_LEVEL = 1000;

function xpForLevel(level) {
    return XP_PER_LEVEL;
}

function totalXpForLevel(level) {
    const lv = Math.max(0, Math.floor(Number(level) || 0));
    return lv * XP_PER_LEVEL;
}

function levelFromXp(totalXp) {
    const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
    return Math.min(10000, Math.floor(xp / XP_PER_LEVEL));
}

function progress(userId) {
    const { xp, level, attrs } = get(userId);
    const total = Math.max(0, Math.floor(Number(xp) || 0));
    const current = total % XP_PER_LEVEL;
    const need = XP_PER_LEVEL;
    const pct = Math.min(100, Math.floor((current / need) * 100));
    return {
        totalXp: total,
        level,
        current,
        need,
        pct,
        toNext: Math.max(0, need - current),
        nextLevelTotal: totalXpForLevel(level + 1),
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
    const before = levelFromXp(cur.xp || 0);
    const n = Math.floor(Number(amount) || 0);
    cur.xp = Math.max(0, Math.floor(Number(cur.xp || 0)) + n);
    const after = levelFromXp(cur.xp);
    cur.level = after;
    const levelsGained = Math.max(0, after - before);
    const gains = [];
    if (levelsGained > 0) {
        cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0)));
        cur.attrPoints += levelsGained * 5;
        for (let i = 0; i < levelsGained; i++) {
            const g = rollAttrGain(false);
            cur.attrs[g.key] = (cur.attrs[g.key] || 0) + g.amount;
            gains.push(g);
        }
    }
    data[userId] = cur;
    store.save('xp.json', data);
    return {
        xp: cur.xp,
        level: cur.level,
        attrs: { ...cur.attrs },
        attrPoints: cur.attrPoints || 0,
        levelsGained,
        attrGains: gains,
        oldLevel: before,
        progress: progress(userId)
    };
}

function getAttrs(userId) {
    return get(userId).attrs;
}

function maxHp(userId) {
    const a = getAttrs(userId);
    return 50 + Number(a.vida || 0) * 8 + Number(a.resistencia || 0) * 2;
}

function maxMana(userId) {
    const a = getAttrs(userId);
    const level = get(userId).level;
    let base = 20 + level * 4 + Number(a.inteligencia || 0) * 3;
    try {
        const player = require('./player');
        const profile = player.get(userId);
        if (typeof player.maxManaFromLevel === 'function') {
            base = Math.max(
                base,
                player.maxManaFromLevel(level, profile?.classId || 'guerreiro') +
                    Number(a.inteligencia || 0) * 2
            );
        }
    } catch (_) {}
    return Math.floor(base);
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

function setXp(userId, amount) {
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrs: { ...BASE_ATTR } };
    ensureAttrs(cur);
    cur.xp = Math.max(0, Math.floor(Number(amount) || 0));
    cur.level = levelFromXp(cur.xp);
    data[userId] = cur;
    store.save('xp.json', data);
    return {
        xp: cur.xp,
        level: cur.level,
        attrs: { ...cur.attrs },
        progress: progress(userId)
    };
}

function removeXp(userId, amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    return addXp(userId, -n);
}

function loadCur(userId) {
    const data = all();
    const cur = data[userId] || { xp: 0, level: 0, attrs: { ...BASE_ATTR }, attrPoints: 0 };
    ensureAttrs(cur);
    cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0)));
    return { data, cur };
}

function saveCur(data, userId, cur) {
    data[userId] = cur;
    store.save('xp.json', data);
}

function spendAttrPoint(userId, key) {
    return spendAttrPoints(userId, key, 1);
}

function spendAttrPoints(userId, key, amount) {
    const k = String(key || '').toLowerCase();
    if (!ATTR_KEYS.includes(k)) {
        return { ok: false, error: 'Atributo inválido.' };
    }
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 0) return { ok: false, error: 'Quantidade inválida.' };

    const { data, cur } = loadCur(userId);
    if (cur.attrPoints < n) {
        return {
            ok: false,
            error: 'Pontos insuficientes. Você tem **' + cur.attrPoints + '**.'
        };
    }
    cur.attrPoints -= n;

    // Cada ponto investido gera entre +3 e +5 no atributo escolhido.
    // Assim, 1 ponto = +3 a +5; quantidades maiores acumulam o mesmo ganho por ponto.
    let gained = 0;
    for (let i = 0; i < n; i++) {
        gained += 3 + Math.floor(Math.random() * 3);
    }

    cur.attrs[k] = Math.max(0, Math.floor(Number(cur.attrs[k] || 0)) + gained);
    saveCur(data, userId, cur);
    return {
        ok: true,
        spent: n,
        gained,
        minGained: n * 3,
        maxGained: n * 5,
        key: k,
        attrs: { ...cur.attrs },
        attrPoints: cur.attrPoints
    };
}

function redistribuirAttrs(userId) {
    const { data, cur } = loadCur(userId);
    let refund = 0;
    for (const k of ATTR_KEYS) {
        const base = BASE_ATTR[k] ?? 0;
        const val = Math.floor(Number(cur.attrs[k] || 0));
        if (val > base) {
            refund += val - base;
            cur.attrs[k] = base;
        } else {
            cur.attrs[k] = Math.max(base, val);
        }
    }
    cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0)) + refund);
    saveCur(data, userId, cur);
    return {
        ok: true,
        refund,
        attrs: { ...cur.attrs },
        attrPoints: cur.attrPoints
    };
}

function transferAttrPoints(fromId, toId, amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 0) return { ok: false, error: 'Quantidade inválida.' };
    const a = loadCur(fromId);
    if (a.cur.attrPoints < n) {
        return { ok: false, error: 'Pontos insuficientes para transferir.' };
    }
    a.cur.attrPoints -= n;
    saveCur(a.data, fromId, a.cur);
    const b = loadCur(toId);
    b.cur.attrPoints = Math.max(0, Math.floor(Number(b.cur.attrPoints || 0))) + n;
    saveCur(b.data, toId, b.cur);
    return { ok: true, amount: n, from: fromId, to: toId };
}

function scanInvalidAttrs(userId) {
    const data = all();
    const raw = data[userId] || {};
    const attrs = raw.attrs && typeof raw.attrs === 'object' ? { ...raw.attrs } : {};
    let orphan = 0;
    const orphanKeys = [];
    for (const [k, v] of Object.entries(attrs)) {
        if (!ATTR_KEYS.includes(k)) {
            const n = Math.floor(Number(v) || 0);
            if (n !== 0) {
                orphan += Math.abs(n);
                orphanKeys.push(k);
            }
        }
    }
    let negative = 0;
    for (const k of ATTR_KEYS) {
        const n = Math.floor(Number(attrs[k] || 0));
        if (n < 0) negative += Math.abs(n);
    }
    const apRaw = raw.attrPoints;
    const apNum = Number(apRaw);
    const apBroken =
        apRaw != null &&
        apRaw !== '' &&
        (!Number.isFinite(apNum) || apNum < 0 || !Number.isInteger(apNum));
    let recoverable = orphan + negative;
    if (apBroken && Number.isFinite(apNum) && apNum < 0) {
        recoverable += Math.abs(Math.floor(apNum));
    }
    return {
        hasInvalid: recoverable > 0 || apBroken,
        recoverable,
        orphan,
        negative,
        orphanKeys,
        apBroken,
        currentValidPoints: Math.max(0, Math.floor(Number.isFinite(apNum) ? apNum : 0))
    };
}

function convertInvalidAttrs(userId) {
    const scan = scanInvalidAttrs(userId);
    if (!scan.hasInvalid) {
        return { ok: false, error: 'Nenhum ponto inválido encontrado.', converted: 0 };
    }
    const { data, cur } = loadCur(userId);
    const attrs = cur.attrs && typeof cur.attrs === 'object' ? { ...cur.attrs } : {};
    let gained = 0;
    for (const k of Object.keys(attrs)) {
        if (!ATTR_KEYS.includes(k)) {
            const n = Math.floor(Number(attrs[k]) || 0);
            gained += Math.abs(n);
            delete attrs[k];
        }
    }
    for (const k of ATTR_KEYS) {
        const n = Math.floor(Number(attrs[k] || 0));
        if (n < 0) {
            gained += Math.abs(n);
            attrs[k] = BASE_ATTR[k] ?? 0;
        } else {
            attrs[k] = n;
        }
    }
    ensureAttrs({ attrs });
    cur.attrs = attrs;
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

module.exports = {
    all,
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
    spendAttrPoints,
    redistribuirAttrs,
    transferAttrPoints,
    scanInvalidAttrs,
    convertInvalidAttrs,
    ATTR_KEYS,
    ATTR_LABEL,
    BASE_ATTR
};
