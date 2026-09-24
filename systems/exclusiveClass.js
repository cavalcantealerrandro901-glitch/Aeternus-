/**
 * Aplica classes exclusivas no boot (ex.: Ceifador Negro).
 */
const classes = require('../utils/classes');
const player = require('../utils/player');

const OWNER = '1483097258944630897';
const CLASS_ID = 'ceifador_negro';

const GEAR = [
    {
        id: 'foice_grande',
        name: 'Foice Grande',
        emoji: '🪓',
        category: 'arma',
        rarity: 'comum',
        classId: CLASS_ID,
        effects: { forca: 3, agilidade: 1 }
    },
    {
        id: 'manto_negro_armadura',
        name: 'Manto Negro',
        emoji: '🧥',
        category: 'armadura',
        rarity: 'incomum',
        classId: CLASS_ID,
        effects: { defesa: 2, agilidade: 2 }
    },
    {
        id: 'dado_da_morte',
        name: 'Dado da Morte',
        emoji: '🎲',
        category: 'acessorio',
        rarity: 'epico',
        classId: CLASS_ID,
        effects: { sorte: 3, forca: 1 }
    }
];

function grantGear(userId) {
    const inv = player.getInventory(userId) || [];
    const have = new Set(inv.map((x) => x.id).filter(Boolean));
    for (const g of GEAR) {
        if (have.has(g.id)) continue;
        player.addItem(userId, { ...g });
    }
}

function setup(client) {
    try {
        classes.enforceExclusiveOwners();
        if (player.has(OWNER)) {
            player.update(OWNER, { classId: CLASS_ID, class: CLASS_ID });
            grantGear(OWNER);
            console.log(`[exclusiveClass] ${CLASS_ID} → ${OWNER}`);
        } else {
            console.log(`[exclusiveClass] dono ${OWNER} ainda sem perfil (O.j criar)`);
        }
    } catch (e) {
        console.warn('[exclusiveClass]', e.message);
    }
}

module.exports = { setup, OWNER, CLASS_ID, GEAR, grantGear };
