const store = require('./store');
const itemsCatalog = require('./items');

const CLASSES = {
    mago: {
        id: 'mago',
        name: 'Mago',
        emoji: '🧙',
        desc: 'Alto poder mágico e mana',
        bonus: { forca: 1, defesa: 0, agilidade: 1, vida: 0 },
        manaMult: 1.4,
        color: 0x7c3aed,
        banner: 'https://placehold.co/600x200/4c1d95/e9d5ff/png?text=%F0%9F%A7%99+MAGO&font=roboto'
    },
    arqueiro: {
        id: 'arqueiro',
        name: 'Arqueiro',
        emoji: '🏹',
        desc: 'Agilidade e críticos',
        bonus: { forca: 1, defesa: 0, agilidade: 3, vida: 0 },
        manaMult: 1.0,
        color: 0x16a34a,
        banner: 'https://placehold.co/600x200/14532d/bbf7d0/png?text=%F0%9F%8F%B9+ARQUEIRO&font=roboto'
    },
    tanque: {
        id: 'tanque',
        name: 'Tanque',
        emoji: '🛡️',
        desc: 'Defesa e vida elevadas',
        bonus: { forca: 0, defesa: 3, agilidade: 0, vida: 3 },
        manaMult: 0.85,
        color: 0x64748b,
        banner: 'https://placehold.co/600x200/334155/e2e8f0/png?text=%F0%9F%9B%A1+TANQUE&font=roboto'
    },
    healer: {
        id: 'healer',
        name: 'Healer',
        emoji: '💊',
        desc: 'Suporte e recuperação',
        bonus: { forca: 0, defesa: 1, agilidade: 1, vida: 2 },
        manaMult: 1.25,
        color: 0xec4899,
        banner: 'https://placehold.co/600x200/9d174d/fce7f3/png?text=%F0%9F%92%8A+HEALER&font=roboto'
    },
    guerreiro: {
        id: 'guerreiro',
        name: 'Guerreiro',
        emoji: '⚔️',
        desc: 'Força equilibrada',
        bonus: { forca: 3, defesa: 1, agilidade: 0, vida: 1 },
        manaMult: 0.95,
        color: 0xdc2626,
        banner: 'https://placehold.co/600x200/7f1d1d/fecaca/png?text=%E2%9A%94+GUERREIRO&font=roboto'
    },
    assassino: {
        id: 'assassino',
        name: 'Assassino',
        emoji: '🗡️',
        desc: 'Dano alto e velocidade',
        bonus: { forca: 2, defesa: 0, agilidade: 3, vida: 0 },
        manaMult: 0.9,
        color: 0x312e81,
        banner: 'https://placehold.co/600x200/1e1b4b/c7d2fe/png?text=%F0%9F%97%A1+ASSASSINO&font=roboto'
    }
};

const ITEM_CATEGORIES = [
    { value: 'arma', name: 'Armas' },
    { value: 'armadura', name: 'Armaduras' },
    { value: 'acessorio', name: 'Acessórios' },
    { value: 'consumivel', name: 'Consumíveis' },
    { value: 'especial', name: 'Especiais' },
    { value: 'todos', name: 'Todos' }
];

// legado + catálogo
const CLASS_ITEMS = {
    mago: ['cajado_arcano', 'grimorio', 'orbe_mana'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    arqueiro: ['arco_longo', 'aljava', 'botas_vento'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    tanque: ['escudo_ferro', 'armadura_pesada', 'elmo_guerra'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    healer: ['cajado_luz', 'pocao_sagrada', 'amuleto_vida'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    guerreiro: ['espada_aco', 'machado', 'cinto_forca'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    assassino: ['adagas', 'capa_sombra', 'veneno'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean)
};

function all() {
    return store.load('players.json', {});
}

function save(data) {
    store.save('players.json', data);
}

function has(userId) {
    const p = all()[userId];
    return !!(p && p.name && p.classId);
}

function get(userId) {
    return all()[userId] || null;
}

function getClass(classId) {
    return CLASSES[classId] || CLASSES.guerreiro;
}

function maxManaFromLevel(level, classId) {
    const lv = Math.max(0, Number(level) || 0);
    const mult = CLASSES[classId]?.manaMult || 1;
    return Math.floor((20 + lv * 4) * mult);
}

function create(userId, { name, classId, photoUrl }) {
    if (!CLASSES[classId]) throw new Error('Classe inválida');
    const data = all();
    const profile = {
        userId,
        name: String(name).slice(0, 32),
        classId,
        photoUrl: photoUrl || null,
        inventory: [],
        materials: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    data[userId] = profile;
    save(data);
    return profile;
}

function update(userId, patch) {
    const data = all();
    if (!data[userId]) return null;
    data[userId] = { ...data[userId], ...patch, updatedAt: Date.now() };
    save(data);
    return data[userId];
}

function addItem(userId, item) {
    const data = all();
    if (!data[userId]) return null;
    if (!Array.isArray(data[userId].inventory)) data[userId].inventory = [];
    data[userId].inventory.push({ ...item, gotAt: item.gotAt || Date.now() });
    data[userId].updatedAt = Date.now();
    save(data);
    return data[userId];
}

function itemCategory(item) {
    if (item?.category) return item.category;
    const def = item?.id ? itemsCatalog.getItemDef(item.id) : null;
    if (def?.category) return def.category;
    const id = String(item?.id || item?.name || '').toLowerCase();
    if (/espada|machado|arco|cajado|adaga|varinha|lanca|bastao/.test(id)) return 'arma';
    if (/armadura|elmo|escudo|capa|cinto|botas|peitoral|manto|egide/.test(id)) return 'armadura';
    if (/anel|colar|amuleto|bracelete|selo|orbe|rel[ií]quia/.test(id)) return 'acessorio';
    if (/pocao|frasco|comida|elixir|veneno/.test(id)) return 'consumivel';
    return 'especial';
}

function rollClassItem(classId) {
    return itemsCatalog.rollDropItem(classId || 'guerreiro');
}

function getInventory(userId, category) {
    const p = get(userId);
    if (!p) return [];
    let list = Array.isArray(p.inventory) ? [...p.inventory] : [];
    list = list.map((it) => ({
        ...it,
        category: it.category || itemCategory(it),
        rarity: it.rarity || itemsCatalog.getItemDef(it.id)?.rarity || 'comum'
    }));
    if (category && category !== 'todos') {
        list = list.filter((it) => String(it.category) === String(category));
    }
    return list;
}

function listMissing(userIds) {
    return userIds.filter((id) => !has(id));
}

function count() {
    return Object.keys(all()).filter((id) => has(id)).length;
}

module.exports = {
    CLASSES,
    CLASS_ITEMS,
    ITEM_CATEGORIES,
    all,
    save,
    has,
    get,
    getClass,
    create,
    update,
    addItem,
    rollClassItem,
    getInventory,
    itemCategory,
    maxManaFromLevel,
    listMissing,
    count
};
