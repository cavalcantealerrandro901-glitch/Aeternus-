const store = require('./store');
const itemsCatalog = require('./items');
const crypto = require('crypto');
const classesMod = require('./classes');

const INVENTORY_BASE_CAPACITY = 10;
const INVENTORY_LEVEL_STEP = 20;
const INVENTORY_CAPACITY_STEP = 5;
const SELL_VALUES = { comum:30000, incomum:75000, raro:150000, epico:300000, lendario:750000, lendaria:750000, mitico:1500000, mitica:1500000, cosmico:3000000, cosmica:3000000, unica:5000000 };

const CLASSES = new Proxy({}, {
    get(_, prop) { if (prop === 'toJSON' || prop === Symbol.toStringTag) return undefined; return classesMod.allClasses()[prop]; },
    ownKeys() { return Object.keys(classesMod.allClasses()); },
    getOwnPropertyDescriptor(_, prop) { const all = classesMod.allClasses(); if (prop in all) return { enumerable: true, configurable: true, value: all[prop] }; return undefined; },
    has(_, prop) { return prop in classesMod.allClasses(); }
});

const ITEM_CATEGORIES = [
    { value: 'arma', name: 'Armas' },
    { value: 'armadura', name: 'Armaduras' },
    { value: 'acessorio', name: 'Acessórios' },
    { value: 'consumivel', name: 'Consumíveis' },
    { value: 'especial', name: 'Especiais' },
    { value: 'todos', name: 'Todos' }
];

const CLASS_ITEMS = Object.fromEntries(
    Object.values(classesMod.allClasses())
        .filter((cls) => cls && cls.id)
        .map((cls) => [cls.id, itemsCatalog.listItems({ classId: cls.id })])
);

function all() { return store.load('players.json', {}); }
function save(data) { store.save('players.json', data); }
function has(userId) { const p = all()[userId]; return !!(p && p.name && p.classId); }
function get(userId) { return all()[userId] || null; }
function getClass(classId) { return classesMod.getClass(classId); }

function safeResolveClassId(classId) {
    if (typeof classesMod.resolveClassId === 'function') return classesMod.resolveClassId(classId) || classId || 'guerreiro';
    const id = String(classId || 'guerreiro').trim() || 'guerreiro';
    return classesMod.getClass(id) ? id : 'guerreiro';
}

function getPlayerLevel(userId) { try { const xp=require('./xp'); return Math.max(1, Number(xp.get(userId)?.level)||1); } catch (_) { return 1; } }
function getInventoryCapacity(userId) { const level=getPlayerLevel(userId); return INVENTORY_BASE_CAPACITY + Math.floor(Math.max(0,level-1)/INVENTORY_LEVEL_STEP)*INVENTORY_CAPACITY_STEP; }
function getInventoryUsed(userId) { return normalizeInventory(userId).length; }
function getInventorySpace(userId) { return Math.max(0, getInventoryCapacity(userId) - getInventoryUsed(userId)); }
function getSellValue(item) { const rarity = String(item?.rarity||'comum').toLowerCase(); return SELL_VALUES[rarity]||SELL_VALUES.comum; }
function isStackable(item) { return !!(item && (item.stackable || item.category === 'consumivel' || item.category === 'material')); }

function maxManaFromLevel(level, classId) {
    const lv = Math.max(0, Number(level) || 0);
    let base = 20 + lv * 4;
    try {
        const cls = getClass(classId);
        if (cls && Number(cls.manaBonus)) base = Math.floor(base * (1 + Number(cls.manaBonus)));
    } catch (_) {}
    return base;
}

function create(userId, { name, classId, photoUrl } = {}) {
    const data = all();
    if (data[userId] && data[userId].name && data[userId].classId) return data[userId];
    let resolved = safeResolveClassId(classId);
    if (classId) {
        const claim = typeof classesMod.canClaim === 'function' ? classesMod.canClaim(resolved, userId, data) : { ok: true };
        if (!claim.ok) throw new Error(claim.reason || 'Classe indisponível');
    }
    const profile = { userId, name: String(name || 'Aventureiro').slice(0, 32), classId: resolved, photoUrl: photoUrl || null, inventory: [], equipped: { arma: null, armadura: null, acessorio: null }, materials: {}, createdAt: Date.now(), updatedAt: Date.now() };
    data[userId] = profile; save(data); return profile;
}

function update(userId, patch) {
    const data = all();
    if (!data[userId]) return null;
    if (patch && patch.classId != null) {
        if (data[userId].classId) {
            return null;
        }
        const resolved = safeResolveClassId(patch.classId);
        const claim = typeof classesMod.canClaim === 'function' ? classesMod.canClaim(resolved, userId, data) : { ok: true };
        if (!claim.ok) throw new Error(claim.reason || 'Classe indisponível');
        patch = { ...patch, classId: resolved };
    }
    data[userId] = { ...data[userId], ...patch, updatedAt: Date.now() }; save(data); return data[userId];
}

function getBattleAvatar(userId) { const p = get(userId); return (p && p.battleAvatar) || null; }
function setBattleAvatar(userId, avatar) {
    const data = all();
    if (!data[userId]) return null;
    data[userId].battleAvatar = avatar;
    data[userId].updatedAt = Date.now();
    save(data);
    return data[userId].battleAvatar;
}
function getBattlePhoto(userId) { const p = get(userId); if (!p) return null; if (p.battleAvatar?.imageUrl) return p.battleAvatar.imageUrl; if (p.battlePhotoUrl) return p.battlePhotoUrl; return p.photoUrl || null; }

function normalizeInventory(userId) {
    const p = get(userId);
    if (!p) return [];
    if (!Array.isArray(p.inventory)) return [];
    return p.inventory.filter(Boolean);
}

function addItem(userId, item, quantity = 1) {
    const data = all();
    if (!data[userId]) return { ok: false, error: 'Sem perfil.' };
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!data[userId].inventory) data[userId].inventory = [];
    const inv = data[userId].inventory;
    const cap = getInventoryCapacity(userId);
    if (inv.length >= cap && !isStackable(item)) return { ok: false, error: 'Inventário cheio.' };
    if (isStackable(item)) {
        const existing = inv.find((x) => x && x.id === item.id);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + qty;
            data[userId].updatedAt = Date.now();
            save(data);
            return { ok: true, item: existing };
        }
    }
    if (inv.length >= cap) return { ok: false, error: 'Inventário cheio.' };
    const entry = { ...item, quantity: qty };
    inv.push(entry);
    data[userId].updatedAt = Date.now();
    save(data);
    return { ok: true, item: entry };
}

function sellItem(userId, index1, quantity) {
    const data = all();
    const p = data[userId];
    if (!p || !Array.isArray(p.inventory)) return { ok: false, error: 'Sem inventário.' };
    const idx = Math.floor(Number(index1) || 0) - 1;
    if (idx < 0 || idx >= p.inventory.length) return { ok: false, error: 'Item não encontrado.' };
    const stack = p.inventory[idx];
    const q = quantity == null ? (stack.quantity || 1) : Math.floor(Number(quantity) || 0);
    if (q <= 0) return { ok: false, error: 'Quantidade inválida.' };
    const have = stack.quantity || 1;
    if (q > have) return { ok: false, error: 'Quantidade maior que o estoque.' };
    const unit = getSellValue(stack);
    const total = unit * q;
    if (q >= have) p.inventory.splice(idx, 1);
    else stack.quantity = have - q;
    p.updatedAt = Date.now();
    save(data);
    return { ok: true, total, item: stack, quantity: q };
}

function itemCategory(item) {
    if (!item) return 'especial';
    if (item.category) return item.category;
    return 'especial';
}

function rollClassItem(classId) { return itemsCatalog.rollDropItem?.(safeResolveClassId(classId || 'guerreiro')); }

function getInventory(userId, category) {
    const inv = normalizeInventory(userId);
    if (!category || category === 'todos') return inv;
    return inv.filter((it) => itemCategory(it) === category);
}

function ensureEquipped(p) {
    if (!p.equipped || typeof p.equipped !== 'object') p.equipped = { arma: null, armadura: null, acessorio: null };
    for (const s of ['arma', 'armadura', 'acessorio']) if (!(s in p.equipped)) p.equipped[s] = null;
    return p.equipped;
}

function getEquipped(userId) { const p = get(userId); if (!p) return { arma: null, armadura: null, acessorio: null }; return { ...ensureEquipped(p) }; }
function equipSlotFor(item) { const cat = itemCategory(item); if (cat === 'arma') return 'arma'; if (cat === 'armadura') return 'armadura'; if (cat === 'acessorio') return 'acessorio'; return null; }

function removeItemAt(userId, index0) {
    const data = all();
    const p = data[userId];
    if (!p || !Array.isArray(p.inventory)) return null;
    if (index0 < 0 || index0 >= p.inventory.length) return null;
    const [removed] = p.inventory.splice(index0, 1);
    p.updatedAt = Date.now();
    save(data);
    return removed;
}

function equipItem(userId, index1) {
    const data = all();
    const p = data[userId];
    if (!p) return { ok: false, error: 'Sem perfil.' };
    ensureEquipped(p);
    const raw = Array.isArray(p.inventory) ? p.inventory : [];
    const rawIndex = Math.floor(Number(index1) || 0) - 1;
    if (rawIndex < 0 || rawIndex >= raw.length) return { ok: false, error: 'Não foi possível remover o item do inventário.' };
    const stack = raw[rawIndex]; const removed = { ...stack, quantity: 1 };
    const slot = equipSlotFor(removed);
    if (!slot) return { ok: false, error: 'Este item não pode ser equipado.' };
    const previous = p.equipped[slot];
    if ((stack.quantity || 1) <= 1) raw.splice(rawIndex, 1);
    else stack.quantity = (stack.quantity || 1) - 1;
    data[userId].equipped[slot] = { ...removed, equippedAt: Date.now() };
    if (previous) {
        const back = { ...previous }; delete back.equippedAt;
        raw.push(back);
    }
    p.updatedAt = Date.now();
    save(data);
    return { ok: true, item: removed, slot, previous };
}

function unequipSlot(userId, slot) {
    const data = all();
    const p = data[userId];
    if (!p) return { ok: false, error: 'Sem perfil.' };
    ensureEquipped(p);
    const item = p.equipped[slot];
    if (!item) return { ok: false, error: 'Nada equipado neste slot.' };
    if (!Array.isArray(p.inventory)) p.inventory = [];
    if (p.inventory.length >= getInventoryCapacity(userId)) return { ok: false, error: 'Inventário cheio.' };
    const back = { ...item }; delete back.equippedAt;
    p.inventory.push(back);
    p.equipped[slot] = null;
    p.updatedAt = Date.now();
    save(data);
    return { ok: true, item: back, slot };
}

function useItem(userId, index1) { return { ok: false, error: 'Use o comando O.usar para consumíveis.' }; }

function getEquipmentBonuses(userId) {
    const eq = getEquipped(userId);
    const bonuses = {};
    for (const slot of Object.keys(eq)) {
        const it = eq[slot];
        if (!it || !it.effects) continue;
        for (const [k, v] of Object.entries(it.effects)) {
            bonuses[k] = (bonuses[k] || 0) + Number(v || 0);
        }
    }
    return bonuses;
}

function listMissing(userIds) { return userIds.filter((id) => !has(id)); }
function count() { return Object.keys(all()).filter((id) => has(id)).length; }
function changeClass(userId, classId) {
    const data = all();
    if (!data[userId]) return { ok: false, error: 'Sem perfil.' };
    const resolved = safeResolveClassId(classId);
    const cls = getClass(resolved);
    if (!cls) return { ok: false, error: 'Classe inválida.' };
    const claim = typeof classesMod.canClaim === 'function' ? classesMod.canClaim(resolved, userId, data) : { ok: true };
    if (!claim.ok) return { ok: false, error: claim.reason || 'Classe indisponível.' };
    data[userId].classId = resolved; save(data); return { ok: true, class: cls };
}

function remove(userId) {
    const data = all();
    if (!data[userId]) return { ok: false, error: 'Perfil não encontrado.' };
    const snapshot = { ...data[userId] };
    delete data[userId];
    save(data);
    try {
        const xp = require('./xp');
        if (typeof xp.remove === 'function') {
            xp.remove(userId);
        } else {
            const xd = typeof xp.all === 'function' ? xp.all() : null;
            if (xd && xd[userId]) {
                delete xd[userId];
                store.save('xp.json', xd);
            }
        }
    } catch (_) {}
    return { ok: true, profile: snapshot };
}

module.exports = {
    CLASSES, changeClass, remove, CLASS_ITEMS, ITEM_CATEGORIES, all, save, has, get, getClass, create, update, addItem, sellItem, getSellValue, getInventoryCapacity, getInventoryUsed, getInventorySpace, removeItemAt,
    rollClassItem, getInventory, itemCategory, maxManaFromLevel, listMissing, count, getEquipped, equipItem, unequipSlot, useItem, getEquipmentBonuses, equipSlotFor,
    ensureEquipped, normalizeInventory, getBattleAvatar, setBattleAvatar, getBattlePhoto, isStackable
};
