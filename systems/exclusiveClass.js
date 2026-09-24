/**
 * Classes exclusivas no boot + itens de classe (stats 500–1000).
 */
const classes = require('../utils/classes');
const player = require('../utils/player');

const EXCLUSIVES = [
    {
        classId: 'ceifador_negro',
        owner: '1483097258944630897',
        gear: [
            {
                id: 'foice_grande',
                name: 'Foice Grande',
                emoji: '🪓',
                category: 'arma',
                rarity: 'mitica',
                classId: 'ceifador_negro',
                effects: { forca: 900, agilidade: 650, dano: 850 }
            },
            {
                id: 'manto_negro_armadura',
                name: 'Manto Negro',
                emoji: '🧥',
                category: 'armadura',
                rarity: 'lendaria',
                classId: 'ceifador_negro',
                effects: { defesa: 800, agilidade: 500, vida: 750 }
            },
            {
                id: 'dado_da_morte',
                name: 'Dado da Morte',
                emoji: '🎲',
                category: 'acessorio',
                rarity: 'mitica',
                classId: 'ceifador_negro',
                effects: { sorte: 700, forca: 600, critico: 550 }
            }
        ]
    },
    {
        classId: 'detetive_arcano',
        owner: '1460227733023096875',
        gear: [
            {
                id: 'bengala_investigador',
                name: 'Bengala do Investigador',
                emoji: '🦯',
                category: 'arma',
                rarity: 'mitica',
                classId: 'detetive_arcano',
                effects: { inteligencia: 950, agilidade: 700, forca: 500, dano: 800 }
            },
            {
                id: 'capa_detetive_arcano',
                name: 'Capa do Detetive Arcano',
                emoji: '🧥',
                category: 'armadura',
                rarity: 'lendaria',
                classId: 'detetive_arcano',
                effects: { defesa: 750, inteligencia: 650, sorte: 550, vida: 600 }
            },
            {
                id: 'caderno_deducoes',
                name: 'Caderno de Deduções',
                emoji: '📓',
                category: 'acessorio',
                rarity: 'mitica',
                classId: 'detetive_arcano',
                effects: { inteligencia: 1000, sorte: 700, precisao: 800 }
            },
            {
                id: 'lentes_analiticas',
                name: 'Lentes Analíticas',
                emoji: '🔎',
                category: 'acessorio',
                rarity: 'lendaria',
                classId: 'detetive_arcano',
                effects: { inteligencia: 850, precisao: 900, agilidade: 500 }
            }
        ]
    }
];

function grantGear(userId, gearList) {
    const inv = player.getInventory(userId) || [];
    const byId = new Map();
    for (const it of inv) {
        if (it && it.id) byId.set(String(it.id), it);
    }
    for (const g of gearList) {
        const existing = byId.get(String(g.id));
        if (existing) {
            // atualiza stats do item já existente
            Object.assign(existing, {
                name: g.name,
                emoji: g.emoji,
                category: g.category,
                rarity: g.rarity,
                classId: g.classId,
                effects: { ...(g.effects || {}) }
            });
            continue;
        }
        player.addItem(userId, { ...g });
    }
    // persiste inventário se houve upgrade in-place
    try {
        const data = player.all();
        if (data[userId] && Array.isArray(data[userId].inventory)) {
            player.save(data);
        }
    } catch (_) {}
}

function setup() {
    try {
        classes.enforceExclusiveOwners();
        for (const ex of EXCLUSIVES) {
            const owner = String(ex.owner);
            const classId = ex.classId;
            if (player.has(owner)) {
                player.update(owner, { classId, class: classId });
                grantGear(owner, ex.gear || []);
                console.log(`[exclusiveClass] ${classId} → ${owner}`);
            } else {
                console.log(`[exclusiveClass] dono ${owner} ainda sem perfil (${classId})`);
            }
        }
    } catch (e) {
        console.warn('[exclusiveClass]', e.message);
    }
}

module.exports = { setup, EXCLUSIVES, grantGear };
