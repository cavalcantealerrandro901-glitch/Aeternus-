/**
 * Catálogo de itens, materiais, receitas e loja de troca (NPC).
 */

const RARITY = {
    comum: { id: 'comum', name: 'Comum', color: 0x9ca3af, weight: 70 },
    raro: { id: 'raro', name: 'Raro', color: 0x3b82f6, weight: 20 },
    epico: { id: 'epico', name: 'Épico', color: 0xa855f7, weight: 8 },
    lendario: { id: 'lendario', name: 'Lendário', color: 0xf59e0b, weight: 2 }
};

const MATERIALS = {
    fragmento_comum: { id: 'fragmento_comum', name: 'Fragmento Comum', emoji: '🔹', stack: true },
    fragmento_raro: { id: 'fragmento_raro', name: 'Fragmento Raro', emoji: '🔷', stack: true },
    essencia_mago: { id: 'essencia_mago', name: 'Essência do Mago', emoji: '🟣', stack: true },
    essencia_arqueiro: { id: 'essencia_arqueiro', name: 'Essência do Arqueiro', emoji: '🟢', stack: true },
    essencia_tanque: { id: 'essencia_tanque', name: 'Essência do Tanque', emoji: '⚪', stack: true },
    essencia_healer: { id: 'essencia_healer', name: 'Essência do Healer', emoji: '🩷', stack: true },
    essencia_guerreiro: { id: 'essencia_guerreiro', name: 'Essência do Guerreiro', emoji: '🔴', stack: true },
    essencia_assassino: { id: 'essencia_assassino', name: 'Essência do Assassino', emoji: '⬛', stack: true },
    fragmento_eter: { id: 'fragmento_eter', name: 'Fragmento de Éter Puro', emoji: '✨', stack: true },
    po_nivel: { id: 'po_nivel', name: 'Pó de Nível', emoji: '🌫️', stack: true },
    nucleo_antigo: { id: 'nucleo_antigo', name: 'Núcleo Antigo', emoji: '💎', stack: true }
};

const ESSENCE_BY_CLASS = {
    mago: 'essencia_mago',
    arqueiro: 'essencia_arqueiro',
    tanque: 'essencia_tanque',
    healer: 'essencia_healer',
    guerreiro: 'essencia_guerreiro',
    assassino: 'essencia_assassino'
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
    machado: { id: 'machado', name: 'Machado de Batalha', emoji: '🪓', category: 'arma', rarity: 'raro', classId: 'guerreiro', effects: { forca: 3, defesa: 1 } },
    cinto_forca: { id: 'cinto_forca', name: 'Cinto da Força', emoji: '🎗️', category: 'acessorio', rarity: 'comum', classId: 'guerreiro', effects: { forca: 1 } },
    adagas: { id: 'adagas', name: 'Adagas Gêmeas', emoji: '🗡️', category: 'arma', rarity: 'comum', classId: 'assassino', effects: { forca: 1, agilidade: 2 } },
    capa_sombra: { id: 'capa_sombra', name: 'Capa das Sombras', emoji: '🧣', category: 'armadura', rarity: 'raro', classId: 'assassino', effects: { agilidade: 3 } },
    veneno: { id: 'veneno', name: 'Frasco de Veneno', emoji: '☠️', category: 'consumivel', rarity: 'comum', classId: 'assassino', effects: {}, consumable: true },
    orbe_eclipse: { id: 'orbe_eclipse', name: 'Orbe do Eclipse', emoji: '🌑', category: 'acessorio', rarity: 'epico', classId: 'mago', effects: { mana: 8, forca: 2 } },
    arco_tempestade: { id: 'arco_tempestade', name: 'Arco da Tempestade', emoji: '⛈️', category: 'arma', rarity: 'epico', classId: 'arqueiro', effects: { agilidade: 4, forca: 2 } },
    muralha_viva: { id: 'muralha_viva', name: 'Muralha Viva', emoji: '🧱', category: 'armadura', rarity: 'epico', classId: 'tanque', effects: { defesa: 5, vida: 3 } },
    calice_fonte: { id: 'calice_fonte', name: 'Cálice da Fonte', emoji: '🏆', category: 'acessorio', rarity: 'epico', classId: 'healer', effects: { vida: 4, mana: 4 } },
    lamina_juramento_epica: { id: 'lamina_juramento_epica', name: 'Lâmina do Juramento (Épica)', emoji: '⚔️', category: 'arma', rarity: 'epico', classId: 'guerreiro', effects: { forca: 4, defesa: 2 } },
    adaga_crepusculo: { id: 'adaga_crepusculo', name: 'Adaga do Crepúsculo', emoji: '🌑', category: 'arma', rarity: 'epico', classId: 'assassino', effects: { agilidade: 4, forca: 2 } },
    cajado_eclipse: { id: 'cajado_eclipse', name: 'Cajado do Eclipse', emoji: '🌙', category: 'arma', rarity: 'lendario', classId: 'mago', effects: { mana: 8, forca: 2, critMag: 0.08 }, desc: '+8 mana · +2 força · 8% crítico mágico' },
    arco_aurora: { id: 'arco_aurora', name: 'Arco da Aurora', emoji: '🌅', category: 'arma', rarity: 'lendario', classId: 'arqueiro', effects: { agilidade: 4, forca: 2, doubleShot: 0.12 }, desc: '+4 agilidade · +2 força · 12% tiro duplo' },
    egide_tita: { id: 'egide_tita', name: 'Égide do Titã', emoji: '🛡️', category: 'armadura', rarity: 'lendario', classId: 'tanque', effects: { defesa: 5, vida: 3, dmgReduce: 0.1 }, desc: '+5 defesa · +3 vida · -10% dano recebido' },
    reliquia_fonte: { id: 'reliquia_fonte', name: 'Relíquia da Fonte', emoji: '💧', category: 'acessorio', rarity: 'lendario', classId: 'healer', effects: { vida: 4, mana: 3, emergencyHeal: 0.15 }, desc: '+4 vida · +3 mana · 15% cura de emergência' },
    lamina_juramento: { id: 'lamina_juramento', name: 'Lâmina do Juramento', emoji: '⚔️', category: 'arma', rarity: 'lendario', classId: 'guerreiro', effects: { forca: 5, defesa: 2, firstTurnBonus: 0.12 }, desc: '+5 força · +2 defesa · +12% no 1º turno' },
    selo_meianoite: { id: 'selo_meianoite', name: 'Selo da Meia-Noite', emoji: '🖤', category: 'acessorio', rarity: 'lendario', classId: 'assassino', effects: { agilidade: 4, forca: 2, crit: 0.1 }, desc: '+4 agilidade · +2 força · 10% crítico no 1º golpe' },
    anel_nivel_perdido: { id: 'anel_nivel_perdido', name: 'Anel do Nível Perdido', emoji: '💍', category: 'acessorio', rarity: 'lendario', classId: null, effects: { xpBonus: 0.08 }, desc: '+8% XP de conversa' },
    manto_viajante: { id: 'manto_viajante', name: 'Manto do Viajante Eterno', emoji: '🧥', category: 'armadura', rarity: 'lendario', classId: null, effects: { forca: 2, defesa: 2, agilidade: 2, vida: 2, xpBonus: 0.03 }, desc: '+2 em todos · +3% XP' },
    elixir_folego: { id: 'elixir_folego', name: 'Elixir do Segundo Fôlego', emoji: '🧪', category: 'consumivel', rarity: 'epico', classId: null, effects: {}, consumable: true, desc: '1 uso: revive com 30% HP no PvP' },
    caixa_selada: { id: 'caixa_selada', name: 'Caixa Selada do Drop', emoji: '📦', category: 'especial', rarity: 'raro', classId: null, effects: {}, consumable: true, desc: 'Abre em item aleatório (raro+)' },
    coroa_aeternus: { id: 'coroa_aeternus', name: 'Coroa do Aeternus', emoji: '👑', category: 'especial', rarity: 'lendario', classId: null, effects: { forca: 3, defesa: 3, agilidade: 3, vida: 3, xpBonus: 0.1 }, desc: '+3 todos · +10% XP · título exclusivo' },
    asas_vazio: { id: 'asas_vazio', name: 'Asas do Vazio', emoji: '🪽', category: 'especial', rarity: 'lendario', classId: null, effects: { agilidade: 5, vida: 5 }, desc: '+5 agilidade · +5 vida' }
};

const RECIPES = {
    orbe_eclipse: { result: 'orbe_eclipse', minLevel: 30, cost: { fragmento_raro: 3, po_nivel: 5, nucleo_antigo: 1, essencia_mago: 1 }, needItemRarity: 'raro', needClass: 'mago' },
    arco_tempestade: { result: 'arco_tempestade', minLevel: 30, cost: { fragmento_raro: 3, po_nivel: 5, nucleo_antigo: 1, essencia_arqueiro: 1 }, needItemRarity: 'raro', needClass: 'arqueiro' },
    muralha_viva: { result: 'muralha_viva', minLevel: 30, cost: { fragmento_raro: 3, po_nivel: 5, nucleo_antigo: 1, essencia_tanque: 1 }, needItemRarity: 'raro', needClass: 'tanque' },
    calice_fonte: { result: 'calice_fonte', minLevel: 30, cost: { fragmento_raro: 3, po_nivel: 5, nucleo_antigo: 1, essencia_healer: 1 }, needItemRarity: 'raro', needClass: 'healer' },
    lamina_juramento_epica: { result: 'lamina_juramento_epica', minLevel: 30, cost: { fragmento_raro: 3, po_nivel: 5, nucleo_antigo: 1, essencia_guerreiro: 1 }, needItemRarity: 'raro', needClass: 'guerreiro' },
    adaga_crepusculo: { result: 'adaga_crepusculo', minLevel: 30, cost: { fragmento_raro: 3, po_nivel: 5, nucleo_antigo: 1, essencia_assassino: 1 }, needItemRarity: 'raro', needClass: 'assassino' },
    cajado_eclipse: { result: 'cajado_eclipse', minLevel: 40, cost: { fragmento_eter: 3, po_nivel: 10, nucleo_antigo: 2, essencia_mago: 2 }, needItemId: 'orbe_eclipse', needClass: 'mago', failChance: 0.15 },
    arco_aurora: { result: 'arco_aurora', minLevel: 40, cost: { fragmento_eter: 3, po_nivel: 10, nucleo_antigo: 2, essencia_arqueiro: 2 }, needItemId: 'arco_tempestade', needClass: 'arqueiro', failChance: 0.15 },
    egide_tita: { result: 'egide_tita', minLevel: 40, cost: { fragmento_eter: 3, po_nivel: 10, nucleo_antigo: 2, essencia_tanque: 2 }, needItemId: 'muralha_viva', needClass: 'tanque', failChance: 0.15 },
    reliquia_fonte: { result: 'reliquia_fonte', minLevel: 40, cost: { fragmento_eter: 3, po_nivel: 10, nucleo_antigo: 2, essencia_healer: 2 }, needItemId: 'calice_fonte', needClass: 'healer', failChance: 0.15 },
    lamina_juramento: { result: 'lamina_juramento', minLevel: 40, cost: { fragmento_eter: 3, po_nivel: 10, nucleo_antigo: 2, essencia_guerreiro: 2 }, needItemId: 'lamina_juramento_epica', needClass: 'guerreiro', failChance: 0.15 },
    selo_meianoite: { result: 'selo_meianoite', minLevel: 40, cost: { fragmento_eter: 3, po_nivel: 10, nucleo_antigo: 2, essencia_assassino: 2 }, needItemId: 'adaga_crepusculo', needClass: 'assassino', failChance: 0.15 },
    anel_nivel_perdido: { result: 'anel_nivel_perdido', minLevel: 50, cost: { fragmento_eter: 2, po_nivel: 15, nucleo_antigo: 2, fragmento_raro: 5 } },
    manto_viajante: { result: 'manto_viajante', minLevel: 50, cost: { fragmento_eter: 3, po_nivel: 20, nucleo_antigo: 3, fragmento_raro: 8 } },
    elixir_folego: { result: 'elixir_folego', minLevel: 20, cost: { fragmento_raro: 2, po_nivel: 3, fragmento_comum: 5 } },
    caixa_selada: { result: 'caixa_selada', minLevel: 10, cost: { fragmento_comum: 8, po_nivel: 2 } }
};

const TRADE_SHOP = [
    { id: 'buy_frag_comum', name: 'Fragmento Comum', emoji: '🔹', type: 'material', materialId: 'fragmento_comum', amount: 1, priceEter: 2500, mode: 'buy' },
    { id: 'buy_frag_raro', name: 'Fragmento Raro', emoji: '🔷', type: 'material', materialId: 'fragmento_raro', amount: 1, priceEter: 15000, mode: 'buy' },
    { id: 'buy_po', name: 'Pó de Nível', emoji: '🌫️', type: 'material', materialId: 'po_nivel', amount: 1, priceEter: 8000, mode: 'buy' },
    { id: 'buy_nucleo', name: 'Núcleo Antigo', emoji: '💎', type: 'material', materialId: 'nucleo_antigo', amount: 1, priceEter: 75000, mode: 'buy' },
    { id: 'buy_eter_frag', name: 'Fragmento de Éter Puro', emoji: '✨', type: 'material', materialId: 'fragmento_eter', amount: 1, priceEter: 200000, mode: 'buy' },
    { id: 'sell_frag_comum', name: 'Vender Fragmento Comum', emoji: '🔹', type: 'material', materialId: 'fragmento_comum', amount: 1, priceEter: 800, mode: 'sell' },
    { id: 'sell_frag_raro', name: 'Vender Fragmento Raro', emoji: '🔷', type: 'material', materialId: 'fragmento_raro', amount: 1, priceEter: 5000, mode: 'sell' },
    { id: 'buy_caixa', name: 'Caixa Selada do Drop', emoji: '📦', type: 'item', itemId: 'caixa_selada', amount: 1, priceEter: 50000, mode: 'buy' },
    { id: 'buy_elixir', name: 'Elixir do Segundo Fôlego', emoji: '🧪', type: 'item', itemId: 'elixir_folego', amount: 1, priceEter: 120000, mode: 'buy' }
];

function getItemDef(id) { return ITEMS[id] || null; }
function getMaterialDef(id) { return MATERIALS[id] || null; }
function getRecipe(id) { return RECIPES[id] || null; }

function listRecipesFor(level, classId) {
    return Object.values(RECIPES).filter((r) => {
        if ((r.minLevel || 1) > level) return false;
        if (r.needClass && r.needClass !== classId) return false;
        return true;
    });
}

function instantiateItem(itemId) {
    const def = getItemDef(itemId);
    if (!def) return null;
    return {
        id: def.id,
        name: def.name,
        emoji: def.emoji,
        category: def.category,
        rarity: def.rarity,
        classId: def.classId || null,
        effects: def.effects ? { ...def.effects } : {},
        consumable: !!def.consumable,
        desc: def.desc || null,
        uid: def.id + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        gotAt: Date.now()
    };
}

function salvageYield(item) {
    const rarity = item?.rarity || 'comum';
    if (rarity === 'lendario') return null;
    if (rarity === 'epico') {
        return { fragmento_raro: 2, fragmento_comum: 1, nucleo_antigo: Math.random() < 0.3 ? 1 : 0 };
    }
    if (rarity === 'raro') return { fragmento_raro: 1, fragmento_comum: 1 };
    return { fragmento_comum: 1 + Math.floor(Math.random() * 2) };
}

function classItemPool(classId) {
    return Object.values(ITEMS).filter(
        (it) => it.classId === classId && ['comum', 'raro'].includes(it.rarity) && !it.consumable
    );
}

function rollDropItem(classId) {
    const pool = classItemPool(classId);
    if (!pool.length) return instantiateItem('espada_aco');
    const weights = pool.map((it) => RARITY[it.rarity]?.weight || 10);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
        r -= weights[i];
        if (r <= 0) return instantiateItem(pool[i].id);
    }
    return instantiateItem(pool[0].id);
}

function rollLevelMaterials(level) {
    const out = { po_nivel: 1 };
    if (Math.random() < 0.35) out.fragmento_comum = 1;
    if (Math.random() < 0.08) out.fragmento_raro = 1;
    if (level > 0 && level % 25 === 0) out.nucleo_antigo = 1;
    if (Math.random() < 0.015) out.fragmento_eter = 1;
    return out;
}

module.exports = {
    RARITY,
    MATERIALS,
    ITEMS,
    RECIPES,
    TRADE_SHOP,
    ESSENCE_BY_CLASS,
    getItemDef,
    getMaterialDef,
    getRecipe,
    listRecipesFor,
    instantiateItem,
    salvageYield,
    classItemPool,
    rollDropItem,
    rollLevelMaterials
};
