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
        equipped: { arma: null, armadura: null, acessorio: null },
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
    if (/pocao|frasco|comida|elixir|veneno|livro/.test(id)) return 'consumivel';
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

function ensureEquipped(p) {
    if (!p) return { arma: null, armadura: null, acessorio: null };
    if (!p.equipped || typeof p.equipped !== 'object') {
        p.equipped = { arma: null, armadura: null, acessorio: null };
    }
    for (const s of ['arma', 'armadura', 'acessorio']) {
        if (!(s in p.equipped)) p.equipped[s] = null;
    }
    return p.equipped;
}

function getEquipped(userId) {
    const p = get(userId);
    if (!p) return { arma: null, armadura: null, acessorio: null };
    return { ...ensureEquipped(p) };
}

function equipSlotFor(item) {
    const cat = itemCategory(item);
    if (cat === 'arma') return 'arma';
    if (cat === 'armadura') return 'armadura';
    if (cat === 'acessorio') return 'acessorio';
    return null;
}

function removeItemAt(userId, index0) {
    const data = all();
    if (!data[userId]) return null;
    if (!Array.isArray(data[userId].inventory)) return null;
    const inv = data[userId].inventory;
    if (index0 < 0 || index0 >= inv.length) return null;
    const [item] = inv.splice(index0, 1);
    data[userId].updatedAt = Date.now();
    save(data);
    return item;
}

function equipItem(userId, index1) {
    const p = get(userId);
    if (!p) return { ok: false, error: 'Sem perfil de jogador. Use `O.j criar`.' };
    const inv = getInventory(userId, 'todos');
    const idx = Math.floor(Number(index1) || 0) - 1;
    if (idx < 0 || idx >= inv.length) {
        return { ok: false, error: 'Número inválido. Veja `O.inventario`.' };
    }
    const item = inv[idx];
    const slot = equipSlotFor(item);
    if (!slot) {
        return {
            ok: false,
            error: 'Este item não pode ser equipado. Use `O.usar` se for consumível/livro.'
        };
    }
    const data = all();
    const raw = data[userId].inventory || [];
    let removed = null;
    if (item.uid) {
        const i = raw.findIndex((x) => x.uid === item.uid);
        if (i >= 0) removed = raw.splice(i, 1)[0];
    }
    if (!removed && idx < raw.length) removed = raw.splice(idx, 1)[0];
    if (!removed) return { ok: false, error: 'Não foi possível remover o item do inventário.' };

    ensureEquipped(data[userId]);
    const previous = data[userId].equipped[slot];
    data[userId].equipped[slot] = { ...removed, equippedAt: Date.now() };
    if (previous) {
        const back = { ...previous };
        delete back.equippedAt;
        raw.push(back);
    }
    data[userId].updatedAt = Date.now();
    save(data);
    return {
        ok: true,
        slot,
        item: data[userId].equipped[slot],
        previous: previous || null
    };
}

function unequipSlot(userId, slot) {
    const s = String(slot || '').toLowerCase();
    if (!['arma', 'armadura', 'acessorio'].includes(s)) {
        return { ok: false, error: 'Slot inválido. Use: arma, armadura ou acessorio.' };
    }
    const data = all();
    if (!data[userId]) return { ok: false, error: 'Sem perfil.' };
    ensureEquipped(data[userId]);
    const item = data[userId].equipped[s];
    if (!item) return { ok: false, error: `Nada equipado em **${s}**.` };
    data[userId].equipped[s] = null;
    if (!Array.isArray(data[userId].inventory)) data[userId].inventory = [];
    const back = { ...item };
    delete back.equippedAt;
    data[userId].inventory.push(back);
    data[userId].updatedAt = Date.now();
    save(data);
    return { ok: true, slot: s, item: back };
}

function useItem(userId, index1) {
    const inv = getInventory(userId, 'todos');
    const idx = Math.floor(Number(index1) || 0) - 1;
    if (idx < 0 || idx >= inv.length) {
        return { ok: false, error: 'Número inválido. Veja `O.inventario`.' };
    }
    const item = inv[idx];
    const def = item.id ? itemsCatalog.getItemDef(item.id) : null;
    const bookAttr = item.bookAttr || def?.bookAttr || null;
    const classChange = item.classChange || def?.classChange || null;
    const consumable = item.consumable ?? def?.consumable ?? false;
    const cat = itemCategory(item);

    if (equipSlotFor(item) && !consumable && !bookAttr && !classChange) {
        return { ok: false, error: 'equip', item };
    }

    if (!consumable && !bookAttr && !classChange && cat !== 'consumivel' && cat !== 'especial') {
        return { ok: false, error: 'Este item não pode ser usado.' };
    }

    const data = all();
    const raw = data[userId].inventory || [];
    let removed = null;
    if (item.uid) {
        const i = raw.findIndex((x) => x.uid === item.uid);
        if (i >= 0) removed = raw.splice(i, 1)[0];
    }
    if (!removed && idx < raw.length) removed = raw.splice(idx, 1)[0];
    if (!removed) return { ok: false, error: 'Falha ao consumir o item.' };

    const effects = removed.effects || def?.effects || {};
    const result = { ok: true, item: removed, action: 'use', messages: [] };

    if (classChange && CLASSES[classChange]) {
        data[userId].classId = classChange;
        result.action = 'class';
        result.newClass = CLASSES[classChange];
        result.messages.push(
            `Classe alterada para **${CLASSES[classChange].emoji} ${CLASSES[classChange].name}**.`
        );
    }

    if (bookAttr) {
        try {
            const allXp = store.load('xp.json', {});
            const cur = allXp[userId] || { xp: 0, level: 0, attrs: {} };
            if (!cur.attrs) cur.attrs = {};
            cur.attrs[bookAttr] = Math.max(0, Math.floor(Number(cur.attrs[bookAttr] || 0))) + 1;
            allXp[userId] = cur;
            store.save('xp.json', allXp);
            result.action = 'book';
            result.messages.push(`+1 **${bookAttr}** permanente.`);
        } catch (_) {
            result.messages.push('Livro usado, mas falhou ao aplicar atributo.');
        }
    } else if (effects && Object.keys(effects).length && !classChange) {
        try {
            const allXp = store.load('xp.json', {});
            const cur = allXp[userId] || { xp: 0, level: 0, attrs: {} };
            if (!cur.attrs) cur.attrs = {};
            for (const k of ['forca', 'defesa', 'agilidade', 'vida']) {
                if (typeof effects[k] === 'number' && effects[k] > 0) {
                    cur.attrs[k] =
                        Math.max(0, Math.floor(Number(cur.attrs[k] || 0))) +
                        Math.floor(effects[k]);
                    result.messages.push(`+${Math.floor(effects[k])} **${k}**`);
                }
            }
            allXp[userId] = cur;
            store.save('xp.json', allXp);
        } catch (_) {}
        if (!result.messages.length) result.messages.push('Item consumido.');
    } else if (!classChange) {
        result.messages.push('Item consumido.');
    }

    data[userId].updatedAt = Date.now();
    save(data);
    return result;
}

function getEquipmentBonuses(userId) {
    const eq = getEquipped(userId);
    const bonus = { forca: 0, defesa: 0, agilidade: 0, vida: 0, mana: 0 };
    for (const slot of ['arma', 'armadura', 'acessorio']) {
        const it = eq[slot];
        if (!it?.effects || typeof it.effects !== 'object') continue;
        for (const [k, v] of Object.entries(it.effects)) {
            if (typeof v === 'number' && bonus[k] !== undefined) bonus[k] += v;
        }
    }
    return bonus;
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
    removeItemAt,
    rollClassItem,
    getInventory,
    itemCategory,
    maxManaFromLevel,
    listMissing,
    count,
    getEquipped,
    equipItem,
    unequipSlot,
    useItem,
    getEquipmentBonuses,
    equipSlotFor,
    ensureEquipped
};
