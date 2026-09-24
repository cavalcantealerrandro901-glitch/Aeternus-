/**
 * Classes exclusivas no boot + itens de classe.
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
                rarity: 'comum',
                classId: 'ceifador_negro',
                effects: { forca: 3, agilidade: 1 }
            },
            {
                id: 'manto_negro_armadura',
                name: 'Manto Negro',
                emoji: '🧥',
                category: 'armadura',
                rarity: 'incomum',
                classId: 'ceifador_negro',
                effects: { defesa: 2, agilidade: 2 }
            },
            {
                id: 'dado_da_morte',
                name: 'Dado da Morte',
                emoji: '🎲',
                category: 'acessorio',
                rarity: 'epico',
                classId: 'ceifador_negro',
                effects: { sorte: 3, forca: 1 }
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
                rarity: 'rara',
                classId: 'detetive_arcano',
                effects: { inteligencia: 3, agilidade: 2, forca: 1 }
            },
            {
                id: 'capa_detetive_arcano',
                name: 'Capa do Detetive Arcano',
                emoji: '🧥',
                category: 'armadura',
                rarity: 'incomum',
                classId: 'detetive_arcano',
                effects: { defesa: 2, inteligencia: 2, sorte: 1 }
            },
            {
                id: 'caderno_deducoes',
                name: 'Caderno de Deduções',
                emoji: '📓',
                category: 'acessorio',
                rarity: 'epico',
                classId: 'detetive_arcano',
                effects: { inteligencia: 4, sorte: 2 }
            },
            {
                id: 'lentes_analiticas',
                name: 'Lentes Analíticas',
                emoji: '🔎',
                category: 'acessorio',
                rarity: 'rara',
                classId: 'detetive_arcano',
                effects: { inteligencia: 2, precisao: 2, sorte: 1 }
            }
        ]
    }
];

function grantGear(userId, gearList) {
    const inv = player.getInventory(userId) || [];
    const have = new Set(inv.map((x) => x.id).filter(Boolean));
    for (const g of gearList) {
        if (have.has(g.id)) continue;
        player.addItem(userId, { ...g });
    }
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
