const store = require('./store');

const RARITY = {
    comum: { name: 'Comum', color: 0x9ca3af },
    raro: { name: 'Raro', color: 0x3b82f6 },
    epico: { name: 'Épico', color: 0xa855f7 },
    lendario: { name: 'Lendário', color: 0xf59e0b },
    mitico: { name: 'Mítico', color: 0xec4899 }
};

const ITEMS = {
    cajado_arcano: { id: 'cajado_arcano', name: 'Cajado Arcano', emoji: '🪄', category: 'arma', rarity: 'comum', classId: 'mago', effects: { mana: 2, forca: 1 } },
    grimorio: { id: 'grimorio', name: 'Grimório Antigo', emoji: '📕', category: 'acessorio', rarity: 'comum', classId: 'mago', effects: { mana: 3 } },
    orbe_mana: { id: 'orbe_mana', name: 'Orbe de Mana', emoji: '🔮', category: 'acessorio', rarity: 'raro', classId: 'mago', effects: { mana: 5, forca: 1 } },
    arco_longo: { id: 'arco_longo', name: 'Arco Longo', emoji: '🏹', category: 'arma', rarity: 'comum', classId: 'arqueiro', effects: { agilidade: 2, forca: 1 } },
    aljava: { id: 'aljava', name: 'Aljava Élfica', emoji: '🗡️', category: 'acessorio', rarity: 'comum', classId: 'arqueiro', effects: { agilidade: 1 } },
    botas_vento: { id: 'botas_vento', name: 'Botas do Vento', emoji: '👟', category: 'armadura', rarity: 'raro', classId: 'arqueiro', effects: { agilidade: 3 } },
    escudo_ferro: { id: 'escudo_ferro', name: 'Escudo de Ferro', emoji: '🛡️', category: 'armadura', rarity: 'comum', classId: 'tanque', effects: { defesa: 2 } },
    armadura_pesada: { id: 'armadura_pesada', name: 'Armadura Pesada', emoji: '🧥', category: 'armadura', rarity: 'raro', classId: 'tanque', effects: { defesa: 3, vida: 1 } },
    elmo_guerra: { id: 'elmo_guerra', name: 'Elmo de Guerra', emoji: '🎩', category: 'armadura', rarity: 'comum', classId: 'tanque', effects: { defesa: 1, vida: 1 } },
    cajado_luz: { id: 'cajado_luz', name: 'Cajado da Luz', emoji: '✨', category: 'arma', rarity: 'comum', classId: 'healer', effects: { mana: 2, vida: 1 } },
    pocao_sagrada: { id: 'pocao_sagrada', name: 'Poção Sagrada', emoji: '💊', category: 'consumivel', rarity: 'comum', classId: 'healer', effects: {}, consumable: true },
    amuleto_vida: { id: 'amuleto_vida', name: 'Amuleto da Vida', emoji: '💚', category: 'acessorio', rarity: 'raro', classId: 'healer', effects: { vida: 3 } },
    espada_aco: { id: 'espada_aco', name: 'Espada de Aço', emoji: '⚔️', category: 'arma', rarity: 'comum', classId: 'guerreiro', effects: { forca: 2 } },
    machado: { id: 'machado', name: 'Machado de Batalha', emoji: '🪓', category: 'arma', rarity: 'raro', classId: 'guerreiro', effects: { forca: 3, vida: 1 } },
    cinto_forca: { id: 'cinto_forca', name: 'Cinto da Força', emoji: '🎗️', category: 'acessorio', rarity: 'comum', classId: 'guerreiro', effects: { forca: 1 } },
    adagas: { id: 'adagas', name: 'Adagas Gêmeas', emoji: '🗡️', category: 'arma', rarity: 'comum', classId: 'assassino', effects: { forca: 1, agilidade: 2 } },
    capa_sombra: { id: 'capa_sombra', name: 'Capa das Sombras', emoji: '🧣', category: 'armadura', rarity: 'raro', classId: 'assassino', effects: { agilidade: 3 } },
    veneno: { id: 'veneno', name: 'Frasco de Veneno', emoji: '☠️', category: 'consumivel', rarity: 'comum', classId: 'assassino', effects: {}, consumable: true },
    orbe_eclipse: { id: 'orbe_eclipse', name: 'Orbe do Eclipse', emoji: '🌑', category: 'acessorio', rarity: 'epico', classId: 'mago', effects: { mana: 8, forca: 2 } },
    arco_tempestade: { id: 'arco_tempestade', name: 'Arco da Tempestade', emoji: '⛈️', category: 'arma', rarity: 'epico', classId: 'arqueiro', effects: { agilidade: 4, forca: 2 } },

    lamina_arcana: {
        id: 'lamina_arcana',
        name: 'Lâmina Arcana',
        emoji: '🗡️',
        category: 'arma',
        rarity: 'lendario',
        classId: 'arcanjo_do_veu',
        exclusive: true,
        effects: { forca: 4, inteligencia: 4, dano: 3, danoMagico: 3, critFirstAttack: 0.3 },
        desc: '30% crítico no 1º ataque. Dano físico/mágico + Força + Inteligência.'
    },
    armadura_de_corceus: {
        id: 'armadura_de_corceus',
        name: 'Armadura de Corcéus',
        emoji: '🛡️',
        category: 'armadura',
        rarity: 'lendario',
        classId: 'arcanjo_do_veu',
        exclusive: true,
        effects: { defesa: 5, vida: 4, resistencia: 4, damageReduction: 0.3 },
        desc: '30% redução de dano. Defesa + Vida + Resistência.'
    },
    colar_da_ressurreicao: {
        id: 'colar_da_ressurreicao',
        name: 'Colar da Ressurreição',
        emoji: '📿',
        category: 'acessorio',
        rarity: 'lendario',
        classId: 'arcanjo_do_veu',
        exclusive: true,
        effects: { vidaPerKillPct: 0.01, reviveOnce: true, reviveHpPct: 0.1 },
        desc: '+1% vida máx. por oponente derrotado. Ressuscita 1× com 10% do HP máximo.'
    },

    livro_forca: { id: 'livro_forca', name: 'Livro de Força', emoji: '📕', category: 'consumivel', rarity: 'raro', effects: {}, bookAttr: 'forca', consumable: true },
    livro_defesa: { id: 'livro_defesa', name: 'Livro de Defesa', emoji: '📘', category: 'consumivel', rarity: 'raro', effects: {}, bookAttr: 'defesa', consumable: true },
    livro_agilidade: { id: 'livro_agilidade', name: 'Livro de Agilidade', emoji: '📗', category: 'consumivel', rarity: 'raro', effects: {}, bookAttr: 'agilidade', consumable: true },
    livro_vida: { id: 'livro_vida', name: 'Livro de Vida', emoji: '📙', category: 'consumivel', rarity: 'raro', effects: {}, bookAttr: 'vida', consumable: true }
};

const RECIPES = {};
const TRADE_SHOP = [];

function getItemDef(id) {
    return ITEMS[id] || ITEMS[String(id || '').toLowerCase()] || null;
}

function instantiateItem(id, overrides = {}) {
    const key = String(id || '').trim();
    const def = getItemDef(key);
    if (!def) return null;
    return {
        id: def.id,
        name: def.name,
        emoji: def.emoji || '📦',
        category: def.category || 'misc',
        rarity: def.rarity || 'comum',
        classId: def.classId || null,
        effects: { ...(def.effects || {}) },
        desc: def.desc || '',
        exclusive: !!def.exclusive,
        bookAttr: def.bookAttr || undefined,
        consumable: !!def.consumable,
        ...overrides
    };
}

function listItems(filter) {
    return Object.values(ITEMS).filter((it) => {
        if (!filter) return true;
        if (filter.classId && it.classId !== filter.classId) return false;
        if (filter.category && it.category !== filter.category) return false;
        return true;
    });
}

module.exports = {
    RARITY,
    ITEMS,
    RECIPES,
    TRADE_SHOP,
    getItemDef,
    listItems,
    instantiateItem
};
