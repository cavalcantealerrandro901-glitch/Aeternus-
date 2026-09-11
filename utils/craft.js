const store = require('./store');
const player = require('./player');
const xp = require('./xp');
const items = require('./items');

const CRAFT_CD_MS = 24 * 60 * 60 * 1000;

function craftMeta() {
    return store.load('craftMeta.json', {});
}

function saveCraftMeta(d) {
    store.save('craftMeta.json', d);
}

function lastLegendaryCraft(userId) {
    return Number(craftMeta()[userId]?.lastLegendary || 0);
}

function setLegendaryCraft(userId) {
    const d = craftMeta();
    if (!d[userId]) d[userId] = {};
    d[userId].lastLegendary = Date.now();
    saveCraftMeta(d);
}

function materialsOf(userId) {
    const p = player.get(userId);
    if (!p) return {};
    const m = p.materials && typeof p.materials === 'object' ? { ...p.materials } : {};
    for (const k of Object.keys(m)) m[k] = Math.max(0, Math.floor(Number(m[k]) || 0));
    return m;
}

function setMaterials(userId, mat) {
    return player.update(userId, { materials: mat });
}

function addMaterials(userId, gains) {
    const m = materialsOf(userId);
    for (const [k, v] of Object.entries(gains || {})) {
        const n = Math.floor(Number(v) || 0);
        if (n <= 0) continue;
        m[k] = (m[k] || 0) + n;
    }
    setMaterials(userId, m);
    return m;
}

function removeMaterials(userId, cost) {
    const m = materialsOf(userId);
    for (const [k, v] of Object.entries(cost || {})) {
        const need = Math.floor(Number(v) || 0);
        if ((m[k] || 0) < need) return { ok: false, missing: k, have: m[k] || 0, need };
    }
    for (const [k, v] of Object.entries(cost || {})) {
        m[k] = Math.max(0, (m[k] || 0) - Math.floor(Number(v) || 0));
    }
    setMaterials(userId, m);
    return { ok: true, materials: m };
}

function hasMaterials(userId, cost) {
    const m = materialsOf(userId);
    const missing = [];
    for (const [k, v] of Object.entries(cost || {})) {
        const need = Math.floor(Number(v) || 0);
        const have = m[k] || 0;
        if (have < need) {
            const def = items.getMaterialDef(k);
            missing.push({
                id: k,
                name: def?.name || k,
                emoji: def?.emoji || '📦',
                have,
                need
            });
        }
    }
    return { ok: !missing.length, missing, materials: m };
}

function findInventoryItem(userId, pred) {
    const p = player.get(userId);
    if (!p || !Array.isArray(p.inventory)) return { index: -1, item: null };
    const index = p.inventory.findIndex(pred);
    return { index, item: index >= 0 ? p.inventory[index] : null };
}

function removeInventoryAt(userId, index) {
    const data = player.all();
    const p = data[userId];
    if (!p || !Array.isArray(p.inventory) || index < 0 || index >= p.inventory.length) return null;
    const [removed] = p.inventory.splice(index, 1);
    p.updatedAt = Date.now();
    player.save(data);
    return removed;
}

function canCraft(userId, recipeId) {
    const recipe = items.getRecipe(recipeId);
    if (!recipe) return { ok: false, error: 'Receita não encontrada.' };

    const profile = player.get(userId);
    if (!profile?.name) return { ok: false, error: 'Crie um personagem com `O.j criar`.' };

    const st = xp.get(userId);
    if (st.level < (recipe.minLevel || 1)) {
        return {
            ok: false,
            error: `Nível mínimo: **${recipe.minLevel}** (você: ${st.level}).`
        };
    }

    if (recipe.needClass && profile.classId !== recipe.needClass) {
        return {
            ok: false,
            error: `Esta receita é exclusiva da classe **${recipe.needClass}**.`
        };
    }

    const resultDef = items.getItemDef(recipe.result);
    if (resultDef?.rarity === 'lendario') {
        const last = lastLegendaryCraft(userId);
        const left = CRAFT_CD_MS - (Date.now() - last);
        if (left > 0) {
            const h = Math.ceil(left / 3600000);
            return { ok: false, error: `Craft lendário em cooldown (~${h}h restantes).` };
        }
    }

    const matCheck = hasMaterials(userId, recipe.cost);
    if (!matCheck.ok) {
        const lines = matCheck.missing
            .map((x) => `${x.emoji} ${x.name}: ${x.have}/${x.need}`)
            .join('\n');
        return { ok: false, error: `Materiais insuficientes:\n${lines}` };
    }

    if (recipe.needItemId) {
        const found = findInventoryItem(
            userId,
            (it) => String(it.id) === String(recipe.needItemId)
        );
        if (found.index < 0) {
            const def = items.getItemDef(recipe.needItemId);
            return {
                ok: false,
                error: `Falta o item base: **${def?.emoji || ''} ${def?.name || recipe.needItemId}**.`
            };
        }
    } else if (recipe.needItemRarity) {
        const found = findInventoryItem(
            userId,
            (it) =>
                String(it.rarity || '') === recipe.needItemRarity &&
                (!recipe.needClass || it.classId === recipe.needClass)
        );
        if (found.index < 0) {
            return {
                ok: false,
                error: `Falta um item **${recipe.needItemRarity}** da classe no inventário (será consumido).`
            };
        }
    }

    return { ok: true, recipe, profile, level: st.level, resultDef };
}

function doCraft(userId, recipeId) {
    const check = canCraft(userId, recipeId);
    if (!check.ok) return check;

    const { recipe, resultDef } = check;

    // consome item base
    if (recipe.needItemId) {
        const found = findInventoryItem(
            userId,
            (it) => String(it.id) === String(recipe.needItemId)
        );
        if (found.index >= 0) removeInventoryAt(userId, found.index);
    } else if (recipe.needItemRarity) {
        const found = findInventoryItem(
            userId,
            (it) =>
                String(it.rarity || '') === recipe.needItemRarity &&
                (!recipe.needClass || it.classId === recipe.needClass)
        );
        if (found.index >= 0) removeInventoryAt(userId, found.index);
    }

    const rm = removeMaterials(userId, recipe.cost);
    if (!rm.ok) return { ok: false, error: 'Falha ao consumir materiais.' };

    const failChance = Number(recipe.failChance || 0);
    if (failChance > 0 && Math.random() < failChance) {
        // devolve 1 fragmento de éter se tinha no custo
        if (recipe.cost.fragmento_eter) {
            addMaterials(userId, { fragmento_eter: 1 });
        }
        return {
            ok: true,
            failed: true,
            message: 'O craft falhou, mas o Éter resistiu (1 Fragmento de Éter devolvido).'
        };
    }

    const crafted = items.instantiateItem(recipe.result);
    if (!crafted) return { ok: false, error: 'Item de resultado inválido.' };

    player.addItem(userId, crafted);

    if (resultDef?.rarity === 'lendario') setLegendaryCraft(userId);

    return { ok: true, failed: false, item: crafted, recipe };
}

function doSalvage(userId, invIndex) {
    const profile = player.get(userId);
    if (!profile?.name) return { ok: false, error: 'Sem perfil de jogador.' };
    const inv = Array.isArray(profile.inventory) ? profile.inventory : [];
    const idx = Math.floor(Number(invIndex) - 1);
    if (idx < 0 || idx >= inv.length) return { ok: false, error: 'Índice inválido. Use o número do `O.inventario`.' };

    const item = inv[idx];
    if (String(item.rarity) === 'lendario') {
        return { ok: false, error: 'Itens lendários não podem ser desmontados.' };
    }

    const yieldMat = items.salvageYield(item);
    if (!yieldMat) return { ok: false, error: 'Este item não pode ser desmontado.' };

    removeInventoryAt(userId, idx);
    const clean = {};
    for (const [k, v] of Object.entries(yieldMat)) {
        if (v > 0) clean[k] = v;
    }
    addMaterials(userId, clean);

    return { ok: true, item, materials: clean };
}

function onLevelUp(userId, classId, level) {
    const gains = items.rollLevelMaterials(level);
    if (classId && items.ESSENCE_BY_CLASS[classId] && Math.random() < 0.2) {
        gains[items.ESSENCE_BY_CLASS[classId]] = (gains[items.ESSENCE_BY_CLASS[classId]] || 0) + 1;
    }
    addMaterials(userId, gains);
    return gains;
}

module.exports = {
    materialsOf,
    addMaterials,
    removeMaterials,
    hasMaterials,
    canCraft,
    doCraft,
    doSalvage,
    onLevelUp,
    lastLegendaryCraft,
    CRAFT_CD_MS
};
