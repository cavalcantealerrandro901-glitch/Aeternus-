/**
 * GIFs de interação — cada ação só usa GIFs da própria categoria.
 * Ordem: waifu.pics → nekos.best → otakugifs → pool local (≥40).
 * matar/kill: NUNCA usa slap — só kill, kick e bully.
 */

const WAIFU = {
    hug: 'hug',
    kiss: 'kiss',
    slap: 'slap',
    pat: 'pat',
    poke: 'poke',
    bite: 'bite',
    bonk: 'bonk',
    cry: 'cry',
    dance: 'dance',
    highfive: 'highfive',
    wave: 'wave',
    blush: 'blush',
    smile: 'smile',
    happy: 'happy',
    wink: 'wink',
    handhold: 'handhold',
    cuddle: 'cuddle',
    lick: 'lick',
    yeet: 'yeet',
    kill: 'kill',
    kick: 'kick',
    bully: 'bully',
    cringe: 'cringe',
    glomp: 'glomp',
    abraco: 'hug',
    beijo: 'kiss',
    tapa: 'slap',
    carinho: 'pat',
    cutucar: 'poke',
    morder: 'bite',
    chorar: 'cry',
    dancar: 'dance',
    cafune: 'cuddle',
    acenar: 'wave',
    corar: 'blush',
    sorrir: 'smile',
    rir: 'happy',
    maos: 'handhold',
    lambida: 'lick',
    matar: 'kill',
    piscadela: 'wink'
};

const NEKOS = {
    hug: 'hug',
    kiss: 'kiss',
    slap: 'slap',
    pat: 'pat',
    poke: 'poke',
    bite: 'bite',
    highfive: 'highfive',
    cry: 'cry',
    dance: 'dance',
    wave: 'wave',
    blush: 'blush',
    smile: 'smile',
    happy: 'happy',
    wink: 'wink',
    handhold: 'handhold',
    cuddle: 'cuddle',
    lick: 'lick',
    yeet: 'yeet',
    abraco: 'hug',
    beijo: 'kiss',
    tapa: 'slap',
    carinho: 'pat',
    cutucar: 'poke',
    morder: 'bite',
    chorar: 'cry',
    dancar: 'dance',
    cafune: 'cuddle',
    acenar: 'wave',
    corar: 'blush',
    sorrir: 'smile',
    rir: 'happy',
    maos: 'handhold',
    lambida: 'lick',
    piscadela: 'wink',
    bonk: 'baka'
    // kill/matar NÃO mapeiam para slap
};

const OTAKU = {
    hug: 'hug',
    kiss: 'kiss',
    slap: 'slap',
    pat: 'pat',
    poke: 'poke',
    bite: 'bite',
    cry: 'cry',
    dance: 'dance',
    blush: 'blush',
    smile: 'smile',
    wink: 'wink',
    cuddle: 'cuddle',
    lick: 'lick',
    wave: 'wave',
    happy: 'happy',
    highfive: 'highfive',
    abraco: 'hug',
    beijo: 'kiss',
    tapa: 'slap',
    carinho: 'pat',
    cutucar: 'poke',
    morder: 'bite',
    chorar: 'cry',
    dancar: 'dance',
    cafune: 'cuddle',
    acenar: 'wave',
    corar: 'blush',
    sorrir: 'smile',
    rir: 'happy',
    lambida: 'lick',
    piscadela: 'wink',
    bonk: 'slap',
    yeet: 'slap'
    // kill/matar NÃO mapeiam para slap
};

function nekosRange(cat, n) {
    const arr = [];
    for (let i = 1; i <= n; i++) arr.push('https://cdn.nekos.best/' + cat + '/' + i + '.gif');
    return arr;
}

const BASE = {
    hug: nekosRange('hug', 20),
    kiss: nekosRange('kiss', 20),
    slap: nekosRange('slap', 20),
    pat: nekosRange('pat', 20),
    poke: nekosRange('poke', 20),
    bite: nekosRange('bite', 20),
    cuddle: nekosRange('cuddle', 20),
    dance: nekosRange('dance', 20),
    cry: nekosRange('cry', 20),
    wave: nekosRange('wave', 20),
    blush: nekosRange('blush', 20),
    smile: nekosRange('smile', 20),
    happy: nekosRange('happy', 20),
    wink: nekosRange('wink', 20),
    handhold: nekosRange('handhold', 20),
    lick: nekosRange('lick', 20),
    highfive: nekosRange('highfive', 20),
    yeet: nekosRange('yeet', 20),
    bonk: nekosRange('baka', 15).concat(nekosRange('slap', 10)),
    // kill: sem fallback de tapa — só preenche via API (kill/kick/bully)
    kill: []
};

/** Cache em memória de GIFs de eliminação coletados em runtime */
const KILL_CACHE = [];

/** Expande só dentro da mesma categoria — nunca mistura ações */
function expandTo40(key, list) {
    const out = [...new Set((list || []).filter(Boolean))];
    if (!out.length) return out;
    let n = 0;
    while (out.length < 40) {
        const base = out[n % out.length];
        const sep = base.includes('?') ? '&' : '?';
        out.push(base + sep + 'v=' + n);
        n += 1;
        if (n > 80) break;
    }
    return out.slice(0, 48);
}

const LOCAL = {};
for (const [k, list] of Object.entries(BASE)) {
    LOCAL[k] = expandTo40(k, list);
}

const ALIAS = {
    abraco: 'hug',
    beijo: 'kiss',
    tapa: 'slap',
    carinho: 'pat',
    cutucar: 'poke',
    morder: 'bite',
    chorar: 'cry',
    dancar: 'dance',
    cafune: 'cuddle',
    acenar: 'wave',
    corar: 'blush',
    sorrir: 'smile',
    rir: 'happy',
    maos: 'handhold',
    lambida: 'lick',
    matar: 'kill',
    piscadela: 'wink',
    highfive: 'highfive',
    yeet: 'yeet',
    bonk: 'bonk'
};
for (const [a, b] of Object.entries(ALIAS)) {
    if (!LOCAL[a] || !LOCAL[a].length) LOCAL[a] = LOCAL[b] || [];
}

function resolveKey(category) {
    const c = String(category || 'hug').toLowerCase();
    if (c === 'matar' || c === 'kill') return 'kill';
    if (LOCAL[c] && LOCAL[c].length) return c;
    if (ALIAS[c]) return ALIAS[c];
    if (WAIFU[c]) return WAIFU[c];
    return 'hug';
}

function isKillKey(category) {
    const c = String(category || '').toLowerCase();
    return c === 'kill' || c === 'matar';
}

function pickLocal(category) {
    if (isKillKey(category)) {
        const pool = KILL_CACHE.length ? KILL_CACHE : LOCAL.kill || [];
        if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
        return null;
    }
    const key = resolveKey(category);
    const list = LOCAL[key] || LOCAL.hug || [];
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
}

async function fetchWaifuEndpoint(ep) {
    if (!ep) return null;
    try {
        const res = await fetch('https://api.waifu.pics/sfw/' + ep, {
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.url || null;
    } catch {
        return null;
    }
}

async function fetchWaifu(category) {
    if (isKillKey(category)) return null; // tratado em fetchKillGif
    const ep = WAIFU[category] || WAIFU[resolveKey(category)];
    return fetchWaifuEndpoint(ep);
}

/**
 * GIFs de eliminação: kill → kick → bully (waifu.pics).
 * Nunca usa slap/tapa.
 */
async function fetchKillGif() {
    const order = ['kill', 'kill', 'kill', 'kick', 'bully', 'kill', 'kick'];
    for (const ep of order) {
        const url = await fetchWaifuEndpoint(ep);
        if (url && !/slap/i.test(url)) {
            if (!KILL_CACHE.includes(url)) {
                KILL_CACHE.push(url);
                if (KILL_CACHE.length > 60) KILL_CACHE.shift();
            }
            return url;
        }
    }
    // cache preenchido em usos anteriores
    if (KILL_CACHE.length) {
        return KILL_CACHE[Math.floor(Math.random() * KILL_CACHE.length)];
    }
    return null;
}

async function fetchNekos(category) {
    if (isKillKey(category)) return null; // nekos não tem kill real
    const ep = NEKOS[category] || NEKOS[resolveKey(category)];
    if (!ep) return null;
    try {
        const res = await fetch('https://nekos.best/api/v2/' + ep, {
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.results?.[0]?.url || null;
    } catch {
        return null;
    }
}

async function fetchOtaku(category) {
    if (isKillKey(category)) return null;
    const ep = OTAKU[category] || OTAKU[resolveKey(category)];
    if (!ep) return null;
    try {
        const res = await fetch(
            'https://api.otakugifs.xyz/gif?reaction=' + encodeURIComponent(ep),
            { headers: { Accept: 'application/json' } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data?.url || null;
    } catch {
        return null;
    }
}

/** API online da MESMA ação → local da mesma ação */
async function pickAsync(category) {
    if (isKillKey(category)) {
        const k = await fetchKillGif();
        if (k) return k;
        return pickLocal('kill');
    }

    const key = resolveKey(category);
    const online =
        (await fetchWaifu(key)) || (await fetchNekos(key)) || (await fetchOtaku(key));
    if (online) return online;
    return pickLocal(key);
}

function pick(category) {
    return pickLocal(category);
}

function count(category) {
    if (isKillKey(category)) return KILL_CACHE.length || (LOCAL.kill || []).length;
    const key = resolveKey(category);
    return (LOCAL[key] || []).length;
}

module.exports = {
    LOCAL,
    MAP: LOCAL,
    pick,
    pickAsync,
    count,
    fetchWaifu,
    fetchNekos,
    fetchOtaku,
    fetchKillGif,
    resolveKey
};
