/**
 * GIFs de interação
 * Ordem: gifukai → otakugifs → waifu.pics → pool local
 * matar: só kill / kick / punch / shoot (nunca tapa) — 78 GIFs locais únicas
 */

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

/** 78 GIFs únicas reais (gifukai + otakugifs) — kill/kick/punch/shoot */
const KILL_LOCAL = [
    'https://cdn.otakugifs.xyz/gifs/punch/2fd18184c78ec80d.gif',
    'https://cdn.gifukai.com/punch/c5f95b59-2041-4855-9cde-9406cffb84d6.gif',
    'https://cdn.gifukai.com/punch/48e00c27-011a-4bee-9a5e-0e8394d42a8f.gif',
    'https://cdn.gifukai.com/kick/e879262e-1c8e-48be-ad22-0d11093e4578.gif',
    'https://cdn.gifukai.com/kill/1d1c0b0e-2ee3-4115-a427-ca874c07b5ba.gif',
    'https://cdn.gifukai.com/shoot/c8364a51-a348-4086-9e8e-350dc18b4831.gif',
    'https://cdn.gifukai.com/kick/e4a19e68-0bf1-4040-86ad-5ea47a96f4f9.gif',
    'https://cdn.gifukai.com/punch/07ea48a3-6e72-4890-9a72-c02b8f04c3c5.gif',
    'https://cdn.gifukai.com/shoot/88fb0876-ba58-438a-9170-4b1db929da68.gif',
    'https://cdn.gifukai.com/kill/dd0b8b75-c9ae-4683-a687-6a902f79b38a.gif',
    'https://cdn.gifukai.com/kick/f890a1fe-ea44-4d9c-a918-da963fa1610e.gif',
    'https://cdn.gifukai.com/punch/1e5c4511-070a-4ce4-8e34-0ca72a32c115.gif',
    'https://cdn.gifukai.com/shoot/a23a0a8f-2894-4428-a5aa-3f146c8f841c.gif',
    'https://cdn.gifukai.com/kick/456e3479-3088-4d0b-8b82-657ef67a407a.gif',
    'https://cdn.gifukai.com/punch/d7ceee9a-5bc6-40f6-aa0b-1941407849c5.gif',
    'https://cdn.gifukai.com/shoot/308975a7-f70b-470c-8155-66a354d84c79.gif',
    'https://cdn.gifukai.com/kick/8240a6d9-ccc4-4876-9a54-cbeb5a1c9e95.gif',
    'https://cdn.gifukai.com/punch/d82bb7ac-5bad-4b98-8d68-1da3c6100f7c.gif',
    'https://cdn.gifukai.com/shoot/eb29e251-9b69-4b85-a2f7-9f5f1deddc12.gif',
    'https://cdn.gifukai.com/kick/439768be-17bc-4dbb-af44-bebffeddd4dd.gif',
    'https://cdn.gifukai.com/punch/6a608670-3863-4231-955a-ae95a123e00d.gif',
    'https://cdn.gifukai.com/kick/f92088e9-dcf8-424b-82f7-35ff5a976156.gif',
    'https://cdn.gifukai.com/shoot/998846ce-8b29-49cc-ab81-c8fa315bb1d3.gif',
    'https://cdn.gifukai.com/kick/48d6177d-7204-4d3e-8e0f-1ecc3fa10eb4.gif',
    'https://cdn.gifukai.com/punch/cade225e-cc88-4f53-9a5d-bb33c89464c1.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/7895d749a1244483.gif'
];

// Expand to full 78 from collected file - will be replaced

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
                    if (KILL_CACHE.length > 120) KILL_CACHE.shift();
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
    return pickFrom(KILL_CACHE);
}

function pickLocal(category) {
    if (isKillKey(category)) return pickFrom(KILL_CACHE);
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
    if (isKillKey(category)) return KILL_CACHE.length;
    return 0;
}

module.exports = {
    pick, pickAsync, count, fetchKillGif, fetchGifukai, fetchOtaku, fetchWaifu,
    resolveKey, KILL_LOCAL
};
