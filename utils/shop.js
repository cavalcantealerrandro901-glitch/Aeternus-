const store = require('./store');
const flocos = require('./flocos');
const cristais = require('./cristais');
const { getSettings } = require('./settings');

/** Catálogo global (decorações + itens). VIP vem do painel por servidor. */
const GLOBAL_ITEMS = [
    // ── Decorações (fundo do perfil gerado pelo bot) ───────────────
    {
        id: 'dec_aurora',
        type: 'decoration',
        name: 'Aurora Violeta',
        desc: 'Fundo aurora no card de perfil',
        price: 2500,
        currency: 'cristais',
        theme: { bg1: '#1a0b2e', bg2: '#2d1b69', accent: '#c084fc', name: 'AURORA' }
    },
    {
        id: 'dec_gelo',
        type: 'decoration',
        name: 'Campo de Gelo',
        desc: 'Fundo glacial no perfil',
        price: 2500,
        currency: 'cristais',
        theme: { bg1: '#0c1929', bg2: '#0e7490', accent: '#67e8f9', name: 'GELO' }
    },
    {
        id: 'dec_ouro',
        type: 'decoration',
        name: 'Ouro Real',
        desc: 'Fundo dourado premium',
        price: 5000,
        currency: 'cristais',
        theme: { bg1: '#1c1408', bg2: '#854d0e', accent: '#fbbf24', name: 'OURO' }
    },
    {
        id: 'dec_neon',
        type: 'decoration',
        name: 'Neon Cyber',
        desc: 'Fundo neon futurista',
        price: 3500,
        currency: 'cristais',
        theme: { bg1: '#0a0a12', bg2: '#3b0764', accent: '#f0abfc', name: 'NEON' }
    },
    {
        id: 'dec_rosa',
        type: 'decoration',
        name: 'Rosa Mística',
        desc: 'Fundo rosa elegante',
        price: 3000,
        currency: 'cristais',
        theme: { bg1: '#1a0a12', bg2: '#9d174d', accent: '#fb7185', name: 'ROSA' }
    },
    {
        id: 'dec_floresta',
        type: 'decoration',
        name: 'Floresta Arcana',
        desc: 'Fundo verde místico',
        price: 2800,
        currency: 'cristais',
        theme: { bg1: '#052e16', bg2: '#14532d', accent: '#4ade80', name: 'FLORESTA' }
    },
    // ── Itens ───────────────────────────────────────────────────────
    {
        id: 'item_titulo_lenda',
        type: 'item',
        name: 'Título: Lenda',
        desc: 'Exibe o título «Lenda» no perfil',
        price: 15000,
        currency: 'flocos',
        title: 'Lenda'
    },
    {
        id: 'item_titulo_astro',
        type: 'item',
        name: 'Título: Astro',
        desc: 'Exibe o título «Astro» no perfil',
        price: 25000,
        currency: 'flocos',
        title: 'Astro'
    },
    {
        id: 'item_titulo_soberano',
        type: 'item',
        name: 'Título: Soberano',
        desc: 'Exibe o título «Soberano» no perfil',
        price: 8000,
        currency: 'cristais',
        title: 'Soberano'
    },
    {
        id: 'item_boost_daily',
        type: 'item',
        name: 'Boost Daily +20%',
        desc: 'Multiplicador +20% no próximo daily (1 uso)',
        price: 4000,
        currency: 'cristais',
        consumable: true,
        effect: 'daily_boost_20'
    },
    {
        id: 'item_caixa_flocos',
        type: 'item',
        name: 'Caixa de Flocos',
        desc: 'Recebe 10k–40k flocos na hora',
        price: 3000,
        currency: 'cristais',
        consumable: true,
        effect: 'box_flocos'
    }
];

function invAll() {
    return store.load('inventory.json', {});
}

function getInv(userId) {
    const d = invAll()[userId] || {};
    return {
        owned: Array.isArray(d.owned) ? d.owned : [],
        equipped: d.equipped || { decoration: null, title: null },
        effects: d.effects || {}
    };
}

function saveInv(userId, inv) {
    const all = invAll();
    all[userId] = inv;
    store.save('inventory.json', all);
}

function guildVips(guildId) {
    const s = getSettings(guildId);
    const list = Array.isArray(s.shop?.vips) ? s.shop.vips : [];
    return list
        .filter((v) => v && v.id && v.name && v.roleId)
        .map((v) => ({
            id: String(v.id),
            type: 'vip',
            name: String(v.name),
            desc: String(v.desc || 'Cargo VIP do servidor'),
            price: Math.max(0, Math.floor(Number(v.price) || 0)),
            currency: v.currency === 'flocos' ? 'flocos' : 'cristais',
            roleId: String(v.roleId),
            durationDays: Math.max(0, Math.floor(Number(v.durationDays) || 0)) // 0 = permanente
        }));
}

function catalog(guildId) {
    return [...GLOBAL_ITEMS, ...guildVips(guildId)];
}

function findItem(guildId, itemId) {
    return catalog(guildId).find((i) => i.id === itemId) || null;
}

function owns(userId, itemId) {
    return getInv(userId).owned.includes(itemId);
}

function buy(userId, guildId, itemId) {
    const item = findItem(guildId, itemId);
    if (!item) return { ok: false, error: 'Item não encontrado.' };

    const inv = getInv(userId);
    if (!item.consumable && inv.owned.includes(itemId)) {
        return { ok: false, error: 'Você já possui este item.' };
    }

    const bal = item.currency === 'flocos' ? flocos.get(userId) : cristais.get(userId);
    if (bal < item.price) {
        return {
            ok: false,
            error: `Saldo insuficiente. Precisa de ${item.price.toLocaleString('pt-BR')} ${item.currency === 'flocos' ? '❄️' : '💠'}.`
        };
    }

    if (item.currency === 'flocos') {
        flocos.remove(userId, item.price, { reason: `loja:${item.id}` });
    } else {
        cristais.remove(userId, item.price);
    }

    if (item.consumable) {
        // aplica efeito imediato
        if (item.effect === 'box_flocos') {
            const gain = 10000 + Math.floor(Math.random() * 30001);
            flocos.add(userId, gain, { reason: 'caixa loja' });
            return { ok: true, item, consumed: true, gain };
        }
        if (item.effect === 'daily_boost_20') {
            inv.effects.dailyBoostUntil = Date.now() + 864e5;
            inv.effects.dailyBoostPct = 20;
            saveInv(userId, inv);
            return { ok: true, item, consumed: true, boost: 20 };
        }
        return { ok: true, item, consumed: true };
    }

    if (!inv.owned.includes(itemId)) inv.owned.push(itemId);

    // auto-equip decoração / título
    if (item.type === 'decoration') inv.equipped.decoration = itemId;
    if (item.title) inv.equipped.title = itemId;

    saveInv(userId, inv);
    return { ok: true, item, inv };
}

function equip(userId, itemId) {
    const inv = getInv(userId);
    if (!inv.owned.includes(itemId)) return { ok: false, error: 'Você não possui este item.' };
    const item = GLOBAL_ITEMS.find((i) => i.id === itemId);
    if (!item) return { ok: false, error: 'Só decorações/itens globais podem ser equipados assim.' };
    if (item.type === 'decoration') inv.equipped.decoration = itemId;
    if (item.title) inv.equipped.title = itemId;
    saveInv(userId, inv);
    return { ok: true, inv, item };
}

function getEquippedTheme(userId) {
    const inv = getInv(userId);
    const decId = inv.equipped?.decoration;
    const item = GLOBAL_ITEMS.find((i) => i.id === decId);
    return item?.theme || { bg1: '#0f172a', bg2: '#1e1b4b', accent: '#a78bfa', name: 'PADRÃO' };
}

function getEquippedTitle(userId) {
    const inv = getInv(userId);
    const tId = inv.equipped?.title;
    const item = GLOBAL_ITEMS.find((i) => i.id === tId);
    return item?.title || null;
}

function getDailyBoost(userId) {
    const inv = getInv(userId);
    if (inv.effects?.dailyBoostUntil > Date.now()) {
        return Number(inv.effects.dailyBoostPct || 0);
    }
    return 0;
}

module.exports = {
    GLOBAL_ITEMS,
    catalog,
    findItem,
    buy,
    equip,
    owns,
    getInv,
    getEquippedTheme,
    getEquippedTitle,
    getDailyBoost,
    guildVips
};
