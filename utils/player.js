const store = require('./store');

const CLASSES = {
    mago: {
        id: 'mago',
        name: 'Mago',
        emoji: '🧙',
        desc: 'Alto poder mágico e mana',
        bonus: { forca: 1, defesa: 0, agilidade: 1, vida: 0 },
        manaMult: 1.4,
        color: 0x7c3aed,
        banner:
            'https://placehold.co/600x200/4c1d95/e9d5ff/png?text=%F0%9F%A7%99+MAGO&font=roboto'
    },
    arqueiro: {
        id: 'arqueiro',
        name: 'Arqueiro',
        emoji: '🏹',
        desc: 'Agilidade e críticos',
        bonus: { forca: 1, defesa: 0, agilidade: 3, vida: 0 },
        manaMult: 1.0,
        color: 0x16a34a,
        banner:
            'https://placehold.co/600x200/14532d/bbf7d0/png?text=%F0%9F%8F%B9+ARQUEIRO&font=roboto'
    },
    tanque: {
        id: 'tanque',
        name: 'Tanque',
        emoji: '🛡️',
        desc: 'Defesa e vida elevadas',
        bonus: { forca: 0, defesa: 3, agilidade: 0, vida: 3 },
        manaMult: 0.85,
        color: 0x64748b,
        banner:
            'https://placehold.co/600x200/334155/e2e8f0/png?text=%F0%9F%9B%A1+TANQUE&font=roboto'
    },
    healer: {
        id: 'healer',
        name: 'Healer',
        emoji: '💊',
        desc: 'Suporte e recuperação',
        bonus: { forca: 0, defesa: 1, agilidade: 1, vida: 2 },
        manaMult: 1.25,
        color: 0xec4899,
        banner:
            'https://placehold.co/600x200/9d174d/fce7f3/png?text=%F0%9F%92%8A+HEALER&font=roboto'
    },
    guerreiro: {
        id: 'guerreiro',
        name: 'Guerreiro',
        emoji: '⚔️',
        desc: 'Força equilibrada',
        bonus: { forca: 3, defesa: 1, agilidade: 0, vida: 1 },
        manaMult: 0.95,
        color: 0xdc2626,
        banner:
            'https://placehold.co/600x200/7f1d1d/fecaca/png?text=%E2%9A%94+GUERREIRO&font=roboto'
    },
    assassino: {
        id: 'assassino',
        name: 'Assassino',
        emoji: '🗡️',
        desc: 'Dano alto e velocidade',
        bonus: { forca: 2, defesa: 0, agilidade: 3, vida: 0 },
        manaMult: 0.9,
        color: 0x312e81,
        banner:
            'https://placehold.co/600x200/1e1b4b/c7d2fe/png?text=%F0%9F%97%A1+ASSASSINO&font=roboto'
    }
};

const CLASS_ITEMS = {
    mago: [
        { id: 'cajado_arcano', name: 'Cajado Arcano', emoji: '🪄' },
        { id: 'grimorio', name: 'Grimório Antigo', emoji: '📕' },
        { id: 'orbe_mana', name: 'Orbe de Mana', emoji: '🔮' }
    ],
    arqueiro: [
        { id: 'arco_longo', name: 'Arco Longo', emoji: '🏹' },
        { id: 'aljava', name: 'Aljava Élfica', emoji: '🗡️' },
        { id: 'botas_vento', name: 'Botas do Vento', emoji: '👟' }
    ],
    tanque: [
        { id: 'escudo_ferro', name: 'Escudo de Ferro', emoji: '🛡️' },
        { id: 'armadura_pesada', name: 'Armadura Pesada', emoji: '🧥' },
        { id: 'elmo_guerra', name: 'Elmo de Guerra', emoji: '🎩' }
    ],
    healer: [
        { id: 'cajado_luz', name: 'Cajado da Luz', emoji: '✨' },
        { id: 'pocao_sagrada', name: 'Poção Sagrada', emoji: '💊' },
        { id: 'amuleto_vida', name: 'Amuleto da Vida', emoji: '💚' }
    ],
    guerreiro: [
        { id: 'espada_aco', name: 'Espada de Aço', emoji: '⚔️' },
        { id: 'machado', name: 'Machado de Batalha', emoji: '🪓' },
        { id: 'cinto_forca', name: 'Cinto da Força', emoji: '🦢' }
    ],
    assassino: [
        { id: 'adagas', name: 'Adagas Gêmeas', emoji: '🗡️' },
        { id: 'capa_sombra', name: 'Capa das Sombras', emoji: '🧣' },
        { id: 'veneno', name: 'Frasco de Veneno', emoji: '☠️' }
    ]
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
    data[userId].inventory.push({ ...item, gotAt: Date.now() });
    data[userId].updatedAt = Date.now();
    save(data);
    return data[userId];
}

function rollClassItem(classId) {
    const pool = CLASS_ITEMS[classId] || CLASS_ITEMS.guerreiro;
    return { ...pool[Math.floor(Math.random() * pool.length)] };
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
    all,
    has,
    get,
    getClass,
    create,
    update,
    addItem,
    rollClassItem,
    maxManaFromLevel,
    listMissing,
    count
};
