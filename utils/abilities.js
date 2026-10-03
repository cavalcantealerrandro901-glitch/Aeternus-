/**
 * Habilidades ativas (4 slots) e passivas (5 slots).
 * Cada habilidade pode ser restrita a uma ou mais classes (classIds).
 */
const store = require('./store');
const player = require('./player');
const classesMod = require('./classes');

const ABILITIES = {
    decapitacao: {
        id: 'decapitacao', name: 'Decapitação', emoji: '⚰️', kind: 'active', unique: true,
        type: 'physical', mana: 25, cd: 99, power: 2.2, oncePerMatch: true, consumeRandomAttr: true,
        classIds: ['ceifador_negro'], desc: '[Épica · 1×/partida] Consome 1 atributo aleatório permanente. Dano brutal.'
    },
    dado_da_morte_hab: {
        id: 'dado_da_morte_hab', name: 'Dado da Morte', emoji: '🎲', kind: 'active', unique: true,
        type: 'magic', mana: 20, cd: 4, power: 1.0, diceOfDeath: true,
        classIds: ['ceifador_negro'], desc: '[Épico] Dado 1–6 com efeitos extremos de vida.'
    },
    corte_fantasma: {
        id: 'corte_fantasma', name: 'Corte Fantasma', emoji: '👻', kind: 'active',
        type: 'physical', mana: 14, cd: 2, power: 1.25, trueDamage: 0.45, armorPen: 0.35,
        classIds: ['ceifador_negro'], desc: '[Rara] Ignora parte da defesa e causa dano verdadeiro.'
    },
    estocada_fantasma: {
        id: 'estocada_fantasma', name: 'Estocada Fantasma', emoji: '🗡️', kind: 'active',
        type: 'physical', mana: 12, cd: 2, power: 0.75, effect: 'break_def', effectChance: 1, effectTurns: 2,
        classIds: ['ceifador_negro'], desc: '[Rara] Quebra a defesa do alvo.'
    },
    manto_negro_hab: {
        id: 'manto_negro_hab', name: 'Manto Negro', emoji: '🌑', kind: 'active',
        type: 'buff', mana: 16, cd: 3, power: 0, effect: 'untouchable', effectTurns: 1, self: true,
        classIds: ['ceifador_negro'], desc: 'Intocável por 1 turno.'
    },

    // ── Arcanjo do Véu ──
    julgamento_celestial: {
        id: 'julgamento_celestial',
        name: 'Julgamento Celestial',
        emoji: '🔱',
        kind: 'active',
        type: 'magic',
        mana: 18,
        cd: 3,
        power: 0.55,
        hits: 3,
        seeker: true,
        effect: 'stun',
        effectChance: 1,
        effectTurns: 1,
        effectRequireAllHits: true,
        classIds: ['arcanjo_do_veu'],
        desc: '3 lanças de luz perseguem o alvo. Se as 3 acertarem → atordoado 1 turno.'
    },
    barreira_veu_sagrado: {
        id: 'barreira_veu_sagrado',
        name: 'Barreira do Véu Sagrado',
        emoji: '🛡️',
        kind: 'active',
        type: 'buff',
        mana: 22,
        cd: 5,
        power: 0,
        self: true,
        effect: 'shield_maxhp',
        shieldPctMaxHp: 1.0,
        effectTurns: 2,
        classIds: ['arcanjo_do_veu'],
        desc: 'Escudo por 2 turnos que absorve 100% do HP máximo em dano.'
    },
    toque_restauracao: {
        id: 'toque_restauracao',
        name: 'Toque da Restauração',
        emoji: '✨',
        kind: 'active',
        type: 'heal',
        mana: 16,
        cd: 4,
        power: 0,
        healMissingPct: 0.6,
        cleanse: ['bleed', 'poison', 'sangramento', 'veneno'],
        requireMissingHpPct: 0.6,
        classIds: ['arcanjo_do_veu'],
        desc: 'Cura se o alvo tiver até 60% de vida perdida; remove sangramento e veneno.'
    },
    passo_etereo: {
        id: 'passo_etereo',
        name: 'Passo Etéreo',
        emoji: '👻',
        kind: 'active',
        type: 'buff',
        mana: 14,
        cd: 3,
        power: 0,
        self: true,
        effect: 'untouchable',
        effectTurns: 1,
        dash: true,
        classIds: ['arcanjo_do_veu'],
        desc: 'Some e avança — invulnerável durante o deslocamento (1 turno).'
    },
    decreto_final: {
        id: 'decreto_final',
        name: 'Decreto Final',
        emoji: '⚔️',
        kind: 'active',
        unique: true,
        type: 'magic',
        mana: 30,
        cd: 99,
        power: 2.8,
        oncePerMatch: true,
        delayedTurns: 1,
        aoe: true,
        classIds: ['arcanjo_do_veu'],
        desc: '[Única · 1×/partida] Marca a área; após 1 turno cai a Espada do Céu — dano massivo.'
    },
    regeneracao_benefica: {
        id: 'regeneracao_benefica',
        name: 'Regeneração Benéfica',
        emoji: '💚',
        kind: 'passive',
        unique: true,
        classIds: ['arcanjo_do_veu'],
        desc: 'A cada 4 turnos regenera 8% da vida máxima.',
        mods: { regenEveryTurns: 4, regenPctMaxHp: 0.08 }
    },
    pele_de_luz: {
        id: 'pele_de_luz',
        name: 'Pele de Luz',
        emoji: '🌟',
        kind: 'passive',
        unique: true,
        classIds: ['arcanjo_do_veu'],
        desc: '15% a menos de dano de ataques à distância.',
        mods: { rangedDamageTakenReduce: 0.15 }
    },
    eco_do_veu: {
        id: 'eco_do_veu',
        name: 'Eco do Véu',
        emoji: '📢',
        kind: 'passive',
        unique: true,
        classIds: ['arcanjo_do_veu'],
        desc: 'A cada habilidade usada, próximo ataque +30% dano (acumula até 2×).',
        mods: { afterSkillAttackBonus: 0.3, afterSkillAttackStacks: 2 }
    }
};

const ACTIVE_SLOTS = 4;
const PASSIVE_SLOTS = 5;

function getAbility(id) {
    return ABILITIES[id] || null;
}

function listByKind(kind, userId) {
    const cls = userId ? classesMod.getClass((player.get(userId) || {}).classId) : null;
    const classId = cls?.id;
    return Object.values(ABILITIES).filter((a) => {
        if (a.kind !== kind) return false;
        if (!a.classIds || !a.classIds.length) return !classId;
        if (!classId) return false;
        return a.classIds.includes(classId);
    });
}

function loadLoadout(userId) {
    const data = store.load('ability_loadouts.json', {});
    const cur = data[userId] || { active: [null, null, null, null], passive: [null, null, null, null, null] };
    if (!Array.isArray(cur.active)) cur.active = [null, null, null, null];
    if (!Array.isArray(cur.passive)) cur.passive = [null, null, null, null, null];
    return cur;
}

function saveLoadout(userId, loadout) {
    const data = store.load('ability_loadouts.json', {});
    data[userId] = {
        active: (loadout.active || []).slice(0, ACTIVE_SLOTS),
        passive: (loadout.passive || []).slice(0, PASSIVE_SLOTS)
    };
    store.save('ability_loadouts.json', data);
}

function sanitizeLoadout(userId) {
    const loadout = loadLoadout(userId);
    const cls = classesMod.getClass((player.get(userId) || {}).classId);
    const classId = cls?.id;
    let changed = false;
    for (const kind of ['active', 'passive']) {
        const slots = loadout[kind];
        for (let i = 0; i < slots.length; i++) {
            const id = slots[i];
            if (!id) continue;
            const ab = getAbility(id);
            if (!ab || (ab.classIds && classId && !ab.classIds.includes(classId))) {
                slots[i] = null;
                changed = true;
            }
        }
    }
    if (changed) saveLoadout(userId, loadout);
    return loadout;
}

function equipAbility(userId, abilityId, slot) {
    const ab = getAbility(abilityId);
    if (!ab) return { ok: false, error: 'Habilidade inválida.' };
    const loadout = sanitizeLoadout(userId);
    const slots = ab.kind === 'active' ? loadout.active : loadout.passive;
    const max = ab.kind === 'active' ? ACTIVE_SLOTS : PASSIVE_SLOTS;
    const idx = Math.max(0, Math.min(max - 1, Number(slot) || 0));
    slots[idx] = abilityId;
    saveLoadout(userId, loadout);
    return { ok: true, loadout, ability: ab, slot: idx };
}

function unequipAbility(userId, kind, slot) {
    const loadout = loadLoadout(userId);
    const slots = kind === 'active' ? loadout.active : loadout.passive;
    const idx = Math.max(0, Math.min(slots.length - 1, Number(slot) || 0));
    slots[idx] = null;
    saveLoadout(userId, loadout);
    return { ok: true, loadout };
}

function getEquipped(userId) {
    const loadout = sanitizeLoadout(userId);
    return {
        active: loadout.active.map((id) => (id ? getAbility(id) : null)),
        passive: loadout.passive.map((id) => (id ? getAbility(id) : null)),
        loadout
    };
}

module.exports = {
    ABILITIES,
    ACTIVE_SLOTS,
    PASSIVE_SLOTS,
    getAbility,
    listByKind,
    loadLoadout,
    saveLoadout,
    sanitizeLoadout,
    equipAbility,
    unequipAbility,
    getEquipped
};
