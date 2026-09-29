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
    const attrs = ensureAttrs({ attrs: raw.attrs });
    const totalXp = Math.max(0, Math.floor(Number(raw.xp || 0)));
    // Nível sempre derivado do XP total acumulado (não “gasta” o XP)
    const level = levelFromXp(totalXp);
    return {
        xp: totalXp,
        level,
        attrs,
        attrPoints: Math.max(0, Math.floor(Number(raw.attrPoints || 0)))
    };
}

/** XP total necessário para estar no nível L (cumulativo). Nv1=1000, Nv2=2000, … */
const XP_PER_LEVEL = 1000;

function xpForLevel(level) {
    // XP necessário para passar do nível `level` para level+1
    // Sistema cumulativo: sempre 1000 por nível (total = level * 1000)
    return XP_PER_LEVEL;
}

/** Total de XP para alcançar o nível L (L=1 → 1000, L=2 → 2000, …) */
function totalXpForLevel(level) {
    const lv = Math.max(0, Math.floor(Number(level) || 0));
    return lv * XP_PER_LEVEL;
}

function levelFromXp(totalXp) {
    const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
    // Mantém os XP; nível = quantos blocos de 1000 já juntou
    return Math.min(10000, Math.floor(xp / XP_PER_LEVEL));
}

function progress(userId) {
    const { xp, level, attrs } = get(userId);
    const total = Math.max(0, Math.floor(Number(xp) || 0));
    // XP dentro do nível atual (0..999) e falta para o próximo
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
        cur.attrPoints = Math.max(0, Math.floor(Number(cur.attrPoints || 0)));
        for (let i = 0; i < levelsGained; i++) {
            // pontos livres para distribuir manualmente (mais generoso)
            cur.attrPoints += 5;
            // bônus aleatório pequeno nos attrs
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

/** Gasta 1 ponto livre em um atributo */
function spendAttrPoint(userId, key) {
    return spendAttrPoints(userId, key, 1);
}

/** Gasta N pontos livres em um atributo */
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
    cur.attrs[k] = Math.max(0, Math.floor(Number(cur.attrs[k] || 0)) + n);
    saveCur(data, userId, cur);
    return { ok: true, spent: n, key: k, attrs: { ...cur.attrs }, attrPoints: cur.attrPoints };
}

/**
 * Volta atributos à base e devolve o excedente como pontos livres.
 */
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
        attrPoints: cur.attrPoints,
        attrs: { ...cur.attrs }
    };
}

/** Adiciona pontos livres de atributo (admin / recompensas) */
function addAttrPoints(userId, amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    const { data, cur } = loadCur(userId);
    cur.attrPoints += n;
    saveCur(data, userId, cur);
    return { ok: true, attrPoints: cur.attrPoints };
}

module.exports = {
    get,
    addXp,
    setXp,
    removeXp,
    levelFromXp,
    xpForLevel,
    totalXpForLevel,
    XP_PER_LEVEL,
    dailyMultiplier,
    progress,
    leaderboard,
    rankOf,
    all,
    getAttrs,
    maxHp,
    maxMana,
    spendAttrPoint,
    spendAttrPoints,
    redistribuirAttrs,
    addAttrPoints,
    ATTR_KEYS,
    ATTR_LABEL,
    BASE_ATTR
};
