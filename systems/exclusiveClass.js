/**
 * Classes exclusivas no boot + itens de classe (buffados).
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
                rarity: 'lendaria',
                classId: 'ceifador_negro',
                effects: { forca: 12, agilidade: 6, crit: 8 }
            },
            {
                id: 'manto_negro_armadura',
                name: 'Manto Negro',
                emoji: '🧥',
                category: 'armadura',
                rarity: 'epica',
                classId: 'ceifador_negro',
                effects: { defesa: 10, agilidade: 5, vida: 6 }
            },
            {
                id: 'dado_da_morte',
                name: 'Dado da Morte',
                emoji: '🎲',
                category: 'acessorio',
                rarity: 'mitica',
                classId: 'ceifador_negro',
                effects: { sorte: 10, forca: 6, agilidade: 4 }
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
                rarity: 'lendaria',
                classId: 'detetive_arcano',
                effects: { inteligencia: 12, agilidade: 7, forca: 5, precisao: 8 }
            },
            {
                id: 'capa_detetive_arcano',
                name: 'Capa do Detetive Arcano',
                emoji: '🧥',
                category: 'armadura',
                rarity: 'epica',
                classId: 'detetive_arcano',
                effects: { defesa: 8, inteligencia: 6, sorte: 5, vida: 5 }
            },
            {
                id: 'caderno_deducoes',
                name: 'Caderno de Deduções',
                emoji: '📓',
                category: 'acessorio',
                rarity: 'mitica',
                classId: 'detetive_arcano',
                effects: { inteligencia: 14, sorte: 8, precisao: 6 }
            },
            {
                id: 'lentes_analiticas',
                name: 'Lentes Analíticas',
                emoji: '🔎',
                category: 'acessorio',
                rarity: 'lendaria',
                classId: 'detetive_arcano',
                effects: { inteligencia: 8, precisao: 10, sorte: 5, agilidade: 3 }
            }
        ]
    }
];

function grantGear(userId, gearList) {
    const inv = player.getInventory(userId) || [];
    const have = new Set(inv.map((x) => x.id).filter(Boolean));
    for (const g of gearList) {
        if (have.has(g.id)) {
            try {
                player.updateItem(userId, g.id, { ...g });
            } catch (_) {}
            continue;
        }
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
                console.log(`[exclusiveClass] ${classId} → ${owner} (gear buff)`);
            } else {
                console.log(`[exclusiveClass] dono ${owner} ainda sem perfil (${classId})`);
            }
        }
    } catch (e) {
        console.warn('[exclusiveClass]', e.message);
    }
}

module.exports = { setup, EXCLUSIVES, grantGear };
