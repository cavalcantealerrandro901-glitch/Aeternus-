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

/** 78 GIFs únicas reais (gifukai + otakugifs) */
const KILL_LOCAL = [
    'https://cdn.otakugifs.xyz/gifs/punch/2fd18184c78ec80d.gif',
    'https://cdn.gifukai.com/punch/c5f95b59-2041-4855-9cde-9406cffb84d6.gif',
    'https://cdn.gifukai.com/punch/48e00c27-011a-4bee-9a5e-0e8394d42a8f.gif',
    'https://cdn.gifukai.com/shoot/c00bfeed-ebbf-4147-9299-b842b9bea5f1.gif',
    'https://cdn.gifukai.com/shoot/c95e707e-d25b-4eb4-aee1-4bee9a4b9a6c.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/7895d749a1244483.gif',
    'https://cdn.gifukai.com/kick/e879262e-1c8e-48be-ad22-0d11093e4578.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/UAru8Vy4rnU5.gif',
    'https://cdn.gifukai.com/punch/26e8b624-d4ea-450b-9d29-1066b8c7f118.gif',
    'https://cdn.gifukai.com/punch/1a316773-cc96-4a50-a07f-1a0392ae42be.gif',
    'https://cdn.gifukai.com/punch/e993da48-2f00-4400-bc7e-82fdb1c4f32e.gif',
    'https://cdn.gifukai.com/punch/0d6dfedb-a66d-46a7-8aa5-9b71418dd132.gif',
    'https://cdn.gifukai.com/punch/07ea48a3-6e72-4890-9a72-c02b8f04c3c5.gif',
    'https://cdn.gifukai.com/shoot/a23a0a8f-2894-4428-a5aa-3f146c8f841c.gif',
    'https://cdn.gifukai.com/kick/bf33a186-fba6-4d63-a87c-7cc17b25fd0c.gif',
    'https://cdn.gifukai.com/kick/73e580db-cc1f-4cc7-81a0-7f035c0a25ec.gif',
    'https://cdn.gifukai.com/kick/d20883db-50c0-401c-bd27-2411340d298b.gif',
    'https://cdn.gifukai.com/punch/30a4f506-654c-4f6c-bb92-701c269544b9.gif',
    'https://cdn.gifukai.com/kick/48d6177d-7204-4d3e-8e0f-1ecc3fa10eb4.gif',
    'https://cdn.gifukai.com/shoot/c8364a51-a348-4086-9e8e-350dc18b4831.gif',
    'https://cdn.gifukai.com/kick/4d96b0a9-5437-4ea9-9932-6a2fc40358ea.gif',
    'https://cdn.gifukai.com/punch/5fed4242-8479-4e8e-90c9-6a0d8211855b.gif',
    'https://cdn.gifukai.com/punch/339a8d73-21ec-4ba8-bbd8-14c4e6802f03.gif',
    'https://cdn.gifukai.com/punch/9e0783fe-f883-48a2-a8d8-2b48dd130362.gif',
    'https://cdn.gifukai.com/kill/1d1c0b0e-2ee3-4115-a427-ca874c07b5ba.gif',
    'https://cdn.gifukai.com/shoot/998846ce-8b29-49cc-ab81-c8fa315bb1d3.gif',
    'https://cdn.gifukai.com/kick/6755a39b-2d97-4e41-8e79-90e3ac7e41c1.gif',
    'https://cdn.gifukai.com/shoot/308975a7-f70b-470c-8155-66a354d84c79.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/f55xAxN6kKHY.gif',
    'https://cdn.gifukai.com/kick/d17d3c79-659e-4170-8851-d2dacf7d4194.gif',
    'https://cdn.gifukai.com/shoot/eb29e251-9b69-4b85-a2f7-9f5f1deddc12.gif',
    'https://cdn.gifukai.com/kick/bacb3b48-b865-4b69-afc4-a8b2447c2a97.gif',
    'https://cdn.gifukai.com/kick/e4a19e68-0bf1-4040-86ad-5ea47a96f4f9.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/05bc002e281ddd92.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/6Nl4IdAcfX.gif',
    'https://cdn.gifukai.com/punch/1e5c4511-070a-4ce4-8e34-0ca72a32c115.gif',
    'https://cdn.gifukai.com/kick/456e3479-3088-4d0b-8b82-657ef67a407a.gif',
    'https://cdn.gifukai.com/punch/d82bb7ac-5bad-4b98-8d68-1da3c6100f7c.gif',
    'https://cdn.gifukai.com/kick/f92088e9-dcf8-424b-82f7-35ff5a976156.gif',
    'https://cdn.gifukai.com/punch/c5f95b59-2041-4855-9cde-9406cffb84d6.gif',
    'https://cdn.gifukai.com/shoot/c00bfeed-ebbf-4147-9299-b842b9bea5f1.gif',
    'https://cdn.gifukai.com/punch/48e00c27-011a-4bee-9a5e-0e8394d42a8f.gif',
    'https://cdn.gifukai.com/kick/439768be-17bc-4dbb-af44-bebffeddd4dd.gif',
    'https://cdn.gifukai.com/shoot/8d49e242-8aba-442d-a13b-c2a06ac675af.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/f179131bd406f951.gif',
    'https://cdn.gifukai.com/kick/e92ab1d8-8aa9-43e9-a9d8-75b69fad0c05.gif',
    'https://cdn.gifukai.com/shoot/88fb0876-ba58-438a-9170-4b1db929da68.gif',
    'https://cdn.gifukai.com/kick/8516d585-0163-470d-b925-9d115257777e.gif',
    'https://cdn.gifukai.com/kick/01f92dad-6c32-472a-8778-090140d20d16.gif',
    'https://cdn.gifukai.com/shoot/70558953-0e21-4872-a005-e5f55876fe20.gif',
    'https://cdn.gifukai.com/punch/89504ac9-3cb8-4478-b34f-6d4d788ac80d.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/3a6417e6568b2e96.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/lQbYrpwHpz.gif',
    'https://cdn.gifukai.com/kill/dd0b8b75-c9ae-4683-a687-6a902f79b38a.gif',
    'https://cdn.gifukai.com/kick/27593e52-53c0-48aa-917f-13d7402e0ad9.gif',
    'https://cdn.gifukai.com/punch/4e5b6ebe-db50-419f-a09e-db1be0730446.gif',
    'https://cdn.gifukai.com/punch/d7ceee9a-5bc6-40f6-aa0b-1941407849c5.gif',
    'https://cdn.gifukai.com/kick/bf91c2f9-0a74-4d1c-a7f4-c17181b9da4b.gif',
    'https://cdn.gifukai.com/punch/24a2d967-ff8d-4ff3-ae27-34b5b0fa0ace.gif',
    'https://cdn.gifukai.com/punch/cade225e-cc88-4f53-9a5d-bb33c89464c1.gif',
    'https://cdn.gifukai.com/kick/8240a6d9-ccc4-4876-9a54-cbeb5a1c9e95.gif',
    'https://cdn.gifukai.com/punch/6a608670-3863-4231-955a-ae95a123e00d.gif',
    'https://cdn.gifukai.com/kick/f890a1fe-ea44-4d9c-a918-da963fa1610e.gif',
    'https://cdn.gifukai.com/punch/f1d27273-2072-4085-907c-6942fff21467.gif',
    'https://cdn.gifukai.com/punch/f224f2f1-dabe-4edc-9ab6-0d66fd36bc10.gif',
    'https://cdn.gifukai.com/kick/cf035600-12c4-49ec-8733-5134127d3224.gif',
    'https://cdn.gifukai.com/kick/6b980882-8134-4f93-b723-80900489e387.gif',
    'https://cdn.gifukai.com/punch/9acc51b3-2248-4c53-8c47-8c6360c6c485.gif',
    'https://cdn.gifukai.com/punch/1c18c75e-2b66-427d-84ee-51c6c2751b0c.gif',
    'https://cdn.gifukai.com/punch/95eb9b6a-8f13-440b-a6f8-5f503484fc81.gif',
    'https://cdn.gifukai.com/kick/2637bbc4-88ec-4187-b00e-ace0ad8e3a70.gif',
    'https://cdn.gifukai.com/punch/6877e55b-e50b-49a5-9dc7-c77c7f2c5155.gif',
    'https://cdn.gifukai.com/shoot/90600453-2f73-447d-8e4d-33c959deef94.gif',
    'https://cdn.gifukai.com/punch/276b4057-4de1-4bf7-bd85-99bab8a13726.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/a68e34a1994c91f7.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/120ad1827ee066b2.gif',
    'https://cdn.otakugifs.xyz/gifs/punch/6a071f4273b6c06d.gif',
    'https://cdn.gifukai.com/punch/c5f95b59-2041-4855-9cde-9406cffb84d6.gif',
    'https://cdn.gifukai.com/kick/e879262e-1c8e-48be-ad22-0d11093e4578.gif'
];

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
