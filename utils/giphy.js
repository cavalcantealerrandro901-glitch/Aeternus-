/**
 * GIFs de anime para interações
 * Fontes (gratuitas, sem key):
 *  - https://api.waifu.pics
 *  - https://nekos.best/api/v2
 * Opcional: GIPHY_API_KEY / TENOR_API_KEY no .env para ainda mais variedade
 */

/** Mapeia ação interna → endpoints externos */
const WAIFU_MAP = {
    hug: 'hug',
    kiss: 'kiss',
    slap: 'slap',
    pat: 'pat',
    poke: 'poke',
    dance: 'dance',
    cry: 'cry',
    laugh: 'smile',
    wave: 'wave',
    highfive: 'highfive'
};

const NEKOS_MAP = {
    hug: 'hug',
    kiss: 'kiss',
    slap: 'slap',
    pat: 'pat',
    poke: 'poke',
    dance: 'dance',
    cry: 'cry',
    laugh: 'laugh',
    wave: 'wave',
    highfive: 'highfive'
};

/** Fallback local (links estáveis conhecidos) — vários por ação */
const FALLBACK = {
    hug: [
        'https://media.tenor.com/GOqJ4mQ8H0EAAAAC/anime-hug.gif',
        'https://media.tenor.com/9e1a0s0n0v0AAAAC/anime-hug.gif',
        'https://cdn.discordapp.com/attachments/0/0/placeholder.gif'
    ],
    kiss: [
        'https://media.tenor.com/Jn0f5t0n0v0AAAAC/anime-kiss.gif'
    ],
    slap: [
        'https://media.tenor.com/0n0v0A0x0EkAAAAC/anime-slap.gif'
    ],
    pat: [
        'https://media.tenor.com/0n0v0A0x0EkAAAAC/anime-pat.gif'
    ],
    poke: [],
    dance: [],
    cry: [],
    laugh: [],
    wave: [],
    highfive: []
};

// Fallbacks confiáveis do Giphy (IDs reais usados em bots)
const STABLE = {
    hug: [
        'https://media.giphy.com/media/l2QDM9Jnim1YVBtk4/giphy.gif',
        'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif',
        'https://media.giphy.com/media/PHZ7v9tfQu0o0/giphy.gif',
        'https://media.giphy.com/media/u9BxQbM5bx0Ru/giphy.gif',
        'https://media.giphy.com/media/IRUb7GTCaPU8E/giphy.gif',
        'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
        'https://media.giphy.com/media/49mdjsMrH7oyY/giphy.gif',
        'https://media.giphy.com/media/10BcGXupy5h2Bq/giphy.gif',
        'https://media.giphy.com/media/ZQN9jsRWpFrBQ/giphy.gif',
        'https://media.giphy.com/media/143v0ZNb5wYqHe/giphy.gif',
        'https://media.giphy.com/media/C4gbGLzRfarLu/giphy.gif',
        'https://media.giphy.com/media/aD1fI3UUWC4/giphy.gif'
    ],
    kiss: [
        'https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif',
        'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
        'https://media.giphy.com/media/11k3r4vhzqTq0g/giphy.gif',
        'https://media.giphy.com/media/wOtkVW0l5CqNa/giphy.gif',
        'https://media.giphy.com/media/12VXIxKaIGyq2I/giphy.gif',
        'https://media.giphy.com/media/nyGFcsP0kAobm/giphy.gif',
        'https://media.giphy.com/media/FqBTvSNjNzeZG/giphy.gif',
        'https://media.giphy.com/media/KH1ML2fP5o1yE/giphy.gif',
        'https://media.giphy.com/media/JPm5yY8c1p0v6/giphy.gif',
        'https://media.giphy.com/media/flmwfeqU6SNG/giphy.gif'
    ],
    slap: [
        'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
        'https://media.giphy.com/media/jLeyHEjStL7EU/giphy.gif',
        'https://media.giphy.com/media/3XlEk2RxPS1m8/giphy.gif',
        'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
        'https://media.giphy.com/media/AlsIdLQJpQ2mA/giphy.gif',
        'https://media.giphy.com/media/xUOwGpbJ7h3V5l0/giphy.gif'
    ],
    pat: [
        'https://media.giphy.com/media/5tmRHwRtJHs5y/giphy.gif',
        'https://media.giphy.com/media/ARSp9uFoKWGEa1n0fb/giphy.gif',
        'https://media.giphy.com/media/ye7OTQg4r0k0/giphy.gif',
        'https://media.giphy.com/media/4HP0ddZn0H0/giphy.gif'
    ],
    poke: [
        'https://media.giphy.com/media/TvT02yYcL5pZu/giphy.gif',
        'https://media.giphy.com/media/pAsT0h0X0v0kI/giphy.gif'
    ],
    dance: [
        'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
        'https://media.giphy.com/media/10JhviFuU2wBAE/giphy.gif'
    ],
    cry: [
        'https://media.giphy.com/media/ROF8OQvDymDlS/giphy.gif',
        'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif'
    ],
    laugh: [
        'https://media.giphy.com/media/10JhviFuU2wBAE/giphy.gif',
        'https://media.giphy.com/media/Zft2sYYzVpSNm/giphy.gif'
    ],
    wave: [
        'https://media.giphy.com/media/Vbtc9CyJiHHPe/giphy.gif',
        'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif'
    ],
    highfive: [
        'https://media.giphy.com/media/l2QDPN3oH0G9mV6ne/giphy.gif',
        'https://media.giphy.com/media/8JTq8l7k0m0/giphy.gif'
    ]
};

function pick(arr) {
    if (!arr?.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

async function fromWaifuPics(action) {
    const cat = WAIFU_MAP[action];
    if (!cat) return null;
    try {
        // sfw category
        const res = await fetch(`https://api.waifu.pics/sfw/${cat}`, {
            signal: AbortSignal.timeout(7000)
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.url || null;
    } catch {
        return null;
    }
}

async function fromNekosBest(action) {
    const cat = NEKOS_MAP[action];
    if (!cat) return null;
    try {
        const res = await fetch(`https://nekos.best/api/v2/${cat}`, {
            signal: AbortSignal.timeout(7000)
        });
        if (!res.ok) return null;
        const data = await res.json();
        const results = data?.results || [];
        if (!results.length) return null;
        return pick(results)?.url || null;
    } catch {
        return null;
    }
}

async function fromWaifuPicsMany(action, amount = 30) {
    const cat = WAIFU_MAP[action];
    if (!cat) return [];
    try {
        const res = await fetch(`https://api.waifu.pics/many/sfw/${cat}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exclude: [] }),
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) return [];
        const data = await res.json();
        const files = data?.files || [];
        return files.slice(0, amount);
    } catch {
        return [];
    }
}

async function fromGiphy(action) {
    const key = process.env.GIPHY_API_KEY || process.env.GIPHY_KEY || '';
    if (!key) return null;
    const tags = {
        hug: 'anime hug',
        kiss: 'anime kiss',
        slap: 'anime slap',
        pat: 'anime headpat',
        poke: 'anime poke',
        dance: 'anime dance',
        cry: 'anime cry',
        laugh: 'anime laugh',
        wave: 'anime wave',
        highfive: 'anime high five'
    };
    const tag = tags[action] || `anime ${action}`;
    try {
        const url =
            `https://api.giphy.com/v1/gifs/random?api_key=${encodeURIComponent(key)}` +
            `&tag=${encodeURIComponent(tag)}&rating=pg-13`;
        const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.data?.images?.original?.url || data?.data?.images?.downsized?.url || null;
    } catch {
        return null;
    }
}

/**
 * Cache em memória: após buscar “many”, reutiliza até esgotar
 * @type {Map<string, string[]>}
 */
const poolCache = new Map();

async function refillPool(action) {
    const many = await fromWaifuPicsMany(action, 30);
    if (many.length) {
        poolCache.set(action, many);
        return many;
    }
    return [];
}

/**
 * Retorna um GIF aleatório de anime para a ação.
 * Ordem: pool cache → waifu.pics many → waifu single → nekos.best → giphy → stable fallback
 */
async function fetchGif(action) {
    // 1) pool em cache (muitos GIFs por ação)
    let pool = poolCache.get(action);
    if (!pool || pool.length < 3) {
        pool = await refillPool(action);
    }
    if (pool?.length) {
        const idx = Math.floor(Math.random() * pool.length);
        const url = pool.splice(idx, 1)[0];
        poolCache.set(action, pool);
        if (url) return url;
    }

    // 2) single endpoints
    const a = await fromWaifuPics(action);
    if (a) return a;

    const b = await fromNekosBest(action);
    if (b) return b;

    const c = await fromGiphy(action);
    if (c) return c;

    // 3) estáveis locais
    const stable = STABLE[action] || STABLE.hug;
    return pick(stable) || 'https://media.giphy.com/media/l2QDM9Jnim1YVBtk4/giphy.gif';
}

module.exports = {
    fetchGif,
    STABLE,
    WAIFU_MAP,
    NEKOS_MAP,
    refillPool
};
