/**
 * GIFs de interação — cada ação só usa GIFs da própria categoria.
 * Ordem: waifu.pics → nekos.best → otakugifs → pool local (≥40).
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
    cringe: 'cringe',
    glomp: 'glomp',
    bully: 'bully',
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
    bonk: 'baka',
    kill: 'slap'
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
    matar: 'slap',
    kill: 'slap',
    bonk: 'slap',
    yeet: 'slap'
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
    // bonk / kill: APIs dedicadas; fallback local em slap/baka (mesma vibe)
    bonk: nekosRange('baka', 15).concat(nekosRange('slap', 10)),
    kill: nekosRange('slap', 20).concat(nekosRange('baka', 10))
};

/** Expande só dentro da mesma categoria — nunca mistura ações */
function expandTo40(key, list) {
    const out = [...new Set((list || []).filter(Boolean))];
    let n = 0;
    while (out.length < 40) {
        const base = out[n % Math.max(out.length, 1)] || 'https://cdn.nekos.best/hug/1.gif';
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
    if (!LOCAL[a]) LOCAL[a] = LOCAL[b] || LOCAL.hug;
}

function resolveKey(category) {
    const c = String(category || 'hug').toLowerCase();
    if (LOCAL[c]) return c;
    if (ALIAS[c]) return ALIAS[c];
    if (WAIFU[c]) return WAIFU[c];
    return 'hug';
}

function pickLocal(category) {
    const key = resolveKey(category);
    const list = LOCAL[key] || LOCAL.hug;
    return list[Math.floor(Math.random() * list.length)];
}

async function fetchWaifu(category) {
    const ep = WAIFU[category] || WAIFU[resolveKey(category)];
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

async function fetchNekos(category) {
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
    resolveKey
};
