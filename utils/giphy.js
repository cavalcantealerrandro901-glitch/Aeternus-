/**
 * Busca GIFs (Giphy). Defina GIPHY_API_KEY no .env
 * Fallback: Tenor público limitado / links estáticos
 */
const FALLBACK = {
    hug: [
        'https://media.giphy.com/media/l2QDM9Jnim1YVBtk4/giphy.gif',
        'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif',
        'https://media.giphy.com/media/PHZ7v9tfQu0o0/giphy.gif'
    ],
    kiss: [
        'https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif',
        'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif'
    ],
    slap: [
        'https://media.giphy.com/media/Zau0yrl17uzdK/giphy.gif',
        'https://media.giphy.com/media/jLeyHEjStL7EU/giphy.gif'
    ],
    pat: [
        'https://media.giphy.com/media/5tmRHwRtJHs5y/giphy.gif',
        'https://media.giphy.com/media/ARSp9uFoKWGEa1n0fb/giphy.gif'
    ],
    poke: ['https://media.giphy.com/media/TvT02yYcL5pZu/giphy.gif'],
    dance: ['https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'],
    cry: ['https://media.giphy.com/media/ROF8OQvDymDlS/giphy.gif'],
    laugh: ['https://media.giphy.com/media/10JhviFuU2wBAE/giphy.gif'],
    wave: ['https://media.giphy.com/media/Vbtc9CyJiHHPe/giphy.gif'],
    highfive: ['https://media.giphy.com/media/l2QDPN3oH0G9mV6ne/giphy.gif']
};

const QUERY = {
    hug: 'anime hug',
    kiss: 'anime kiss',
    slap: 'anime slap',
    pat: 'anime pat head',
    poke: 'anime poke',
    dance: 'anime dance',
    cry: 'anime cry',
    laugh: 'anime laugh',
    wave: 'anime wave',
    highfive: 'anime high five'
};

async function fetchGif(action) {
    const key = process.env.GIPHY_API_KEY || process.env.GIPHY_KEY || '';
    const q = QUERY[action] || action;

    if (key) {
        try {
            const url = `https://api.giphy.com/v1/gifs/random?api_key=${encodeURIComponent(key)}&tag=${encodeURIComponent(q)}&rating=pg-13`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const gif =
                    data?.data?.images?.original?.url ||
                    data?.data?.images?.downsized?.url ||
                    data?.data?.url;
                if (gif) return gif;
            }
        } catch (e) {
            console.warn('[giphy]', e.message);
        }
    }

    const list = FALLBACK[action] || FALLBACK.hug;
    return list[Math.floor(Math.random() * list.length)];
}

module.exports = { fetchGif, FALLBACK, QUERY };
