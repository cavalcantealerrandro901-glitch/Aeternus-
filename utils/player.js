const store = require('./store');
const itemsCatalog = require('./items');
const crypto = require('crypto');
const classesMod = require('./classes');

/** Proxy para o novo sistema de classes (classes.js). */
const CLASSES = new Proxy(
    {},
    {
        get(_, prop) {
            if (prop === 'toJSON' || prop === Symbol.toStringTag) return undefined;
            return classesMod.allClasses()[prop];
        },
        ownKeys() {
            return Object.keys(classesMod.allClasses());
        },
        getOwnPropertyDescriptor(_, prop) {
            const all = classesMod.allClasses();
            if (prop in all) return { enumerable: true, configurable: true, value: all[prop] };
            return undefined;
        },
        has(_, prop) {
            return prop in classesMod.allClasses();
        }
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
    cavalheiro_eter: ['espada_aco', 'machado', 'cinto_forca'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    bruxo_ruinas: ['cajado_arcano', 'grimorio', 'orbe_mana'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    cacador_sombras: ['arco_longo', 'aljava', 'botas_vento'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    oraculo_vital: ['cajado_luz', 'pocao_sagrada', 'amuleto_vida'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    berserker_ferro: ['machado', 'espada_aco', 'cinto_forca'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    tecelao_tempestade: ['cajado_arcano', 'orbe_mana', 'grimorio'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    guardiao_runico: ['escudo_ferro', 'armadura_pesada', 'elmo_guerra'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    lamina_fantasma: ['adagas', 'capa_sombra', 'veneno'].map((id) => itemsCatalog.getItemDef(id)).filter(Boolean),
    ceifador_negro: ['foice_grande', 'manto_negro', 'dado_da_morte']
        .map((id) => itemsCatalog.getItemDef(id))
        .filter(Boolean),
    l_detetive_arcano: []
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
    return classesMod.getClass(classId);
}

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

/** Avatar de batalha a partir de imagem transformada (+ expressões na arena). */
function setBattleAvatar(userId, avatar) {
    if (!get(userId)) return null;
    const imageUrl = String(avatar.imageUrl || avatar.url || '').trim().slice(0, 800);
    const description = String(avatar.description || avatar.prompt || '').trim().slice(0, 500);
    const sourceUrl = String(avatar.sourceUrl || '').trim().slice(0, 800) || null;
    if (!imageUrl) return null;
    const clean = {
        type: avatar.type || 'ai3d',
        description,
        imageUrl,
        sourceUrl,
        updatedAt: Date.now()
    };
    return update(userId, {
        battleAvatar: clean,
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
    const entry = {
        ...item,
        uid: item.uid || crypto.randomBytes(6).toString('hex'),
        gotAt: item.gotAt || Date.now()
    };
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
    if (/espada|machado|arco|cajado|adaga|varinha|lanca|bastao/.test(id)) return 'arma';
    if (/armadura|elmo|escudo|capa|cinto|botas|peitoral|manto|egide/.test(id)) return 'armadura';
    if (/anel|colar|amuleto|bracelete|selo|orbe|rel[ií]quia/.test(id)) return 'acessorio';
    if (/pocao|frasco|comida|elixir|veneno|livro/.test(id)) return 'consumivel';
    return 'especial';
}

function rollClassItem(classId) {
    return itemsCatalog.rollDropItem(classesMod.resolveClassId(classId || 'cavalheiro_eter'));
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

    if (classChange) {
        const resolved = classesMod.resolveClassId(classChange);
        const cls = classesMod.getClass(resolved);
        if (!cls) return { ok: false, error: 'Classe inválida.' };
        const claim = classesMod.canClaim(resolved, userId, data);
        if (!claim.ok) return { ok: false, error: claim.reason || 'Classe indisponível.' };
        data[userId].classId = resolved;
        result.action = 'class';
        result.newClass = cls;
        result.messages.push(
            `Classe alterada para **${cls.emoji} ${cls.name}**.`
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
            for (const k of [
                'forca',
                'agilidade',
                'constituicao',
                'inteligencia',
                'espirito',
                'sorte',
                'defesa',
                'vida'
            ]) {
                if (typeof effects[k] === 'number' && effects[k] > 0) {
                    let key = k;
                    if (k === 'defesa' || k === 'vida') key = 'constituicao';
                    cur.attrs[key] =
                        Math.max(0, Math.floor(Number(cur.attrs[key] || 0))) +
                        Math.floor(effects[k]);
                    result.messages.push(`+${Math.floor(effects[k])} **${key}**`);
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
    const bonus = {
        forca: 0,
        agilidade: 0,
        constituicao: 0,
        inteligencia: 0,
        espirito: 0,
        sorte: 0,
        defesa: 0,
        vida: 0,
        mana: 0
    };
    const mapKey = (k) => {
        if (k === 'defesa' || k === 'vida') return 'constituicao';
        return k;
    };
    for (const slot of ['arma', 'armadura', 'acessorio']) {
        const it = eq[slot];
        if (!it?.effects || typeof it.effects !== 'object') continue;
        for (const [k0, v] of Object.entries(it.effects)) {
            if (typeof v !== 'number') continue;
            const k = mapKey(k0);
            if (bonus[k] !== undefined) bonus[k] += v;
            if (k0 === 'defesa' || k0 === 'vida') {
                bonus.defesa += v;
                bonus.vida += v;
            }
            if (k0 === 'mana') bonus.mana += v;
        }
    }
    if (bonus.constituicao) {
        bonus.defesa = Math.max(bonus.defesa, bonus.constituicao);
        bonus.vida = Math.max(bonus.vida, bonus.constituicao);
    }
    return bonus;
}

function listMissing(userIds) {
    return userIds.filter((id) => !has(id));
}

function count() {
    return Object.keys(all()).filter((id) => has(id)).length;
}

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
    CLASSES,
    changeClass,
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
    ensureEquipped,
    getBattleAvatar,
    setBattleAvatar,
    getBattlePhoto
};
