/**
 * Habilidades ativas (4 slots) e passivas (5 slots).
 * Cada habilidade pode ser restrita a uma ou mais classes (classIds).
 * Sem classIds = legado global (não aparece na escolha se o jogador tiver classe).
 */
const store = require('./store');
const player = require('./player');
const classesMod = require('./classes');

/** Catálogo de habilidades. */
const ABILITIES = {
    // ═══════════════════════════════════════
    // Ceifador Negro (única)
    // ═══════════════════════════════════════
    decapitacao: {
        id: 'decapitacao',
        name: 'Decapitação',
        emoji: '⚰️',
        kind: 'active',
        unique: true,
        type: 'physical',
        mana: 25,
        cd: 99,
        power: 2.2,
        oncePerMatch: true,
        consumeRandomAttr: true,
        classIds: ['ceifador_negro'],
        desc: '[Épica · 1×/partida] Consome 1 atributo aleatório permanente. Dano brutal.'
    },
    dado_da_morte_hab: {
        id: 'dado_da_morte_hab',
        name: 'Dado da Morte',
        emoji: '🎲',
        kind: 'active',
        unique: true,
        type: 'magic',
        mana: 20,
        cd: 4,
        power: 1.0,
        diceOfDeath: true,
        classIds: ['ceifador_negro'],
        desc: '[Épico] Dado 1–6: 4–6 oponente −50% vida máx. (+25% lifesteal); 1–2 você −50%; 3 ambos −25%.'
    },
    corte_fantasma: {
        id: 'corte_fantasma',
        name: 'Corte Fantasma',
        emoji: '👻',
        kind: 'active',
        type: 'physical',
        mana: 14,
        cd: 2,
        power: 1.25,
        trueDamage: 0.45,
        armorPen: 0.35,
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
        desc: '[Rara] Quebra a defesa do alvo; pouco dano direto.'
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
        desc: 'Névoa negra — intocável por 1 turno.'
    },
    veu_da_morte: {
        id: 'veu_da_morte',
        name: 'Véu da Morte',
        emoji: '🖤',
        kind: 'active',
        type: 'buff',
        mana: 18,
        cd: 4,
        power: 0,
        effect: 'death_veil',
        effectTurns: 2,
        self: true,
        classIds: ['ceifador_negro'],
        desc: '[Épica] 2 turnos: 5–50% de chance de sobreviver a um golpe fatal.'
    },
    aura_da_morte: {
        id: 'aura_da_morte',
        name: 'Aura da Morte',
        emoji: '💀',
        kind: 'passive',
        unique: true,
        classIds: ['ceifador_negro'],
        desc: '[Épica] Inimigos começam com Marca da Morte (−1% vida máx./turno).',
        mods: { deathMarkAura: 0.01 }
    },
    maldicao_ceifador: {
        id: 'maldicao_ceifador',
        name: 'Maldição do Ceifador',
        emoji: '⛓️',
        kind: 'passive',
        unique: true,
        classIds: ['ceifador_negro'],
        desc: '[Épica] A cada kill, −5% chance de atacar primeiro na próxima batalha.',
        mods: { firstStrikePenaltyOnKill: 0.05 }
    },
    mao_negra: {
        id: 'mao_negra',
        name: 'Mão Negra',
        emoji: '🤚',
        kind: 'passive',
        unique: true,
        classIds: ['ceifador_negro'],
        desc: '[Épica] Sem arma −30% dano; com Foice Grande +30% dano.',
        mods: { unarmedPenalty: 0.3, classWeaponBonus: 0.3 }
    },
    maldicao_de_nivel: {
        id: 'maldicao_de_nivel',
        name: 'Maldição de Nível',
        emoji: '📉',
        kind: 'passive',
        classIds: ['ceifador_negro'],
        desc: '[Rara] Inimigo com ≥10 níveis a menos: você recebe Marca da Morte no início.',
        mods: { levelCurseGap: 10 }
    },
    presenca_funerea: {
        id: 'presenca_funerea',
        name: 'Presença Funérea',
        emoji: '🌫️',
        kind: 'passive',
        classIds: ['ceifador_negro'],
        desc: 'Alvos com Marca da Morte recebem menos cura.',
        mods: { markHealCut: 0.15 }
    },
    frio_tumulo: {
        id: 'frio_tumulo',
        name: 'Frio do Túmulo',
        emoji: '❄️',
        kind: 'passive',
        classIds: ['ceifador_negro'],
        desc: 'Resistência parcial a medo e paralisia menores.',
        mods: { statusResist: 0.2 }
    },
    colheita_sombria: {
        id: 'colheita_sombria',
        name: 'Colheita Sombria',
        emoji: '🌾',
        kind: 'passive',
        classIds: ['ceifador_negro'],
        desc: 'Ao eliminar alvo marcado, recupera mana.',
        mods: { markKillMana: 8 }
    },
    silencio_do_veu: {
        id: 'silencio_do_veu',
        name: 'Silêncio do Véu',
        emoji: '🤫',
        kind: 'passive',
        classIds: ['ceifador_negro'],
        desc: 'Em Manto Negro, imune a suporte inimigo direcionado.',
        mods: { veilBlockSupport: 1 }
    },

    // ═══════════════════════════════════════
    // L — O Detetive Arcano (única)
    // ═══════════════════════════════════════
    xeque_mate: {
        id: 'xeque_mate',
        name: 'Xeque-Mate',
        emoji: '♟️',
        kind: 'active',
        unique: true,
        type: 'magic',
        mana: 22,
        cd: 4,
        power: 1.5,
        armorPen: 0.4,
        accuracyBonus: 0.5,
        classIds: ['l_detetive_arcano'],
        desc: 'Prevê movimentos; precisão extrema e ignora parte da defesa. Mais forte com mais info.'
    },
    deducao_impossivel: {
        id: 'deducao_impossivel',
        name: 'Dedução Impossível',
        emoji: '🔎',
        kind: 'active',
        unique: true,
        type: 'magic',
        mana: 18,
        cd: 99,
        power: 0.8,
        oncePerMatch: true,
        revealTrue: true,
        classIds: ['l_detetive_arcano'],
        desc: '1×/combate: revela ilusão, alvo verdadeiro ou origem de habilidade.'
    },
    cartas_deducao: {
        id: 'cartas_deducao',
        name: 'Cartas da Dedução',
        emoji: '🃏',
        kind: 'active',
        type: 'magic',
        mana: 12,
        cd: 1,
        power: 1.1,
        stackingInfo: true,
        classIds: ['l_detetive_arcano'],
        desc: 'Cartas afiadas; cada acerto revela info e aumenta dano das próximas.'
    },
    correntes_suspeita: {
        id: 'correntes_suspeita',
        name: 'Correntes da Suspeita',
        emoji: '🔗',
        kind: 'active',
        type: 'magic',
        mana: 15,
        cd: 2,
        power: 0.95,
        effect: 'chains',
        effectChance: 0.6,
        effectTurns: 2,
        classIds: ['l_detetive_arcano'],
        desc: 'Correntes negras; fortalecem se o alvo fugir/mover e podem imobilizar.'
    },
    olho_analitico: {
        id: 'olho_analitico',
        name: 'Olho Analítico',
        emoji: '👁️',
        kind: 'active',
        type: 'magic',
        mana: 10,
        cd: 2,
        power: 0.6,
        analyze: true,
        classIds: ['l_detetive_arcano'],
        desc: 'Analisa o inimigo e revela fraqueza, resistência ou habilidade.'
    },
    bengala_investigador: {
        id: 'bengala_investigador',
        name: 'Bengala do Investigador',
        emoji: '🪄',
        kind: 'active',
        type: 'physical',
        mana: 11,
        cd: 2,
        power: 1.2,
        weaponForm: true,
        classIds: ['l_detetive_arcano'],
        desc: 'Bengala vira espada, lança ou corrente — efeito muda com a forma.'
    },
    um_passo_a_frente: {
        id: 'um_passo_a_frente',
        name: 'Um Passo à Frente',
        emoji: '👟',
        kind: 'passive',
        unique: true,
        classIds: ['l_detetive_arcano'],
        desc: '1×/rodada: reduz dano de ataque previsto ou reposiciona.',
        mods: { predictDodge: 0.15 }
    },
    genio_deducao: {
        id: 'genio_deducao',
        name: 'Gênio da Dedução',
        emoji: '🧩',
        kind: 'passive',
        unique: true,
        classIds: ['l_detetive_arcano'],
        desc: 'Bônus cumulativos vs o mesmo inimigo a cada rodada.',
        mods: { stackVsSame: 0.03 }
    },
    verdade_aparece: {
        id: 'verdade_aparece',
        name: 'A Verdade Sempre Aparece',
        emoji: '💡',
        kind: 'passive',
        unique: true,
        classIds: ['l_detetive_arcano'],
        desc: 'Quebra ilusão/disfarce/manipulação mental após tempo.',
        mods: { breakIllusion: 1 }
    },
    mente_analitica: {
        id: 'mente_analitica',
        name: 'Mente Analítica',
        emoji: '🧠',
        kind: 'passive',
        classIds: ['l_detetive_arcano'],
        desc: 'Ao observar habilidade inimiga, bônus contra ela.',
        mods: { observedSkillResist: 0.05 }
    },
    memoria_fotografica: {
        id: 'memoria_fotografica',
        name: 'Memória Fotográfica',
        emoji: '📷',
        kind: 'passive',
        classIds: ['l_detetive_arcano'],
        desc: 'Reconhece imediatamente o que já viu.',
        mods: { accuracy: 0.06 }
    },
    suspeita_constante: {
        id: 'suspeita_constante',
        name: 'Suspeita Constante',
        emoji: '🕵️',
        kind: 'passive',
        classIds: ['l_detetive_arcano'],
        desc: 'Bônus vs emboscadas, armadilhas e ataques surpresa.',
        mods: { ambushResist: 0.2, dodge: 0.05 }
    },
    raciocinio_reverso: {
        id: 'raciocinio_reverso',
        name: 'Raciocínio Reverso',
        emoji: '🔄',
        kind: 'passive',
        classIds: ['l_detetive_arcano'],
        desc: 'Após tomar uma habilidade, reduz dano de repetições dela.',
        mods: { learnedSkillReduce: 0.12 }
    },
    instinto_investigativo: {
        id: 'instinto_investigativo',
        name: 'Instinto Investigativo',
        emoji: '🧭',
        kind: 'passive',
        classIds: ['l_detetive_arcano'],
        desc: 'Percebe pistas e alterações em ambientes desconhecidos.',
        mods: { perception: 0.1 }
    }
};

const ACTIVE_SLOTS = 4;
const PASSIVE_SLOTS = 5;

function getAbility(id) {
    return ABILITIES[id] || null;
}

function listByKind(kind, userId) {
    if (userId) return listForPlayer(userId, kind);
    // fallback all of kind

    return Object.values(ABILITIES).filter((a) => a.kind === kind);
}

/** Habilidades liberadas para a classe (ativas ou passivas). */
function listForClass(classId, kind) {
    const resolved = classesMod.resolveClassId(classId) || classId;
    if (!resolved) return [];
    return Object.values(ABILITIES).filter((a) => {
        if (kind && a.kind !== kind) return false;
        const ids = a.classIds || [];
        if (!ids.length) return false;
        return ids.includes(resolved);
    });
}

function listForPlayer(userId, kind) {
    const p = player.get(userId);
    if (!p) return [];
    const classId = classesMod.resolveClassId(p.classId);
    if (!classId || !classesMod.getClass(classId)) return [];
    return listForClass(classId, kind);
}

function canUseAbility(userId, ab) {
    if (!ab) return false;
    return abilityAllowedForUser(userId, ab.id || ab);
}

function abilityAllowedForUser(userId, abilityId) {
    const ab = getAbility(abilityId);
    if (!ab) return false;
    const p = player.get(userId);
    if (!p) return false;
    const classId = classesMod.resolveClassId(p.classId);
    if (!classId) return false;
    const ids = ab.classIds || [];
    if (!ids.length) return false;
    return ids.includes(classId);
}

function loadLoadout(userId) {
    const data = store.load('ability_loadouts.json', {});
    const cur = data[userId] || { active: [null, null, null, null], passive: [null, null, null, null, null] };
    while (cur.active.length < ACTIVE_SLOTS) cur.active.push(null);
    while (cur.passive.length < PASSIVE_SLOTS) cur.passive.push(null);
    cur.active = cur.active.slice(0, ACTIVE_SLOTS);
    cur.passive = cur.passive.slice(0, PASSIVE_SLOTS);
    return cur;
}

function saveLoadout(userId, loadout) {
    const data = store.load('ability_loadouts.json', {});
    data[userId] = {
        active: (loadout.active || []).slice(0, ACTIVE_SLOTS),
        passive: (loadout.passive || []).slice(0, PASSIVE_SLOTS)
    };
    store.save('ability_loadouts.json', data);
    return data[userId];
}

/** Remove do loadout habilidades que não são da classe atual. */
function sanitizeLoadout(userId) {
    const loadout = loadLoadout(userId);
    let changed = false;
    for (const kind of ['active', 'passive']) {
        const slots = loadout[kind];
        for (let i = 0; i < slots.length; i++) {
            if (slots[i] && !abilityAllowedForUser(userId, slots[i])) {
                slots[i] = null;
                changed = true;
            }
        }
    }
    if (changed) saveLoadout(userId, loadout);
    return loadout;
}

function equipAbility(userId, abilityId, slotIndex) {
    const ab = getAbility(abilityId);
    if (!ab) return { ok: false, error: 'Habilidade inexistente.' };
    if (!player.has(userId)) return { ok: false, error: 'Crie o perfil primeiro (O.j criar).' };
    if (!abilityAllowedForUser(userId, abilityId)) {
        return { ok: false, error: 'Esta habilidade **não pertence à sua classe**.' };
    }

    const loadout = sanitizeLoadout(userId);
    const slots = ab.kind === 'active' ? loadout.active : loadout.passive;
    const max = ab.kind === 'active' ? ACTIVE_SLOTS : PASSIVE_SLOTS;
    let idx = Number(slotIndex);
    if (!Number.isFinite(idx) || idx < 0 || idx >= max) {
        idx = slots.findIndex((s) => !s);
        if (idx < 0) {
            return {
                ok: false,
                error: `Todos os slots ${ab.kind === 'active' ? 'ativos' : 'passivos'} estão ocupados.`
            };
        }
    }

    for (let i = 0; i < slots.length; i++) {
        if (slots[i] === abilityId) slots[i] = null;
    }
    slots[idx] = abilityId;
    saveLoadout(userId, loadout);
    return { ok: true, loadout, ability: ab, slot: idx };
}

function unequipSlot(userId, kind, slotIndex) {
    const loadout = loadLoadout(userId);
    const slots = kind === 'active' ? loadout.active : loadout.passive;
    const idx = Number(slotIndex);
    if (!Number.isFinite(idx) || idx < 0 || idx >= slots.length) {
        return { ok: false, error: 'Slot inválido.' };
    }
    slots[idx] = null;
    saveLoadout(userId, loadout);
    return { ok: true, loadout };
}

function getEquippedAbilities(userId) {
    const loadout = sanitizeLoadout(userId);
    return {
        active: loadout.active.map((id) => (id ? getAbility(id) : null)),
        passive: loadout.passive.map((id) => (id ? getAbility(id) : null)),
        loadout
    };
}

function sumPassiveMods(userId) {
    const { passive } = getEquippedAbilities(userId);
    const mods = {};
    for (const p of passive) {
        if (!p?.mods) continue;
        for (const [k, v] of Object.entries(p.mods)) {
            mods[k] = (mods[k] || 0) + Number(v);
        }
    }
    return mods;
}

module.exports = {
    ABILITIES,
    ACTIVE_SLOTS,
    PASSIVE_SLOTS,
    getAbility,
    listByKind,
    listForClass,
    listForPlayer,
    abilityAllowedForUser,
    canUseAbility,
    loadLoadout,
    saveLoadout,
    sanitizeLoadout,
    equipAbility,
    unequipSlot,
    getEquippedAbilities,
    sumPassiveMods
};
