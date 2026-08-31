const store = require('./store');
const flocos = require('./flocos');
const cristais = require('./cristais');
const { getSettings } = require('./settings');

const DECORATIONS = [
    {
        id: 'dec_aurora',
        type: 'decoration',
        name: 'Aurora Violeta',
        desc: 'Céu aurora violeta cinematográfico',
        price: 2200,
        currency: 'cristais',
        prompt: 'cinematic purple aurora borealis night sky, stars, soft glow, profile banner art, no text, high quality'
    },
    {
        id: 'dec_gelo',
        type: 'decoration',
        name: 'Campo de Gelo',
        desc: 'Paisagem glacial azul',
        price: 2400,
        currency: 'cristais',
        prompt: 'frozen ice landscape, blue crystal mountains, soft light, aesthetic banner, no text'
    },
    {
        id: 'dec_ouro',
        type: 'decoration',
        name: 'Palácio de Ouro',
        desc: 'Luxo dourado premium',
        price: 5200,
        currency: 'cristais',
        prompt: 'luxury golden palace interior, warm light, elegant marble, premium aesthetic, no text'
    },
    {
        id: 'dec_neon',
        type: 'decoration',
        name: 'Cidade Neon',
        desc: 'Cyberpunk noturno',
        price: 3800,
        currency: 'cristais',
        prompt: 'cyberpunk neon city night rain, pink purple lights, cinematic banner, no text'
    },
    {
        id: 'dec_rosa',
        type: 'decoration',
        name: 'Jardim Rosa',
        desc: 'Flores e névoa rosa',
        price: 3000,
        currency: 'cristais',
        prompt: 'mystical rose garden fog soft pink light aesthetic banner, no text'
    },
    {
        id: 'dec_floresta',
        type: 'decoration',
        name: 'Floresta Arcana',
        desc: 'Bosque mágico verde',
        price: 2800,
        currency: 'cristais',
        prompt: 'enchanted green forest glowing particles magical atmosphere banner, no text'
    },
    {
        id: 'dec_oceano',
        type: 'decoration',
        name: 'Oceano Profundo',
        desc: 'Abismo azul com luz',
        price: 3100,
        currency: 'cristais',
        prompt: 'deep ocean underwater light rays blue aesthetic cinematic banner, no text'
    },
    {
        id: 'dec_espaco',
        type: 'decoration',
        name: 'Nebulosa',
        desc: 'Espaço sideral colorido',
        price: 4500,
        currency: 'cristais',
        prompt: 'colorful space nebula stars cosmic dust epic banner art, no text'
    },
    {
        id: 'dec_sakura',
        type: 'decoration',
        name: 'Sakura',
        desc: 'Cerejeiras ao entardecer',
        price: 3300,
        currency: 'cristais',
        prompt: 'cherry blossom sakura sunset japanese aesthetic soft banner, no text'
    },
    {
        id: 'dec_vulcao',
        type: 'decoration',
        name: 'Vulcão',
        desc: 'Lava e fumaça dramática',
        price: 4100,
        currency: 'cristais',
        prompt: 'volcano lava dramatic sky dark cinematic banner, no text'
    }
];

const ITEMS = [
    {
        id: 'item_titulo_lenda',
        type: 'item',
        name: 'Título: Lenda',
        desc: 'Título «Lenda» no perfil',
        price: 15000,
        currency: 'flocos',
        title: 'Lenda',
        icon: '👑'
    },
    {
        id: 'item_titulo_astro',
        type: 'item',
        name: 'Título: Astro',
        desc: 'Título «Astro» no perfil',
        price: 25000,
        currency: 'flocos',
        title: 'Astro',
        icon: '⭐'
    },
    {
        id: 'item_titulo_soberano',
        type: 'item',
        name: 'Título: Soberano',
        desc: 'Título «Soberano» no perfil',
        price: 8000,
        currency: 'cristais',
        title: 'Soberano',
        icon: '🏰'
    },
    {
        id: 'item_boost_daily',
        type: 'item',
        name: 'Boost Daily +20%',
        desc: 'Boost no daily por 24h',
        price: 4000,
        currency: 'cristais',
        consumable: true,
        effect: 'daily_boost_20',
        icon: '⚡'
    },
    {
        id: 'item_caixa_flocos',
        type: 'item',
        name: 'Caixa de Flocos',
        desc: '10k–40k flocos na hora',
        price: 3000,
        currency: 'cristais',
        consumable: true,
        effect: 'box_flocos',
        icon: '📦'
    },
    {
        id: 'item_titulo_eterno',
        type: 'item',
        name: 'Título: Eterno',
        desc: 'Título «Eterno» no perfil',
        price: 12000,
        currency: 'cristais',
        title: 'Eterno',
        icon: '♾️'
    },
    {
        id: 'item_caixa_cristal',
        type: 'item',
        name: 'Caixa de Cristais',
        desc: '800–2500 cristais na hora',
        price: 18000,
        currency: 'flocos',
        consumable: true,
        effect: 'box_cristais',
        icon: '💎'
    }
];

const GLOBAL_ITEMS = [...DECORATIONS, ...ITEMS];

function imageUrl(item) {
    if (!item?.prompt) return null;
    const q = encodeURIComponent(item.prompt);
    const seed = [...String(item.id)].reduce((a, c) => a + c.charCodeAt(0), 0);
    return `https://image.pollinations.ai/prompt/${q}?width=960&height=540&nologo=true&seed=${seed}&model=flux`;
}

function withImages(list) {
    return list.map((i) => ({
        ...i,
        image: i.type === 'decoration' ? imageUrl(i) : i.image || null
    }));
}

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
            durationDays: Math.max(0, Math.floor(Number(v.durationDays) || 0)),
            icon: '👑'
        }));
}

function decorations() {
    return withImages(DECORATIONS);
}

function items(guildId) {
    return [...ITEMS.map((i) => ({ ...i })), ...guildVips(guildId || null)];
}

function catalog(guildId) {
    return [...withImages(GLOBAL_ITEMS), ...guildVips(guildId)];
}

function findItem(guildId, itemId) {
    return catalog(guildId).find((i) => i.id === itemId) || null;
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
        if (item.effect === 'box_flocos') {
            const gain = 10000 + Math.floor(Math.random() * 30001);
            flocos.add(userId, gain, { reason: 'caixa loja' });
            return { ok: true, item, consumed: true, gain };
        }
        if (item.effect === 'box_cristais') {
            const gain = 800 + Math.floor(Math.random() * 1701);
            cristais.add(userId, gain);
            return { ok: true, item, consumed: true, gainCristais: gain };
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

    if (item.type === 'decoration') inv.equipped.decoration = itemId;
    if (item.title) inv.equipped.title = itemId;

    saveInv(userId, inv);
    return { ok: true, item, inv };
}

function equip(userId, itemId) {
    const inv = getInv(userId);
    if (!inv.owned.includes(itemId)) return { ok: false, error: 'Você não possui este item.' };
    const item = GLOBAL_ITEMS.find((i) => i.id === itemId);
    if (!item) return { ok: false, error: 'Item inválido.' };
    if (item.type === 'decoration') inv.equipped.decoration = itemId;
    if (item.title) inv.equipped.title = itemId;
    saveInv(userId, inv);
    return { ok: true, inv, item: { ...item, image: imageUrl(item) } };
}

function getEquippedDecoration(userId) {
    const inv = getInv(userId);
    const id = inv.equipped?.decoration;
    if (!id) return null;
    const item = DECORATIONS.find((i) => i.id === id);
    if (!item) return null;
    return { ...item, image: imageUrl(item) };
}

function getEquippedTitle(userId) {
    const inv = getInv(userId);
    const tId = inv.equipped?.title;
    const item = ITEMS.find((i) => i.id === tId);
    return item?.title || null;
}

function ownedDecorations(userId) {
    const inv = getInv(userId);
    return decorations().filter((d) => inv.owned.includes(d.id));
}

function getDailyBoost(userId) {
    const inv = getInv(userId);
    if (inv.effects?.dailyBoostUntil > Date.now()) {
        return Number(inv.effects.dailyBoostPct || 0);
    }
    return 0;
}

function panelBase() {
    return (
        process.env.PANEL_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.REDIRECT_URI?.replace(/\/auth\/discord\/callback.?$/, '') ||
        'https://aeternus-q7gt.onrender.com'
    ).replace(/\/$/, '');
}

function decorPanelUrl(guildId) {
    const base = panelBase();
    return guildId ? `${base}/decoracoes?guild=${guildId}` : `${base}/decoracoes`;
}

function itemsPanelUrl(guildId) {
    const base = panelBase();
    return guildId ? `${base}/itens?guild=${guildId}` : `${base}/itens`;
}

function shopPanelUrl(guildId) {
    return itemsPanelUrl(guildId);
}

module.exports = {
    GLOBAL_ITEMS,
    DECORATIONS,
    ITEMS,
    catalog,
    decorations,
    items,
    findItem,
    buy,
    equip,
    getInv,
    getEquippedDecoration,
    getEquippedTitle,
    ownedDecorations,
    getDailyBoost,
    guildVips,
    imageUrl,
    decorPanelUrl,
    itemsPanelUrl,
    shopPanelUrl,
    panelBase
};
