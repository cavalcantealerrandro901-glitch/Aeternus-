const store = require('./store');
const eter = require('./eter');
const { getSettings } = require('./settings');

const DECORATIONS = [
    {
        id: 'dec_aurora',
        type: 'decoration',
        name: 'Aurora Violeta',
        desc: 'Céu aurora violeta cinematográfico',
        price: 2200,
        currency: 'eter',
        prompt: 'cinematic purple aurora borealis night sky, stars, soft glow, profile banner art, no text, high quality'
    },
    {
        id: 'dec_gelo',
        type: 'decoration',
        name: 'Campo de Gelo',
        desc: 'Paisagem glacial azul',
        price: 2400,
        currency: 'eter',
        prompt: 'frozen ice landscape, blue crystal mountains, soft light, aesthetic banner, no text'
    },
    {
        id: 'dec_ouro',
        type: 'decoration',
        name: 'Palácio de Ouro',
        desc: 'Luxo dourado premium',
        price: 5200,
        currency: 'eter',
        prompt: 'luxury golden palace interior, warm light, elegant marble, premium aesthetic, no text'
    },
    {
        id: 'dec_neon',
        type: 'decoration',
        name: 'Cidade Neon',
        desc: 'Cyberpunk noturno',
        price: 3800,
        currency: 'eter',
        prompt: 'cyberpunk neon city night rain, pink purple lights, cinematic banner, no text'
    },
    {
        id: 'dec_rosa',
        type: 'decoration',
        name: 'Jardim Rosa',
        desc: 'Flores e névoa rosa',
        price: 3000,
        currency: 'eter',
        prompt: 'mystical rose garden fog soft pink light aesthetic banner, no text'
    },
    {
        id: 'dec_floresta',
        type: 'decoration',
        name: 'Floresta Arcana',
        desc: 'Bosque mágico verde',
        price: 2800,
        currency: 'eter',
        prompt: 'enchanted green forest glowing particles magical atmosphere banner, no text'
    },
    {
        id: 'dec_oceano',
        type: 'decoration',
        name: 'Oceano Profundo',
        desc: 'Abismo azul com luz',
        price: 3100,
        currency: 'eter',
        prompt: 'deep ocean underwater light rays blue aesthetic cinematic banner, no text'
    },
    {
        id: 'dec_espaco',
        type: 'decoration',
        name: 'Nebulosa',
        desc: 'Espaço sideral colorido',
        price: 4500,
        currency: 'eter',
        prompt: 'colorful space nebula stars cosmic dust epic banner art, no text'
    },
    {
        id: 'dec_sakura',
        type: 'decoration',
        name: 'Sakura',
        desc: 'Cerejeiras ao entardecer',
        price: 3300,
        currency: 'eter',
        prompt: 'cherry blossom sakura sunset japanese aesthetic soft banner, no text'
    },
    {
        id: 'dec_vulcao',
        type: 'decoration',
        name: 'Vulcão',
        desc: 'Lava e fumaça dramática',
        price: 4100,
        currency: 'eter',
        prompt: 'volcano lava dramatic sky dark cinematic banner, no text'
    }
];

const EFFECTS = [
    {
        id: 'fx_brilho',
        type: 'effect',
        name: 'Brilho Suave',
        desc: 'Halo luminoso ao redor do avatar',
        price: 2500,
        currency: 'eter',
        style: 'glow',
        icon: '✨'
    },
    {
        id: 'fx_neon',
        type: 'effect',
        name: 'Aura Neon',
        desc: 'Moldura neon rosa/azul',
        price: 4200,
        currency: 'eter',
        style: 'neon',
        icon: '💜'
    },
    {
        id: 'fx_ouro',
        type: 'effect',
        name: 'Moldura de Ouro',
        desc: 'Borda dourada premium',
        price: 5500,
        currency: 'eter',
        style: 'gold',
        icon: '🥇'
    },
    {
        id: 'fx_estrelas',
        type: 'effect',
        name: 'Chuva de Estrelas',
        desc: 'Partículas brilhantes no card',
        price: 3800,
        currency: 'eter',
        style: 'stars',
        icon: '🌟'
    },
    {
        id: 'fx_fogo',
        type: 'effect',
        name: 'Chamas',
        desc: 'Bordas em tom de fogo',
        price: 4800,
        currency: 'eter',
        style: 'fire',
        icon: '🔥'
    },
    {
        id: 'fx_gelo',
        type: 'effect',
        name: 'Cristal de Gelo',
        desc: 'Aura gelada azul-ciano',
        price: 3600,
        currency: 'eter',
        style: 'ice',
        icon: '❄️'
    },
    {
        id: 'fx_arcoiris',
        type: 'effect',
        name: 'Arco-íris',
        desc: 'Moldura multicolor',
        price: 6000,
        currency: 'eter',
        style: 'rainbow',
        icon: '🌈'
    },
    {
        id: 'fx_sombra',
        type: 'effect',
        name: 'Sombra Real',
        desc: 'Sombra dramática no avatar',
        price: 2000,
        currency: 'eter',
        style: 'shadow',
        icon: '🌑'
    }
];

const ITEMS = [
    {
        id: 'item_titulo_lenda',
        type: 'item',
        name: 'Título: Lenda',
        desc: 'Título «Lenda» no perfil',
        price: 15000,
        currency: 'eter',
        title: 'Lenda',
        icon: '👑'
    },
    {
        id: 'item_titulo_astro',
        type: 'item',
        name: 'Título: Astro',
        desc: 'Título «Astro» no perfil',
        price: 25000,
        currency: 'eter',
        title: 'Astro',
        icon: '⭐'
    },
    {
        id: 'item_titulo_soberano',
        type: 'item',
        name: 'Título: Soberano',
        desc: 'Título «Soberano» no perfil',
        price: 8000,
        currency: 'eter',
        title: 'Soberano',
        icon: '🏰'
    },
    {
        id: 'item_boost_daily',
        type: 'item',
        name: 'Boost Daily +20%',
        desc: 'Boost no daily por 24h',
        price: 4000,
        currency: 'eter',
        consumable: true,
        effect: 'daily_boost_20',
        icon: '⚡'
    },
    {
        id: 'item_caixa_eter',
        type: 'item',
        name: 'Caixa de Éter',
        desc: '10k–40k éter na hora',
        price: 3000,
        currency: 'eter',
        consumable: true,
        effect: 'box_eter',
        icon: '📦'
    },
    {
        id: 'item_titulo_eterno',
        type: 'item',
        name: 'Título: Eterno',
        desc: 'Título «Eterno» no perfil',
        price: 12000,
        currency: 'eter',
        title: 'Eterno',
        icon: '♾️'
    }
];

const GLOBAL_ITEMS = [...DECORATIONS, ...ITEMS, ...EFFECTS];

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
        equipped: d.equipped || { decoration: null, title: null, effect: null },
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
            currency: 'eter',
            roleId: String(v.roleId),
            durationDays: Math.max(0, Math.floor(Number(v.durationDays) || 0)),
            icon: '👑'
        }));
}

function decorations() {
    return withImages(DECORATIONS);
}

function effects() {
    return EFFECTS.map((e) => ({ ...e }));
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

    const bal = eter.get(userId);
    if (bal < item.price) {
        return {
            ok: false,
            error: `Saldo insuficiente. Precisa de ${item.price.toLocaleString('pt-BR')} ✨ éter.`
        };
    }

    eter.remove(userId, item.price, { reason: `loja:${item.id}` });

    if (item.consumable) {
        if (item.effect === 'box_eter' || item.effect === 'box_flocos') {
            const gain = 10000 + Math.floor(Math.random() * 30001);
            eter.add(userId, gain, { reason: 'caixa loja' });
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
    if (!inv.equipped) inv.equipped = { decoration: null, title: null, effect: null };

    if (item.type === 'decoration') inv.equipped.decoration = itemId;
    if (item.title) inv.equipped.title = itemId;
    if (item.type === 'effect') inv.equipped.effect = itemId;

    saveInv(userId, inv);
    return { ok: true, item, inv };
}

function equip(userId, itemId) {
    const inv = getInv(userId);
    if (!inv.owned.includes(itemId)) return { ok: false, error: 'Você não possui este item.' };
    const item = GLOBAL_ITEMS.find((i) => i.id === itemId);
    if (!item) return { ok: false, error: 'Item inválido.' };
    if (!inv.equipped) inv.equipped = { decoration: null, title: null, effect: null };
    if (item.type === 'decoration') inv.equipped.decoration = itemId;
    if (item.title) inv.equipped.title = itemId;
    if (item.type === 'effect') inv.equipped.effect = itemId;
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

function getEquippedEffect(userId) {
    const inv = getInv(userId);
    const id = inv.equipped?.effect;
    if (!id) return null;
    return EFFECTS.find((e) => e.id === id) || null;
}

function ownedDecorations(userId) {
    const inv = getInv(userId);
    return decorations().filter((d) => inv.owned.includes(d.id));
}

function ownedEffects(userId) {
    const inv = getInv(userId);
    return effects().filter((e) => inv.owned.includes(e.id));
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

function dashboardPanelUrl() {
    return `${panelBase()}/dashboard`;
}

function decorPanelUrl(guildId) {
    const base = panelBase();
    return guildId ? `${base}/decoracoes?guild=${guildId}` : `${base}/decoracoes`;
}

function itemsPanelUrl(guildId) {
    const base = panelBase();
    return guildId ? `${base}/itens?guild=${guildId}` : `${base}/itens`;
}

function effectsPanelUrl(guildId) {
    const base = panelBase();
    return guildId ? `${base}/efeitos?guild=${guildId}` : `${base}/efeitos`;
}

function shopPanelUrl(guildId) {
    return itemsPanelUrl(guildId);
}

module.exports = {
    GLOBAL_ITEMS,
    DECORATIONS,
    ITEMS,
    EFFECTS,
    catalog,
    decorations,
    effects,
    items,
    findItem,
    buy,
    equip,
    getInv,
    getEquippedDecoration,
    getEquippedTitle,
    getEquippedEffect,
    ownedDecorations,
    ownedEffects,
    getDailyBoost,
    guildVips,
    imageUrl,
    decorPanelUrl,
    itemsPanelUrl,
    effectsPanelUrl,
    shopPanelUrl,
    dashboardPanelUrl,
    panelBase
};
