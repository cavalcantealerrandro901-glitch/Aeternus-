const store = require('./store');
const itemsCatalog = require('./items');
const crypto = require('crypto');
const classesMod = require('./classes');

const CLASSES = new Proxy(
    {},
    {
        get(_, prop) {
            if (prop === 'toJSON' || prop === Symbol.toStringTag) return undefined;
            return classesMod.allClasses()[prop];
        },
        ownKeys() { return Object.keys(classesMod.allClasses()); },
        getOwnPropertyDescriptor(_, prop) {
            const all = classesMod.allClasses();
            if (prop in all) return { enumerable: true, configurable: true, value: all[prop] };
            return undefined;
        },
        has(_, prop) { return prop in classesMod.allClasses(); }
    }
);

const ITEM_CATEGORIES = [
    { value: 'arma', name: 'Armas' },
    { value: 'armadura', name: 'Armaduras' },
    { value: 'acessorio', name: 'Acessórios' },
    { value: 'consumivel', name: 'Consumíveis' },
    { value: 'especial', name: 'Especiais' },
    { value: 'todos', name: 'Todos' }
];

const CLASS_ITEMS = {
    ceifador_negro: ['foice_grande', 'manto_negro_armadura', 'dado_da_morte'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    l_detetive_arcano: ['bengala_investigador', 'capa_detetive_arcano', 'caderno_deducoes'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean)
};

function all() { return store.load('players.json', {}); }
function save(data) { store.save('players.json', data); }
function has(userId) { const p = all()[userId]; return !!(p && p.name && p.classId); }
function get(userId) { return all()[userId] || null; }
function getClass(classId) { return classesMod.getClass(classId); }

function maxManaFromLevel(level, classId) {
    const lv = Math.max(0, Number(level) || 0);
    const resolved = classesMod.resolveClassId(classId);
    const mult = (resolved && classesMod.getClass(resolved)?.manaMult) || 1;
    return Math.floor((20 + lv * 4) * mult);
}

function create(userId, { name, classId, photoUrl }) {
    const resolved = classesMod.resolveClassId(classId);
    if (!classesMod.getClass(resolved)) throw new Error('Classe inválida');
    const data = all();
    const claim = classesMod.canClaim(resolved, userId, data);
    if (!claim.ok) throw new Error(claim.reason || 'Classe indisponível');
    const profile = {
        userId,
        name: String(name).slice(0, 32),
        classId: resolved,
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
    if (patch && patch.classId != null) {
        const resolved = classesMod.resolveClassId(patch.classId);
        const claim = classesMod.canClaim(resolved, userId, data);
        if (!claim.ok) throw new Error(claim.reason || 'Classe indisponível');
        patch = { ...patch, classId: resolved };
    }
    data[userId] = { ...data[userId], ...patch, updatedAt: Date.now() };
    save(data);
    return data[userId];
}

function getBattleAvatar(userId) {
    const p = get(userId);
    return (p && p.battleAvatar) || null;
}
function setBattleAvatar(userId, avatar) {
    if (!get(userId)) return null;
    const imageUrl = String(avatar.imageUrl || avatar.url || '').trim().slice(0, 800);
    const description = String(avatar.description || avatar.prompt || '').trim().slice(0, 500);
    const sourceUrl = String(avatar.sourceUrl || '').trim().slice(0, 800) || null;
    if (!imageUrl) return null;
    return update(userId, {
        battleAvatar: { type: avatar.type || 'ai3d', description, imageUrl, sourceUrl, updatedAt: Date.now() },
        battlePhotoUrl: imageUrl
    });
}
function getBattlePhoto(userId) {
    const p = get(userId);
    if (!p) return null;
    if (p.battleAvatar && p.battleAvatar.imageUrl) return p.battleAvatar.imageUrl;
    if (p.battlePhotoUrl) return p.battlePhotoUrl;
    return p.photoUrl || null;
}

function addItem(userId, item) {
    const data = all();
    if (!data[userId]) return null;
    if (!Array.isArray(data[userId].inventory)) data[userId].inventory = [];
    const entry = { ...item, uid: item.uid || crypto.randomBytes(6).toString('hex'), gotAt: item.gotAt || Date.now() };
    if (!entry.category) entry.category = itemCategory(entry);
    data[userId].inventory.push(entry);
    data[userId].updatedAt = Date.now();
    save(data);
    return data[userId];
}

function itemCategory(item) {
    if (item?.category) return item.category;
    const def = item?.id ? itemsCatalog.getItemDef(item.id) : null;
    if (def?.category) return def.category;
    const id = String(item?.id || item?.name || '').toLowerCase();
    if (/espada|machado|arco|cajado|adaga|varinha|lanca|bastao|foice|bengala|cetro/.test(id)) return 'arma';
    if (/armadura|elmo|escudo|capa|cinto|botas|peitoral|manto|egide/.test(id)) return 'armadura';
    if (/anel|colar|amuleto|bracelete|selo|orbe|dado|caderno/.test(id)) return 'acessorio';
    if (/pocao|frasco|comida|elixir|veneno|livro/.test(id)) return 'consumivel';
    return 'especial';
}

function rollClassItem(classId) {
    return itemsCatalog.rollDropItem?.(classesMod.resolveClassId(classId || 'guerreiro'));
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
    if (category && category !== 'todos') list = list.filter((it) => String(it.category) === String(category));
    return list;
}

function ensureEquipped(p) {
    if (!p) return { arma: null, armadura: null, acessorio: null };
    if (!p.equipped || typeof p.equipped !== 'object') p.equipped = { arma: null, armadura: null, acessorio: null };
    for (const s of ['arma', 'armadura', 'acessorio']) if (!(s in p.equipped)) p.equipped[s] = null;
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
    if (!data[userId] || !Array.isArray(data[userId].inventory)) return null;
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
    if (idx < 0 || idx >= inv.length) return { ok: false, error: 'Número inválido. Veja `O.inventario`.' };
    const item = inv[idx];
    const slot = equipSlotFor(item);
    if (!slot) return { ok: false, error: 'Este item não pode ser equipado. Use `O.usar` se for consumível/livro.' };
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
    return { ok: true, slot, item: data[userId].equipped[slot], previous: previous || null };
}
function unequipSlot(userId, slot) {
    const s = String(slot || '').toLowerCase();
    if (!['arma', 'armadura', 'acessorio'].includes(s)) return { ok: false, error: 'Slot inválido. Use: arma, armadura ou acessorio.' };
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
    return { ok: false, error: 'Use o comando O.usar para consumíveis.' };
}

/** Bônus de equipamento — mesmas chaves de ATTR_KEYS do combate. */
function getEquipmentBonuses(userId) {
    const eq = getEquipped(userId);
    const bonus = {
        forca: 0, defesa: 0, agilidade: 0, vida: 0,
        inteligencia: 0, sorte: 0, precisao: 0, resistencia: 0,
        dano: 0, critico: 0, mana: 0, manaBonus: 0
    };
    const alias = (k) => {
        if (k === 'vitalidade' || k === 'constituicao') return 'vida';
        if (k === 'espirito') return 'inteligencia';
        if (k === 'crit') return 'critico';
        return k;
    };
    for (const slot of ['arma', 'armadura', 'acessorio']) {
        const it = eq[slot];
        if (!it?.effects || typeof it.effects !== 'object') continue;
        for (const [k0, v] of Object.entries(it.effects)) {
            if (typeof v !== 'number' || !Number.isFinite(v)) continue;
            const k = alias(k0);
            if (bonus[k] !== undefined) bonus[k] += v;
            else if (k === 'manaBonus') bonus.manaBonus += v;
        }
    }
    return bonus;
}

function listMissing(userIds) { return userIds.filter((id) => !has(id)); }
function count() { return Object.keys(all()).filter((id) => has(id)).length; }
function changeClass(userId, classId) {
    const data = all();
    if (!data[userId]) return { ok: false, error: 'Sem perfil.' };
    const resolved = classesMod.resolveClassId(classId);
    const cls = classesMod.getClass(resolved);
    if (!cls) return { ok: false, error: 'Classe inválida.' };
    const claim = classesMod.canClaim(resolved, userId, data);
    if (!claim.ok) return { ok: false, error: claim.reason || 'Classe indisponível.' };
    data[userId].classId = resolved;
    save(data);
    return { ok: true, class: cls };
}

module.exports = {
    CLASSES, changeClass, CLASS_ITEMS, ITEM_CATEGORIES,
    all, save, has, get, getClass, create, update, addItem, removeItemAt,
    rollClassItem, getInventory, itemCategory, maxManaFromLevel, listMissing, count,
    getEquipped, equipItem, unequipSlot, useItem, getEquipmentBonuses, equipSlotFor,
    ensureEquipped, getBattleAvatar, setBattleAvatar, getBattlePhoto
};
