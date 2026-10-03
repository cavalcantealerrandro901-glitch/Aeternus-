const store = require('./store');
const player = require('./player');
const classesMod = require('./classes');

const ABILITIES = {
    // Guerreiro (básicas genéricas omitidas se não usadas)

    // ── Ceifador Negro ──
    decapitacao: {
        id: 'decapitacao',
        name: 'Decapitação',
        emoji: '⚰️',
        kind: 'active',
        type: 'physical',
        mana: 25,
        cd: 99,
        power: 1.6,
        unique: true,
        oncePerBattle: true,
        consumeRandomAttr: true,
        classIds: ['ceifador_negro'],
        desc: '[Épica · 1×/partida] Consome 1 ponto de atributo aleatório do usuário permanentemente.'
    },
    corte_fantasma: {
        id: 'corte_fantasma',
        name: 'Corte Fantasma',
        emoji: '👻',
        kind: 'active',
        type: 'physical',
        mana: 14,
        cd: 2,
        power: 1.2,
        trueDamagePct: 0.25,
        classIds: ['ceifador_negro'],
        desc: '[Rara] Ignora parte da defesa e causa dano verdadeiro.'
    },
    estocada_fantasma: {
        id: 'estocada_fantasma',
        name: 'Estocada Fantasma',
        emoji: '🗡️',
        kind: 'active',
        type: 'physical',
        mana: 12,
        cd: 2,
        power: 0.75,
        effect: 'break_def',
        effectChance: 1,
        effectTurns: 2,
        classIds: ['ceifador_negro'],
        desc: '[Rara] Quebra a defesa do alvo.'
    },
    manto_negro_hab: {
        id: 'manto_negro_hab',
        name: 'Manto Negro',
        emoji: '🌑',
        kind: 'active',
        type: 'buff',
        mana: 16,
        cd: 3,
        power: 0,
        effect: 'untouchable',
        effectTurns: 1,
        self: true,
        classIds: ['ceifador_negro'],
        desc: 'Intocável por 1 turno.'
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
        desc: '3 lanças de luz. Se as 3 acertarem → atordoado 1 turno.'
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
        desc: 'Escudo 2 turnos (100% HP máx.).'
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
        classIds: ['arcanjo_do_veu'],
        desc: 'Cura até 60% vida perdida; remove sangramento/veneno.'
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
        desc: 'Invulnerável 1 turno.'
    },
    regeneracao_benefica: {
        id: 'regeneracao_benefica',
        name: 'Regeneração Benéfica',
        emoji: '💚',
        kind: 'passive',
        unique: true,
        classIds: ['arcanjo_do_veu'],
        desc: 'A cada 4 turnos +8% HP máx.',
        mods: { regenEveryTurns: 4, regenPctMaxHp: 0.08 }
    },
    pele_de_luz: {
        id: 'pele_de_luz',
        name: 'Pele de Luz',
        emoji: '🌟',
        kind: 'passive',
        unique: true,
        classIds: ['arcanjo_do_veu'],
        desc: '−15% dano à distância.',
        mods: { rangedDamageTakenReduce: 0.15 }
    },
    eco_do_veu: {
        id: 'eco_do_veu',
        name: 'Eco do Véu',
        emoji: '📢',
        kind: 'passive',
        unique: true,
        classIds: ['arcanjo_do_veu'],
        desc: 'Após habilidade, próximo ataque +30% (até 2 stacks).',
        mods: { afterSkillAttackBonus: 0.3, afterSkillAttackStacks: 2 }
    },

    // ── Deus Criador ──
    raio_primordial: {
        id: 'raio_primordial',
        name: 'Raio Primordial',
        emoji: '⚡',
        kind: 'active',
        type: 'magic',
        mana: 20,
        cd: 2,
        power: 1.45,
        trueDamagePct: 0.2,
        classIds: ['deus_criador'],
        desc: '[Épica] Alto dano mágico + 20% dano verdadeiro.'
    },
    mao_do_arquiteto: {
        id: 'mao_do_arquiteto',
        name: 'Mão do Arquiteto',
        emoji: '🖐️',
        kind: 'active',
        type: 'magic',
        mana: 18,
        cd: 3,
        power: 1.1,
        effect: 'break_def',
        effectChance: 1,
        effectTurns: 2,
        classIds: ['deus_criador'],
        desc: 'Dano sólido e quebra defesa por 2 turnos.'
    },
    veu_do_cosmos: {
        id: 'veu_do_cosmos',
        name: 'Véu do Cosmos',
        emoji: '🌌',
        kind: 'active',
        type: 'buff',
        mana: 22,
        cd: 4,
        power: 0,
        self: true,
        effect: 'untouchable',
        effectTurns: 1,
        classIds: ['deus_criador'],
        desc: 'Intocável por 1 turno.'
    },
    decreto: {
        id: 'decreto',
        name: 'Decreto',
        emoji: '📜',
        kind: 'active',
        type: 'magic',
        mana: 24,
        cd: 4,
        power: 1.25,
        effect: 'stun',
        effectChance: 0.55,
        effectTurns: 1,
        classIds: ['deus_criador'],
        desc: 'Dano mágico alto; chance de atordoar 1 turno.'
    },
    genese: {
        id: 'genese',
        name: 'Gênese',
        emoji: '🪐',
        kind: 'active',
        type: 'heal',
        mana: 28,
        cd: 6,
        power: 0,
        self: true,
        unique: true,
        healMissingPct: 0.45,
        cleanse: ['bleed', 'poison', 'sangramento', 'veneno', 'stun', 'break_def'],
        classIds: ['deus_criador'],
        desc: '[Única] Cura 45% da vida perdida e limpa efeitos negativos.'
    },
    veredito_divino: {
        id: 'veredito_divino',
        name: 'Veredito Divino',
        emoji: '⚖️',
        kind: 'active',
        type: 'magic',
        mana: 30,
        cd: 7,
        power: 1.8,
        unique: true,
        oncePerBattle: true,
        trueDamagePct: 0.35,
        classIds: ['deus_criador'],
        desc: '[Única · 1×/batalha] Dano massivo + 35% verdadeiro.'
    },
    onisciencia: {
        id: 'onisciencia',
        name: 'Onisciência',
        emoji: '👁️',
        kind: 'passive',
        unique: true,
        classIds: ['deus_criador'],
        desc: '+15% precisão; reduz dano de habilidades já vistas.',
        mods: { precision: 0.15, skillFamiliarityReduce: 0.12 }
    },
    imortalidade_relativa: {
        id: 'imortalidade_relativa',
        name: 'Imortalidade Relativa',
        emoji: '♾️',
        kind: 'passive',
        unique: true,
        classIds: ['deus_criador'],
        desc: '1× por batalha sobrevive a golpe fatal com 15% HP máx.',
        mods: { surviveFatalOnce: true, surviveFatalHpPct: 0.15 }
    },
    autoridade: {
        id: 'autoridade',
        name: 'Autoridade',
        emoji: '👑',
        kind: 'passive',
        unique: true,
        classIds: ['deus_criador'],
        desc: '+12% ofensivo e mana.',
        mods: { allOffenseBonus: 0.12, manaBonus: 0.12 }
    },
    presenca_divina: {
        id: 'presenca_divina',
        name: 'Presença Divina',
        emoji: '✨',
        kind: 'passive',
        classIds: ['deus_criador'],
        desc: 'Inimigos começam com −5% atributos.',
        mods: { enemyAttrDebuffStart: 0.05 }
    },
    criacao_constante: {
        id: 'criacao_constante',
        name: 'Criação Constante',
        emoji: '🌀',
        kind: 'passive',
        classIds: ['deus_criador'],
        desc: 'Regenera mana extra por turno.',
        mods: { manaRegenPerTurn: 6 }
    },
    olhar_do_criador: {
        id: 'olhar_do_criador',
        name: 'Olhar do Criador',
        emoji: '🔭',
        kind: 'passive',
        classIds: ['deus_criador'],
        desc: '+10% dano no primeiro ataque da luta.',
        mods: { firstAttackBonus: 0.1 }
    },
    equilibrio: {
        id: 'equilibrio',
        name: 'Equilíbrio',
        emoji: '☯️',
        kind: 'passive',
        classIds: ['deus_criador'],
        desc: 'Técnicas repetidas do inimigo −15% dano.',
        mods: { repeatedSkillDamageReduce: 0.15 }
    },
    eco_do_eter: {
        id: 'eco_do_eter',
        name: 'Eco do Éter',
        emoji: '💫',
        kind: 'passive',
        classIds: ['deus_criador'],
        desc: '+3% em todos os atributos.',
        mods: { allAttrBonus: 0.03 }
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
    const cls = classesMod.getClass((player.get(userId) || {}).classId);
    if (ab.classIds && cls?.id && !ab.classIds.includes(cls.id)) {
        return { ok: false, error: 'Esta habilidade não é da sua classe.' };
    }
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
