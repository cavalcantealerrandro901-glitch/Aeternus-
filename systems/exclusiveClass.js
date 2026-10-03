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
        classId: 'l_detetive_arcano',
        owner: '1460227733023096875',
        gear: [
            {
                id: 'bengala_investigador',
                name: 'Bengala do Investigador',
                emoji: '🦯',
                category: 'arma',
                rarity: 'mitica',
                classId: 'l_detetive_arcano',
                effects: { inteligencia: 950, agilidade: 700, forca: 500, dano: 800 }
            },
            {
                id: 'capa_detetive_arcano',
                name: 'Capa do Detetive Arcano',
                emoji: '🧥',
                category: 'armadura',
                rarity: 'lendaria',
                classId: 'l_detetive_arcano',
                effects: { defesa: 750, inteligencia: 650, sorte: 550, vida: 600 }
            },
            {
                id: 'caderno_deducoes',
                name: 'Caderno de Deduções',
                emoji: '📓',
                category: 'acessorio',
                rarity: 'mitica',
                classId: 'l_detetive_arcano',
                effects: { inteligencia: 1000, sorte: 700, precisao: 800 }
            }
        ]
    },
    {
        classId: 'arcanjo_do_veu',
        owner: '1393079977410428968',
        gear: [
            {
                id: 'espada_do_ceu',
                name: 'Espada do Céu',
                emoji: '⚔️',
                category: 'arma',
                rarity: 'lendaria',
                classId: 'arcanjo_do_veu',
                effects: { forca: 850, inteligencia: 800, dano: 900 }
            },
            {
                id: 'armadura_do_veu',
                name: 'Armadura do Véu',
                emoji: '🛡️',
                category: 'armadura',
                rarity: 'lendaria',
                classId: 'arcanjo_do_veu',
                effects: { defesa: 900, vida: 850, resistencia: 800, damageReduction: 0.3 }
            },
            {
                id: 'colar_da_ressurreicao',
                name: 'Colar da Ressurreição',
                emoji: '📿',
                category: 'acessorio',
                rarity: 'lendaria',
                classId: 'arcanjo_do_veu',
                effects: {
                    vidaPerKillPct: 0.01,
                    reviveOnce: true,
                    reviveHpPct: 0.1,
                    vida: 600,
                    sorte: 500
                },
                desc: '+1% vida máx. por kill. Ressuscita 1× com 10% HP máx.'
            }
        ]
    },
    {
        classId: 'deus_criador',
        owner: String(
            process.env.OWNER_ID ||
                process.env.BOT_OWNER_ID ||
                process.env.ADMIN_ID ||
                '1483097258944630897'
        ),
        gear: [
            {
                id: 'cetro_da_genese',
                name: 'Cetro da Gênese',
                emoji: '🪄',
                category: 'arma',
                rarity: 'mitica',
                classId: 'deus_criador',
                effects: { inteligencia: 1000, forca: 850, dano: 950, precisao: 700 },
                desc: 'Arma de classe do Deus Criador.'
            },
            {
                id: 'manto_cosmico',
                name: 'Manto Cósmico',
                emoji: '🧥',
                category: 'armadura',
                rarity: 'mitica',
                classId: 'deus_criador',
                effects: { defesa: 900, vida: 850, resistencia: 750, agilidade: 600 },
                desc: 'Armadura de classe do Deus Criador.'
            },
            {
                id: 'orbe_do_arquiteto',
                name: 'Orbe do Arquiteto',
                emoji: '🔮',
                category: 'acessorio',
                rarity: 'mitica',
                classId: 'deus_criador',
                effects: { inteligencia: 950, sorte: 800, manaBonus: 0.2, precisao: 700 },
                desc: 'Acessório de classe do Deus Criador.'
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
            Object.assign(existing, {
                name: g.name,
                emoji: g.emoji,
                category: g.category,
                rarity: g.rarity,
                classId: g.classId,
                effects: { ...(g.effects || {}) },
                desc: g.desc || existing.desc
            });
            continue;
        }
        player.addItem(userId, { ...g });
    }
    try {
        const data = player.all();
        if (data[userId] && Array.isArray(data[userId].inventory)) {
            player.save(data);
        }
    } catch (_) {}
}

function setup() {
    try {
        if (typeof classes.enforceExclusiveOwners === 'function') {
            const all = player.all();
            classes.enforceExclusiveOwners(all);
            try {
                player.save(all);
            } catch (_) {}
        }
        for (const ex of EXCLUSIVES) {
            const owner = String(ex.owner);
            const classId = ex.classId;
            if (player.has(owner)) {
                player.update(owner, { classId, class: classId });
                grantGear(owner, ex.gear || []);
                console.log('[exclusiveClass] ' + classId + ' → ' + owner);
            } else {
                console.log('[exclusiveClass] dono ' + owner + ' ainda sem perfil (' + classId + ')');
            }
        }
    } catch (e) {
        console.warn('[exclusiveClass]', e.message);
    }
}

module.exports = { setup, EXCLUSIVES, grantGear };
