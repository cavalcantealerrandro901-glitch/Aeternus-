const RARITY = {
    comum: { name: 'Comum', color: 0x9ca3af },
    incomum: { name: 'Incomum', color: 0x22c55e },
    raro: { name: 'Raro', color: 0x3b82f6 },
    epico: { name: 'Épico', color: 0xa855f7 },
    lendario: { name: 'Lendário', color: 0xf59e0b },
    lendaria: { name: 'Lendária', color: 0xf59e0b },
    mitica: { name: 'Mítica', color: 0xef4444 },
    mitico: { name: 'Mítico', color: 0xef4444 }
};

const ITEMS = {
    espada_ferro: {
        id: 'espada_ferro',
        name: 'Espada de Ferro',
        emoji: '⚔️',
        category: 'arma',
        rarity: 'comum',
        effects: { forca: 3 },
        desc: 'Lâmina simples.'
    },
    escudo_madeira: {
        id: 'escudo_madeira',
        name: 'Escudo de Madeira',
        emoji: '🛡️',
        category: 'armadura',
        rarity: 'comum',
        effects: { defesa: 2 },
        desc: 'Proteção leve.'
    },

    espada_do_ceu: {
        id: 'espada_do_ceu',
        name: 'Espada do Céu',
        emoji: '⚔️',
        category: 'arma',
        rarity: 'lendario',
        classId: 'arcanjo_do_veu',
        exclusive: true,
        effects: { forca: 6, inteligencia: 4 },
        desc: 'Lâmina de luz e aço.'
    },
    armadura_do_veu: {
        id: 'armadura_do_veu',
        name: 'Armadura do Véu',
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

    foice_grande: {
        id: 'foice_grande',
        name: 'Foice Grande',
        emoji: '🪓',
        category: 'arma',
        rarity: 'mitica',
        classId: 'ceifador_negro',
        exclusive: true,
        effects: { forca: 900, agilidade: 650, dano: 850 },
        desc: 'Arma de classe do Ceifador Negro.'
    },
    manto_negro_armadura: {
        id: 'manto_negro_armadura',
        name: 'Manto Negro',
        emoji: '🧥',
        category: 'armadura',
        rarity: 'lendaria',
        classId: 'ceifador_negro',
        exclusive: true,
        effects: { defesa: 800, agilidade: 500, vida: 750 },
        desc: 'Armadura de classe do Ceifador Negro.'
    },
    dado_da_morte: {
        id: 'dado_da_morte',
        name: 'Dado da Morte',
        emoji: '🎲',
        category: 'acessorio',
        rarity: 'mitica',
        classId: 'ceifador_negro',
        exclusive: true,
        effects: { sorte: 700, forca: 600, critico: 550 },
        desc: 'Acessório de classe do Ceifador Negro.'
    },

    cetro_da_genese: {
        id: 'cetro_da_genese',
        name: 'Cetro da Gênese',
        emoji: '🪄',
        category: 'arma',
        rarity: 'mitica',
        classId: 'deus_criador',
        exclusive: true,
        effects: { inteligencia: 1000, forca: 850, dano: 950, precisao: 700 },
        desc: 'Arma de classe do Deus Criador. Poder primordial canalizado.'
    },
    manto_cosmico: {
        id: 'manto_cosmico',
        name: 'Manto Cósmico',
        emoji: '🧥',
        category: 'armadura',
        rarity: 'mitica',
        classId: 'deus_criador',
        exclusive: true,
        effects: { defesa: 900, vida: 850, resistencia: 750, agilidade: 600 },
        desc: 'Armadura de classe. Tecido de estrelas e vazio.'
    },
    orbe_do_arquiteto: {
        id: 'orbe_do_arquiteto',
        name: 'Orbe do Arquiteto',
        emoji: '🔮',
        category: 'acessorio',
        rarity: 'mitica',
        classId: 'deus_criador',
        exclusive: true,
        effects: { inteligencia: 950, sorte: 800, manaBonus: 0.2, precisao: 700 },
        desc: 'Acessório de classe. Orbe que ecoa a vontade do criador.'
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
