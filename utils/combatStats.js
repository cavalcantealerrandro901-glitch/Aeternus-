/**
 * Atributos e loadout de combate unificados (perfil = arena = masmorra).
 */
const player = require('./player');
const xp = require('./xp');
const classes = require('./classes');
const abilities = require('./abilities');

const ATTR_KEYS = xp.ATTR_KEYS || [
    'forca', 'defesa', 'agilidade', 'vida', 'inteligencia', 'sorte', 'precisao', 'resistencia'
];

const BASE = xp.BASE_ATTR || {
    forca: 5, defesa: 5, agilidade: 5, vida: 10,
    inteligencia: 5, sorte: 5, precisao: 5, resistencia: 5
};

function emptyAttrs() {
    const o = {};
    for (const k of ATTR_KEYS) o[k] = 0;
    return o;
}

function baseAttrs(userId) {
    const st = xp.get(userId) || { level: 0, attrs: {} };
    const a = { ...BASE, ...(st.attrs || {}) };
    for (const k of ATTR_KEYS) {
        a[k] = Math.max(0, Math.floor(Number(a[k] ?? BASE[k]) || BASE[k] || 0));
    }
    return {
        attrs: a,
        level: Math.max(0, Math.floor(Number(st.level) || 0)),
        xp: st.xp || 0,
        attrPoints: st.attrPoints || 0
    };
}

function classBonus(classId) {
    const bonus = emptyAttrs();
    const resolved = typeof classes.resolveClassId === 'function'
        ? classes.resolveClassId(classId)
        : classId;
    const cls = classes.getClass(resolved);
    if (!cls?.bonus) return { bonus, cls: cls || null };
    for (const [k, v] of Object.entries(cls.bonus)) {
        if (typeof v !== 'number') continue;
        if (bonus[k] !== undefined) bonus[k] += Math.floor(v);
        if (k === 'vitalidade' && bonus.vida !== undefined) bonus.vida += Math.floor(v);
    }
    return { bonus, cls };
}

function equipBonus(userId) {
    const out = emptyAttrs();
    out.dano = 0;
    out.critico = 0;
    out.manaBonus = 0;
    try {
        const eq = player.getEquipmentBonuses?.(userId) || {};
        for (const [k, v] of Object.entries(eq)) {
            if (typeof v !== 'number' || !Number.isFinite(v)) continue;
            const n = Math.floor(v);
            if (out[k] !== undefined) out[k] += n;
            else if (k === 'dano' || k === 'critico') out[k] = (out[k] || 0) + n;
            else if (k === 'manaBonus') out.manaBonus += v;
        }
    } catch (_) {}
    return out;
}

function passiveMods(userId) {
    try {
        if (typeof abilities.sumPassiveMods === 'function') return abilities.sumPassiveMods(userId) || {};
    } catch (_) {}
    try {
        const eq = abilities.getEquipped?.(userId) || abilities.getEquippedAbilities?.(userId);
        const mods = {};
        for (const p of eq?.passive || []) {
            if (!p?.mods || typeof p.mods !== 'object') continue;
            for (const [k, v] of Object.entries(p.mods)) {
                if (typeof v === 'number') mods[k] = (mods[k] || 0) + v;
                else if (mods[k] === undefined) mods[k] = v;
            }
        }
        return mods;
    } catch (_) {
        return {};
    }
}

function equippedAbilities(userId) {
    try {
        if (typeof abilities.getEquippedAbilities === 'function') return abilities.getEquippedAbilities(userId);
        if (typeof abilities.getEquipped === 'function') return abilities.getEquipped(userId);
    } catch (_) {}
    return { active: [], passive: [], loadout: null };
}

/** Atributos finais: base + classe + equipamento + passivas %. */
function getEffectiveAttrs(userId) {
    const prof = player.get(userId);
    const { attrs: base, level, xp: totalXp, attrPoints } = baseAttrs(userId);
    const classId = prof
        ? (typeof classes.resolveClassId === 'function'
            ? classes.resolveClassId(prof.classId)
            : prof.classId)
        : null;
    const { bonus: cBonus, cls } = classBonus(classId);
    const eBonus = equipBonus(userId);
    const mods = passiveMods(userId);

    const attrs = emptyAttrs();
    for (const k of ATTR_KEYS) {
        attrs[k] = Math.max(0, Math.floor((base[k] || 0) + (cBonus[k] || 0) + (eBonus[k] || 0)));
    }
    const allPct = Number(mods.allAttrBonus || 0);
    if (allPct) {
        for (const k of ATTR_KEYS) attrs[k] = Math.floor(attrs[k] * (1 + allPct));
    }
    if (mods.agilidadeBonus) {
        attrs.agilidade = Math.floor(attrs.agilidade * (1 + Number(mods.agilidadeBonus)));
    }

    return {
        attrs,
        base,
        classBonus: cBonus,
        equipBonus: eBonus,
        passMods: mods,
        level,
        xp: totalXp,
        attrPoints,
        classId,
        cls,
        profile: prof,
        extra: {
            dano: eBonus.dano || 0,
            critico: eBonus.critico || 0,
            manaBonus: eBonus.manaBonus || Number(mods.manaBonus || 0)
        }
    };
}

function getLoadout(userId) {
    return equippedAbilities(userId);
}

module.exports = {
    ATTR_KEYS,
    getEffectiveAttrs,
    getLoadout,
    baseAttrs,
    classBonus,
    equipBonus,
    passiveMods
};
