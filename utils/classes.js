/**
 * Classes Aeternus — sistema de classes.
 * Classes customizadas (admin) ficam em data/custom-classes.json.
 * Classes com maxHolders limitam quantos jogadores podem tê-las (ex: única = 1).
 */
const store = require('./store');

const RARITIES = {
    comum: { id: 'comum', name: 'Comum', color: 0x9ca3af },
    incomum: { id: 'incomum', name: 'Incomum', color: 0x22c55e },
    rara: { id: 'rara', name: 'Rara', color: 0x3b82f6 },
    epica: { id: 'epica', name: 'Épica', color: 0xa855f7 },
    lendaria: { id: 'lendaria', name: 'Lendária', color: 0xf59e0b },
    unica: { id: 'unica', name: 'Única', color: 0xef4444 },
    mitica: { id: 'mitica', name: 'Mítica', color: 0xec4899 }
};

function loadCustom() {
    return store.load('custom-classes.json', {});
}

function saveCustom(data) {
    store.save('custom-classes.json', data || {});
}

const BASE_CLASSES = {
    cavalheiro_eter: {
        id: 'cavalheiro_eter',
        name: 'Cavalheiro do Éter',
        emoji: '⚔️',
        type: 'melee',
        rarity: 'comum',
        rarityName: 'Comum',
        desc: 'Guerreiro clássico do Éter.',
        uniqueAbilities: ['—', '—'],
        activeAbilities: ['Investida', 'Postura de Ferro', 'Grito de Guerra', 'Corte Circular'],
        uniquePassives: ['—', '—', '—'],
        passives: ['Vitalidade', 'Determinação', 'Escudo Interno', 'Foco', 'Resistência'],
        powers: ['Investida', 'Postura de Ferro', 'Grito de Guerra', 'Corte Circular'],
        disadvantages: [],
        bonus: { forca: 2, defesa: 1, agilidade: 1, vida: 2 },
        manaMult: 1,
        color: 0x9ca3af,
        basicAttack: { id: 'golpe_espada', name: 'Golpe de Espada', emoji: '⚔️', type: 'physical', power: 1.1, mana: 0 },
        classGear: null
    },
    bruxo_ruinas: {
        id: 'bruxo_ruinas',
        name: 'Bruxo das Ruínas',
        emoji: '🔮',
        type: 'magic',
        rarity: 'comum',
        rarityName: 'Comum',
        desc: 'Canaliza o Éter residual das ruínas.',
        uniqueAbilities: ['—', '—'],
        activeAbilities: ['Faísca', 'Maldição Leve', 'Véu Arcano', 'Explosão Menor'],
        uniquePassives: ['—', '—', '—'],
        passives: ['Afinidade Mágica', 'Mana Estável', 'Foco Arcano', 'Resistência Mágica', 'Estudo'],
        powers: ['Faísca', 'Maldição Leve', 'Véu Arcano', 'Explosão Menor'],
        disadvantages: [],
        bonus: { forca: 1, defesa: 1, agilidade: 1, vida: 1 },
        manaMult: 1.15,
        color: 0x9ca3af,
        basicAttack: { id: 'raio_basico', name: 'Faísca Arcana', emoji: '✨', type: 'magic', power: 1.15, mana: 0 },
        classGear: null
    },
    cacador_sombras: {
        id: 'cacador_sombras',
        name: 'Caçador das Sombras',
        emoji: '🏹',
        type: 'ranged',
        rarity: 'comum',
        rarityName: 'Comum',
        desc: 'Atirador ágil da penumbra.',
        uniqueAbilities: ['—', '—'],
        activeAbilities: ['Tiro Rápido', 'Armadilha', 'Camuflagem', 'Rajada'],
        uniquePassives: ['—', '—', '—'],
        passives: ['Olho Aguçado', 'Passo Leve', 'Instinto', 'Precisão', 'Fuga'],
        powers: ['Tiro Rápido', 'Armadilha', 'Camuflagem', 'Rajada'],
        disadvantages: [],
        bonus: { forca: 1, defesa: 1, agilidade: 2, vida: 1 },
        manaMult: 1,
        color: 0x9ca3af,
        basicAttack: { id: 'tiro_basico', name: 'Tiro Rápido', emoji: '🏹', type: 'physical', power: 1.1, mana: 0 },
        classGear: null
    },
    guardiao_runico: {
        id: 'guardiao_runico',
        name: 'Guardião Rúnico',
        emoji: '🛡️',
        type: 'melee',
        rarity: 'incomum',
        rarityName: 'Incomum',
        desc: 'Tanque rúnico.',
        uniqueAbilities: ['—', '—'],
        activeAbilities: ['Muralha', 'Provocar', 'Escudo Rúnico', 'Investida Pesada'],
        uniquePassives: ['—', '—', '—'],
        passives: ['Couraça', 'Aguenta', 'Proteção', 'Estabilidade', 'Vigília'],
        powers: ['Muralha', 'Provocar', 'Escudo Rúnico', 'Investida Pesada'],
        disadvantages: [],
        bonus: { forca: 1, defesa: 3, agilidade: 0, vida: 3 },
        manaMult: 0.9,
        color: 0x22c55e,
        basicAttack: { id: 'pancada', name: 'Pancada de Escudo', emoji: '🛡️', type: 'physical', power: 0.95, mana: 0 },
        classGear: null
    },
    oraculo_vital: {
        id: 'oraculo_vital',
        name: 'Oráculo Vital',
        emoji: '💚',
        type: 'magic',
        rarity: 'incomum',
        rarityName: 'Incomum',
        desc: 'Curandeiro do fluxo vital.',
        uniqueAbilities: ['—', '—'],
        activeAbilities: ['Cura Leve', 'Purificar', 'Bênção', 'Toque Restaurador'],
        uniquePassives: ['—', '—', '—'],
        passives: ['Empatia', 'Fluxo Vital', 'Serenidade', 'Cura Estendida', 'Proteção Suave'],
        powers: ['Cura Leve', 'Purificar', 'Bênção', 'Toque Restaurador'],
        disadvantages: [],
        bonus: { forca: 0, defesa: 1, agilidade: 1, vida: 2 },
        manaMult: 1.2,
        color: 0x22c55e,
        basicAttack: { id: 'toque_luz', name: 'Toque de Luz', emoji: '💚', type: 'magic', power: 0.9, mana: 0 },
        classGear: null
    },
    l_detetive_arcano: {
        id: 'l_detetive_arcano',
        name: 'L — O Detetive Arcano',
        emoji: '🕵️',
        type: 'magic',
        rarity: 'unica',
        rarityName: 'Única',
        maxHolders: 1,
        exclusive: true,
        boundUserId: '1460227733023096875',
        desc: 'Mente analítica. Classe Única (1 titular).',
        uniqueAbilities: ['Xeque-Mate', 'Dedução Impossível'],
        activeAbilities: ['Cartas da Dedução', 'Correntes da Suspeita', 'Olho Analítico', 'Bengala do Investigador'],
        uniquePassives: ['Um Passo à Frente', 'Gênio da Dedução', 'A Verdade Sempre Aparece'],
        passives: ['Mente Analítica', 'Memória Fotográfica', 'Suspeita Constante', 'Raciocínio Reverso', 'Instinto Investigativo'],
        powers: ['Cartas da Dedução', 'Correntes da Suspeita', 'Olho Analítico', 'Bengala do Investigador'],
        disadvantages: ['Classe exclusiva (1 titular)'],
        bonus: { forca: 2, defesa: 2, agilidade: 3, vida: 2 },
        manaMult: 1.2,
        color: 0xef4444,
        basicAttack: { id: 'golpe_bengala', name: 'Golpe de Bengala', emoji: '🪄', type: 'magic', power: 1.15, mana: 0 },
        classGear: null
    },
    ceifador_negro: {
        id: 'ceifador_negro',
        name: 'Ceifador Negro',
        emoji: '💀',
        type: 'melee',
        rarity: 'unica',
        rarityName: 'Única',
        maxHolders: 1,
        exclusive: true,
        boundUserId: '1483097258944630897',
        desc: 'Avatar da morte. Classe Única vinculada.',
        uniqueAbilities: ['Decapitação', 'Dado da Morte'],
        activeAbilities: ['Corte Fantasma', 'Estocada Fantasma', 'Manto Negro', 'Véu da Morte'],
        uniquePassives: ['Aura da Morte', 'Maldição do Ceifador', 'Mão Negra'],
        passives: ['Maldição de Nível', 'Presença Funérea', 'Frio do Túmulo', 'Colheita Sombria', 'Silêncio do Véu'],
        powers: ['Corte Fantasma', 'Estocada Fantasma', 'Manto Negro', 'Véu da Morte'],
        disadvantages: ['Classe exclusiva vinculada'],
        bonus: { forca: 4, defesa: 2, agilidade: 2, vida: 2 },
        manaMult: 1.1,
        color: 0x1f2937,
        basicAttack: { id: 'golpe_foice', name: 'Golpe de Foice', emoji: '⚰️', type: 'physical', power: 1.25, mana: 0 },
        classGear: null
    },
    deus_criador: {
        id: 'deus_criador',
        name: 'Deus Criador',
        emoji: '🌌',
        rarity: 'mitica',
        rarityName: 'Mítica',
        type: 'magic',
        maxHolders: 1,
        exclusive: true,
        boundUserId: process.env.OWNER_ID || process.env.BOT_OWNER_ID || process.env.ADMIN_ID || '1483097258944630897',
        desc: 'Arquiteto do Aeternus. Exclusiva do criador (OWNER_ID).',
        uniqueAbilities: ['Gênese', 'Veredito Divino'],
        activeAbilities: ['Raio Primordial', 'Mão do Arquiteto', 'Véu do Cosmos', 'Decreto'],
        uniquePassives: ['Onisciência', 'Imortalidade Relativa', 'Autoridade'],
        passives: ['Presença Divina', 'Criação Constante', 'Olhar do Criador', 'Equilíbrio', 'Eco do Éter'],
        powers: ['Raio Primordial', 'Mão do Arquiteto', 'Véu do Cosmos', 'Decreto'],
        disadvantages: ['Classe exclusiva do criador'],
        bonus: { forca: 5, defesa: 5, agilidade: 5, vida: 5 },
        manaMult: 1.5,
        color: 0xc4b5fd,
        basicAttack: { id: 'toque_criador', name: 'Toque do Criador', emoji: '✨', type: 'magic', power: 1.35, mana: 0 },
        classGear: null
    },
    arcanjo_do_veu: {
        id: 'arcanjo_do_veu',
        name: 'Arcanjo do Véu',
        emoji: '👼',
        type: 'magic',
        rarity: 'unica',
        rarityName: 'Única',
        maxHolders: 1,
        exclusive: true,
        boundUserId: '1393079977410428968',
        desc: 'Mensageiro da luz velada. Classe Única vinculada ao usuário 1393079977410428968.',
        uniqueAbilities: [
            'Decreto Final [Épica · 1×/partida] — Após 1 turno, espada gigante do céu (dano massivo).',
            'Lâmina do Véu — Ataque básico de luz e aço (Força + Inteligência).'
        ],
        activeAbilities: [
            'Julgamento Celestial — 3 lanças; se as 3 acertarem, atordoa 1 turno.',
            'Barreira do Véu Sagrado — Escudo 2 turnos (100% HP máx.).',
            'Toque da Restauração — Cura até 60% vida perdida; remove sangramento/veneno.',
            'Passo Etéreo — Avanço invulnerável.'
        ],
        uniquePassives: [
            'Regeneração Benéfica — A cada 4 turnos +8% HP máx.',
            'Pele de Luz — −15% dano à distância.',
            'Eco do Véu — Habilidade → próximo ataque +30% (até 2 stacks).'
        ],
        passives: ['Asas do Véu', 'Presença Sagrada', 'Clareza Angelical', 'Foco Celeste', 'Equilíbrio do Véu'],
        powers: ['Julgamento Celestial', 'Barreira do Véu Sagrado', 'Toque da Restauração', 'Passo Etéreo'],
        disadvantages: ['Única — vinculada ao ID 1393079977410428968', 'Decreto Final 1×/partida'],
        bonus: { forca: 3, defesa: 2, agilidade: 3, vida: 2 },
        manaMult: 1.25,
        color: 0xfde68a,
        basicAttack: { id: 'laminas_do_veu', name: 'Lâmina do Véu', emoji: '⚔️', type: 'magic', power: 1.2, mana: 0 },
        classGear: ['lamina_arcana', 'armadura_de_corceus', 'colar_da_ressurreicao']
    }
};

const LEGACY_MAP = {};

function allClasses() {
    return { ...BASE_CLASSES, ...loadCustom() };
}

function getClass(classId) {
    const all = allClasses();
    if (classId && all[classId]) return all[classId];
    if (LEGACY_MAP[classId] && all[LEGACY_MAP[classId]]) return all[LEGACY_MAP[classId]];
    return null;
}

function resolveClassId(classId) {
    const all = allClasses();
    if (classId && all[classId]) return classId;
    if (LEGACY_MAP[classId] && all[LEGACY_MAP[classId]]) return LEGACY_MAP[classId];
    return classId || null;
}

function listClasses() {
    return Object.values(allClasses());
}

function listSelectableClasses() {
    return listClasses().filter((c) => {
        if (!c) return false;
        if (c.exclusive || c.maxHolders === 1) return false;
        if (c.rarity === 'unica' || c.rarity === 'mitica') return false;
        if (c.boundUserId) return false;
        return true;
    });
}

function holdersOf(classId, playersMap) {
    const resolved = resolveClassId(classId);
    if (!resolved || !playersMap) return [];
    return Object.keys(playersMap).filter((uid) => {
        const p = playersMap[uid];
        return p && resolveClassId(p.classId) === resolved;
    });
}

function canClaim(classId, userId, playersMap) {
    const cls = getClass(classId);
    if (!cls) return { ok: false, reason: 'Classe não existe.' };
    const uid = String(userId);
    if (cls.boundUserId && String(cls.boundUserId) !== uid) {
        return { ok: false, reason: 'Esta classe está **vinculada a outro usuário**.' };
    }
    const max = Number(cls.maxHolders);
    if (!max || max <= 0) return { ok: true };
    const holders = holdersOf(classId, playersMap);
    if (holders.includes(uid)) return { ok: true, holders };
    if (holders.length >= max) {
        return {
            ok: false,
            reason: max === 1 ? 'Classe **exclusiva** já ocupada.' : `Limite de **${max}** atingido.`,
            holders
        };
    }
    return { ok: true, holders };
}

function splitList(v, max) {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).slice(0, max);
    if (typeof v === 'string') return v.split(/[|\n;]+/).map((x) => x.trim()).filter(Boolean).slice(0, max);
    return [];
}

function createClass(payload) {
    const id = String(payload.id || payload.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 40);
    if (!id || id.length < 2) throw new Error('Nome/ID inválido');
    if (BASE_CLASSES[id] && !payload.force) throw new Error('Não pode sobrescrever classe base');
    const rarity = String(payload.rarity || 'comum').toLowerCase();
    if (!RARITIES[rarity]) throw new Error('Raridade inválida');
    const exclusive = rarity === 'unica' || rarity === 'mitica' || payload.exclusive === true || payload.maxHolders === 1;
    const cls = {
        id,
        name: String(payload.name || id).slice(0, 48),
        emoji: String(payload.emoji || '✨').slice(0, 8),
        type: String(payload.type || 'melee').slice(0, 16),
        rarity,
        rarityName: RARITIES[rarity].name,
        exclusive: !!exclusive,
        maxHolders: exclusive ? 1 : Math.max(0, Number(payload.maxHolders ?? 0) || 0) || undefined,
        desc: String(payload.desc || '').slice(0, 800),
        uniqueAbilities: splitList(payload.uniqueAbilities, 2),
        activeAbilities: splitList(payload.activeAbilities, 4),
        uniquePassives: splitList(payload.uniquePassives, 3),
        passives: splitList(payload.passives, 5),
        powers: splitList(payload.activeAbilities, 4),
        disadvantages: splitList(payload.disadvantages, 8),
        bonus: {
            forca: Number(payload.forca ?? 1) || 1,
            defesa: Number(payload.defesa ?? 1) || 1,
            agilidade: Number(payload.agilidade ?? 1) || 1,
            vida: Number(payload.vida ?? 1) || 1
        },
        manaMult: Math.min(2, Math.max(0.5, Number(payload.manaMult ?? 1) || 1)),
        color: Number(payload.color) || RARITIES[rarity].color,
        basicAttack: {
            id: 'basico_' + id,
            name: String(payload.basicName || 'Ataque Básico').slice(0, 32),
            emoji: String(payload.basicEmoji || '⚔️').slice(0, 8),
            type: 'physical',
            power: 1,
            mana: 0
        },
        classGear: null
    };
    if (payload.boundUserId) cls.boundUserId = String(payload.boundUserId);
    const custom = loadCustom();
    custom[id] = cls;
    saveCustom(custom);
    return cls;
}

function enforceExclusiveOwners(playersMap) {
    if (!playersMap || typeof playersMap !== 'object') return playersMap;
    for (const [uid, p] of Object.entries(playersMap)) {
        if (!p || !p.classId) continue;
        const cls = getClass(p.classId);
        if (!cls || !(cls.exclusive || cls.maxHolders === 1 || cls.boundUserId)) continue;
        if (cls.boundUserId && String(uid) !== String(cls.boundUserId)) p.classId = null;
    }
    return playersMap;
}

module.exports = {
    RARITIES,
    BASE_CLASSES,
    allClasses,
    getClass,
    resolveClassId,
    listClasses,
    listSelectableClasses,
    holdersOf,
    canClaim,
    createClass,
    enforceExclusiveOwners,
    loadCustom,
    saveCustom
};
