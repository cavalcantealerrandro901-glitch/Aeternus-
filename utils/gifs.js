/**
 * GIFs de interação
 * Ordem: gifukai → otakugifs → waifu.pics → pool local
 * matar: kill/kick/punch/shoot — pool em data/kill_gifs.json (≥78)
 */

const fs = require('fs');
const path = require('path');

const UA = { 'User-Agent': 'AeternusBot/1.0 (+discord)', Accept: 'application/json' };

const GIFUKAI = {
    hug: 'hug', kiss: 'kiss', slap: 'slap', pat: 'pat', poke: 'poke', bite: 'bite',
    cry: 'cry', dance: 'dance', blush: 'blush', smile: 'smile', wink: 'wink',
    cuddle: 'cuddle', lick: 'lick', wave: 'wave', happy: 'happy', highfive: 'highfive',
    kick: 'kick', punch: 'punch', shoot: 'shoot', kill: 'kill',
    abraco: 'hug', beijo: 'kiss', tapa: 'slap', carinho: 'pat', cutucar: 'poke',
    morder: 'bite', chorar: 'cry', dancar: 'dance', cafune: 'cuddle', acenar: 'wave',
    corar: 'blush', sorrir: 'smile', rir: 'happy', lambida: 'lick', piscadela: 'wink',
    matar: 'kill', yeet: 'punch', bonk: 'slap'
};

const OTAKU = {
    hug: 'hug', kiss: 'kiss', slap: 'slap', pat: 'pat', poke: 'poke', bite: 'bite',
    cry: 'cry', dance: 'dance', blush: 'blush', smile: 'smile', wink: 'wink',
    cuddle: 'cuddle', lick: 'lick', wave: 'wave', happy: 'happy', highfive: 'highfive',
    punch: 'punch',
    abraco: 'hug', beijo: 'kiss', tapa: 'slap', carinho: 'pat', cutucar: 'poke',
    morder: 'bite', chorar: 'cry', dancar: 'dance', cafune: 'cuddle', acenar: 'wave',
    corar: 'blush', sorrir: 'smile', rir: 'happy', lambida: 'lick', piscadela: 'wink',
    bonk: 'slap', yeet: 'punch'
};

const WAIFU = {
    hug: 'hug', kiss: 'kiss', slap: 'slap', pat: 'pat', poke: 'poke', bite: 'bite',
    bonk: 'bonk', cry: 'cry', dance: 'dance', highfive: 'highfive', wave: 'wave',
    blush: 'blush', smile: 'smile', happy: 'happy', wink: 'wink', handhold: 'handhold',
    cuddle: 'cuddle', lick: 'lick', yeet: 'yeet', kill: 'kill', kick: 'kick', bully: 'bully',
    abraco: 'hug', beijo: 'kiss', tapa: 'slap', carinho: 'pat', cutucar: 'poke',
    morder: 'bite', chorar: 'cry', dancar: 'dance', cafune: 'cuddle', acenar: 'wave',
    corar: 'blush', sorrir: 'smile', rir: 'happy', maos: 'handhold', lambida: 'lick',
    matar: 'kill', piscadela: 'wink'
};

function loadKillLocal() {
    const candidates = [
        path.join(__dirname, '..', 'data', 'kill_gifs.json'),
        path.join(__dirname, 'kill_gifs.json'),
        path.join(process.cwd(), 'data', 'kill_gifs.json')
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
                if (Array.isArray(arr) && arr.length) return arr.filter(Boolean);
            }
        } catch (_) {}
    }
    return [];
}

const KILL_LOCAL = loadKillLocal();
const KILL_CACHE = [...KILL_LOCAL];

const ALIAS = {
    abraco: 'hug', beijo: 'kiss', tapa: 'slap', carinho: 'pat', cutucar: 'poke',
    morder: 'bite', chorar: 'cry', dancar: 'dance', cafune: 'cuddle', acenar: 'wave',
    corar: 'blush', sorrir: 'smile', rir: 'happy', maos: 'handhold', lambida: 'lick',
    matar: 'kill', piscadela: 'wink'
};

function resolveKey(category) {
    const c = String(category || 'hug').toLowerCase();
    if (c === 'matar' || c === 'kill') return 'kill';
    if (ALIAS[c]) return ALIAS[c];
    if (GIFUKAI[c] || WAIFU[c] || OTAKU[c]) return c;
    return 'hug';
}

function isKillKey(category) {
    const c = String(category || '').toLowerCase();
    return c === 'kill' || c === 'matar';
}

function pickFrom(list) {
    if (!list || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
}

async function fetchJson(url) {
    try {
        const res = await fetch(url, { headers: UA });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function fetchGifukai(action) {
    const ep = GIFUKAI[action] || GIFUKAI[resolveKey(action)];
    if (!ep) return null;
    const data = await fetchJson('https://api.gifukai.com/v1/' + encodeURIComponent(ep));
    return data?.url || null;
}

async function fetchOtaku(action) {
    if (isKillKey(action)) return null;
    const ep = OTAKU[action] || OTAKU[resolveKey(action)];
    if (!ep) return null;
    const data = await fetchJson('https://api.otakugifs.xyz/gif?reaction=' + encodeURIComponent(ep));
    return data?.url || null;
}

async function fetchWaifu(action) {
    const ep = WAIFU[action] || WAIFU[resolveKey(action)];
    if (!ep) return null;
    const data = await fetchJson('https://api.waifu.pics/sfw/' + encodeURIComponent(ep));
    return data?.url || null;
}

async function fetchKillGif() {
    const order = ['kill', 'kill', 'kick', 'punch', 'shoot', 'kill', 'kick', 'punch'];
    for (const ep of order) {
        try {
            const data = await fetchJson('https://api.gifukai.com/v1/' + ep);
            const url = data?.url;
            if (url) {
                if (!KILL_CACHE.includes(url)) {
                    KILL_CACHE.push(url);
                    if (KILL_CACHE.length > 150) KILL_CACHE.shift();
                }
                return url;
            }
        } catch (_) {}
    }
    for (const ep of ['kill', 'kick', 'bully']) {
        const url = await fetchWaifu(ep);
        if (url) {
            if (!KILL_CACHE.includes(url)) KILL_CACHE.push(url);
            return url;
        }
    }
    return pickFrom(KILL_CACHE.length ? KILL_CACHE : KILL_LOCAL);
}

function pickLocal(category) {
    if (isKillKey(category)) return pickFrom(KILL_CACHE.length ? KILL_CACHE : KILL_LOCAL);
    return null;
}

async function pickAsync(category) {
    if (isKillKey(category)) {
        const k = await fetchKillGif();
        if (k) return k;
        return pickFrom(KILL_LOCAL);
    }
    const key = resolveKey(category);
    const online = (await fetchGifukai(key)) || (await fetchOtaku(key)) || (await fetchWaifu(key));
    if (online) return online;
    return (await fetchGifukai(key)) || pickLocal(key);
}

function pick(category) {
    if (isKillKey(category)) return pickFrom(KILL_CACHE) || pickFrom(KILL_LOCAL);
    return null;
}

function count(category) {
    if (isKillKey(category)) return Math.max(KILL_CACHE.length, KILL_LOCAL.length);
    return 0;
}

module.exports = {
    pick, pickAsync, count, fetchKillGif, fetchGifukai, fetchOtaku, fetchWaifu,
    resolveKey, KILL_LOCAL
};
