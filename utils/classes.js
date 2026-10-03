const store = require('./store');

const BASE_CLASSES = {
    guerreiro: {
        id: 'guerreiro', name: 'Guerreiro', emoji: '⚔️', type: 'melee', rarity: 'comum', rarityName: 'Comum',
        desc: 'Combate corpo a corpo e resistência.',
        uniqueAbilities: [], activeAbilities: ['Golpe Poderoso', 'Escudo', 'Investida', 'Grito de Guerra'],
        uniquePassives: [], passives: ['Pele Dura', 'Fôlego de Ferro', 'Postura Firme', 'Instinto de Caça', 'Segundo Fôlego'],
        powers: ['Golpe Poderoso', 'Escudo', 'Investida', 'Grito de Guerra'], disadvantages: [],
        bonus: { forca: 2, defesa: 1, agilidade: 0, vida: 1 }, manaMult: 1, color: 0xf97316,
        basicAttack: { id: 'golpe_basico', name: 'Golpe', emoji: '⚔️', type: 'physical', power: 1, mana: 0 }, classGear: null
    },
    mago: {
        id: 'mago', name: 'Mago', emoji: '🔮', type: 'magic', rarity: 'comum', rarityName: 'Comum',
        desc: 'Magia ofensiva e controle de mana.',
        uniqueAbilities: [], activeAbilities: ['Bola de Fogo', 'Gelo', 'Raio', 'Barreira Arcana'],
        uniquePassives: [], passives: ['Mente Clara', 'Fluxo de Mana', 'Foco', 'Estudo', 'Catalisador'],
        powers: ['Bola de Fogo', 'Gelo', 'Raio', 'Barreira Arcana'], disadvantages: [],
        bonus: { forca: 0, defesa: 0, agilidade: 1, vida: 0 }, manaMult: 1.35, color: 0x6366f1,
        basicAttack: { id: 'proj_arcano', name: 'Projétil Arcano', emoji: '✨', type: 'magic', power: 1.05, mana: 0 }, classGear: null
    },
    arqueiro: {
        id: 'arqueiro', name: 'Arqueiro', emoji: '🏹', type: 'ranged', rarity: 'comum', rarityName: 'Comum',
        desc: 'Precisão e agilidade à distância.',
        uniqueAbilities: [], activeAbilities: ['Tiro Certeiro', 'Chuva de Flechas', 'Armadilha', 'Tiro Perfurante'],
        uniquePassives: [], passives: ['Olho de Águia', 'Passo Leve', 'Calma', 'Rastreador', 'Reserva'],
        powers: ['Tiro Certeiro', 'Chuva de Flechas', 'Armadilha', 'Tiro Perfurante'], disadvantages: [],
        bonus: { forca: 1, defesa: 0, agilidade: 2, vida: 0 }, manaMult: 1.1, color: 0x22c55e,
        basicAttack: { id: 'tiro', name: 'Tiro', emoji: '🏹', type: 'physical', power: 1, mana: 0 }, classGear: null
    },
    clerigo: {
        id: 'clerigo', name: 'Clérigo', emoji: '✝️', type: 'magic', rarity: 'incomum', rarityName: 'Incomum',
        desc: 'Cura e suporte sagrado.',
        uniqueAbilities: [], activeAbilities: ['Cura', 'Bênção', 'Smite', 'Proteção'],
        uniquePassives: [], passives: ['Fé', 'Serenidade', 'Aura', 'Compixão', 'Voto'],
        powers: ['Cura', 'Bênção', 'Smite', 'Proteção'], disadvantages: [],
        bonus: { forca: 0, defesa: 1, agilidade: 1, vida: 2 }, manaMult: 1.2, color: 0x22c55e,
        basicAttack: { id: 'toque_luz', name: 'Toque de Luz', emoji: '💚', type: 'magic', power: 0.9, mana: 0 }, classGear: null
    },
    l_detetive_arcano: {
        id: 'l_detetive_arcano', name: 'L — O Detetive Arcano', emoji: '🕵️', type: 'magic', rarity: 'unica', rarityName: 'Única',
        maxHolders: 1, exclusive: true, boundUserId: '1460227733023096875',
        desc: 'Mente analítica. Classe Única (1 titular).',
        uniqueAbilities: ['Xeque-Mate', 'Dedução Impossível'],
        activeAbilities: ['Cartas da Dedução', 'Correntes da Suspeita', 'Olho Analítico', 'Bengala do Investigador'],
        uniquePassives: ['Um Passo à Frente', 'Gênio da Dedução', 'A Verdade Sempre Aparece'],
        passives: ['Mente Analítica', 'Memória Fotográfica', 'Suspeita Constante', 'Raciocínio Reverso', 'Instinto Investigativo'],
        powers: ['Cartas da Dedução', 'Correntes da Suspeita', 'Olho Analítico', 'Bengala do Investigador'],
        disadvantages: ['Classe exclusiva (1 titular)'],
        bonus: { forca: 2, defesa: 2, agilidade: 3, vida: 2 }, manaMult: 1.2, color: 0xef4444,
        basicAttack: { id: 'golpe_bengala', name: 'Golpe de Bengala', emoji: '🪄', type: 'magic', power: 1.15, mana: 0 },
        classGear: { weapon: 'bengala_investigador', armor: 'capa_detetive_arcano', accessory: 'caderno_deducoes' }
    },
    ceifador_negro: {
        id: 'ceifador_negro', name: 'Ceifador Negro', emoji: '💀', type: 'melee', rarity: 'unica', rarityName: 'Única',
        maxHolders: 1, exclusive: true, boundUserId: '1483097258944630897',
        desc: 'Avatar da morte. Classe Única vinculada.',
        uniqueAbilities: ['Decapitação', 'Dado da Morte'],
        activeAbilities: ['Corte Fantasma', 'Estocada Fantasma', 'Manto Negro', 'Véu da Morte'],
        uniquePassives: ['Aura da Morte', 'Maldição do Ceifador', 'Mão Negra'],
        passives: ['Maldição de Nível', 'Presença Funérea', 'Frio do Túmulo', 'Colheita Sombria', 'Silêncio do Véu'],
        powers: ['Corte Fantasma', 'Estocada Fantasma', 'Manto Negro', 'Véu da Morte'],
        disadvantages: ['Classe exclusiva vinculada'],
        bonus: { forca: 4, defesa: 2, agilidade: 2, vida: 2 }, manaMult: 1.1, color: 0x1f2937,
        basicAttack: { id: 'golpe_foice', name: 'Golpe de Foice', emoji: '⚰️', type: 'physical', power: 1.25, mana: 0 },
        classGear: { weapon: 'foice_grande', armor: 'manto_negro_armadura', accessory: 'dado_da_morte' }
    },
    deus_criador: {
        id: 'deus_criador', name: 'Deus Criador', emoji: '🌌', rarity: 'mitica', rarityName: 'Mítica', type: 'magic',
        maxHolders: 1, exclusive: true,
        boundUserId: process.env.OWNER_ID || process.env.BOT_OWNER_ID || process.env.ADMIN_ID || '1483097258944630897',
        desc: 'Arquiteto do Aeternus. Exclusiva do criador (OWNER_ID).',
        uniqueAbilities: ['Gênese', 'Veredito Divino'],
        activeAbilities: ['Raio Primordial', 'Mão do Arquiteto', 'Véu do Cosmos', 'Decreto'],
        uniquePassives: ['Onisciência', 'Imortalidade Relativa', 'Autoridade'],
        passives: ['Presença Divina', 'Criação Constante', 'Olhar do Criador', 'Equilíbrio', 'Eco do Éter'],
        powers: ['Raio Primordial', 'Mão do Arquiteto', 'Véu do Cosmos', 'Decreto'],
        disadvantages: ['Classe exclusiva do criador'],
        bonus: { forca: 5, defesa: 5, agilidade: 5, vida: 5 }, manaMult: 1.5, color: 0xc4b5fd,
        basicAttack: { id: 'toque_criador', name: 'Toque do Criador', emoji: '✨', type: 'magic', power: 1.35, mana: 0 },
        classGear: { weapon: 'cetro_da_genese', armor: 'manto_cosmico', accessory: 'orbe_do_arquiteto' }
    },
    arcanjo_do_veu: {
        id: 'arcanjo_do_veu', name: 'Arcanjo do Véu', emoji: '👼', type: 'magic', rarity: 'unica', rarityName: 'Única',
        maxHolders: 1, exclusive: true, boundUserId: '1393079977410428968',
        desc: 'Mensageiro da luz velada. Classe Única vinculada.',
        uniqueAbilities: ['Decreto Final', 'Lâmina do Véu'],
        activeAbilities: ['Julgamento Celestial', 'Barreira do Véu Sagrado', 'Toque da Restauração', 'Passo Etéreo'],
        uniquePassives: ['Regeneração Benéfica', 'Pele de Luz', 'Eco do Véu'],
        passives: ['Asas Luminosas', 'Voto Sagrado', 'Clareza', 'Proteção Menor', 'Fé Inabalável'],
        powers: ['Julgamento Celestial', 'Barreira do Véu Sagrado', 'Toque da Restauração', 'Passo Etéreo'],
        disadvantages: ['Classe exclusiva vinculada'],
        bonus: { forca: 2, defesa: 3, agilidade: 2, vida: 3 }, manaMult: 1.25, color: 0xfde68a,
        basicAttack: { id: 'lamina_veu', name: 'Lâmina do Véu', emoji: '⚔️', type: 'magic', power: 1.1, mana: 0 },
        classGear: { weapon: 'espada_do_ceu', armor: 'armadura_do_veu', accessory: 'colar_da_ressurreicao' }
    }
};

function loadCustom() {
    try { return store.load('custom_classes.json', {}) || {}; } catch (_) { return {}; }
}
function allClasses() { return { ...BASE_CLASSES, ...loadCustom() }; }
function getClass(id) {
    const all = allClasses();
    return all[id] || all[String(id || '').toLowerCase()] || null;
}
function resolveClassId(classId) {
    if (!classId) return null;
    const id = String(classId).trim();
    const direct = getClass(id);
    if (direct) return direct.id || id;
    const lower = id.toLowerCase();
    const all = allClasses();
    if (all[lower]) return all[lower].id || lower;
    for (const c of Object.values(all)) {
        if (c && String(c.name || '').toLowerCase() === lower) return c.id;
    }
    return id;
}
function canClaim(classId, userId, playersMap) {
    const cls = getClass(resolveClassId(classId) || classId);
    if (!cls) return { ok: false, reason: 'Classe inválida.' };
    if (!(cls.exclusive || cls.maxHolders === 1 || cls.boundUserId)) return { ok: true };
    const bound = cls.boundUserId ? String(cls.boundUserId) : null;
    if (bound && String(userId) !== bound) return { ok: false, reason: 'Classe exclusiva vinculada a outro usuário.' };
    if (playersMap && typeof playersMap === 'object') {
        const holders = Object.entries(playersMap).filter(
            ([uid, p]) => p && String(p.classId) === String(cls.id) && String(uid) !== String(userId)
        );
        const max = cls.maxHolders || (cls.exclusive ? 1 : 0);
        if (max && holders.length >= max) return { ok: false, reason: 'Limite de titulares desta classe atingido.' };
    }
    return { ok: true };
}
function listSelectableClasses() {
    return Object.values(allClasses()).filter((c) => c && c.id && !(c.exclusive || c.maxHolders === 1));
}
function listClassesForUser(userId) {
    const uid = String(userId || '');
    return Object.values(allClasses()).filter((c) => {
        if (!c || !c.id) return false;
        if (c.exclusive || c.maxHolders === 1 || c.boundUserId) return String(c.boundUserId || '') === uid;
        return true;
    });
}
function enforceExclusiveOwners(playersMap) {
    if (!playersMap || typeof playersMap !== 'object') return;
    for (const [uid, p] of Object.entries(playersMap)) {
        if (!p || !p.classId) continue;
        const cls = getClass(p.classId);
        if (!cls || !(cls.exclusive || cls.maxHolders === 1 || cls.boundUserId)) continue;
        if (cls.boundUserId && String(cls.boundUserId) !== String(uid)) p.classId = 'guerreiro';
    }
}

module.exports = {
    BASE_CLASSES, allClasses, getClass, resolveClassId, canClaim,
    listSelectableClasses, listClassesForUser, enforceExclusiveOwners, loadCustom
};
