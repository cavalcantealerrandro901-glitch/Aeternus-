const store = require('./store');

const CLASSES = {
    mago: {
        id: 'mago',
        name: 'Mago',
        emoji: '🧙',
        desc: 'Alto poder mágico e mana',
        bonus: { forca: 1, defesa: 0, agilidade: 1, vida: 0 },
        manaMult: 1.4
    },
    arqueiro: {
        id: 'arqueiro',
        name: 'Arqueiro',
        emoji: '🏹',
        desc: 'Agilidade e críticos',
        bonus: { forca: 1, defesa: 0, agilidade: 3, vida: 0 },
        manaMult: 1.0
    },
    tanque: {
        id: 'tanque',
        name: 'Tanque',
        emoji: '🛡️',
        desc: 'Defesa e vida elevadas',
        bonus: { forca: 0, defesa: 3, agilidade: 0, vida: 3 },
        manaMult: 0.85
    },
    healer: {
        id: 'healer',
        name: 'Healer',
        emoji: '💊',
        desc: 'Suporte e recuperação',
        bonus: { forca: 0, defesa: 1, agilidade: 1, vida: 2 },
        manaMult: 1.25
    },
    guerreiro: {
        id: 'guerreiro',
        name: 'Guerreiro',
        emoji: '⚔️',
        desc: 'Força equilibrada',
        bonus: { forca: 3, defesa: 1, agilidade: 0, vida: 1 },
        manaMult: 0.95
    },
    assassino: {
        id: 'assassino',
        name: 'Assassino',
        emoji: '🗡️',
        desc: 'Dano alto e velocidade',
        bonus: { forca: 2, defesa: 0, agilidade: 3, vida: 0 },
        manaMult: 0.9
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
    data[userId].inventory.push({
        ...item,
        gotAt: Date.now()
    });
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
    create,
    update,
    addItem,
    rollClassItem,
    maxManaFromLevel,
    listMissing,
    count
};
