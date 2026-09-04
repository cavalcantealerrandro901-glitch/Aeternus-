/**
 * Cache de buscas/faixas de música (memória + TTL + limite)
 *
 * Env:
 *   MUSIC_CACHE_TTL_MS   — tempo de vida (padrão 1h = 3600000)
 *   MUSIC_CACHE_MAX      — máx. entradas (padrão 500)
 *   MUSIC_CACHE_DISABLED — true para desligar
 */
const store = new Map();

function ttlMs() {
    const n = Number(process.env.MUSIC_CACHE_TTL_MS);
    if (Number.isFinite(n) && n >= 0) return n;
    return 60 * 60 * 1000;
}

function maxEntries() {
    const n = Number(process.env.MUSIC_CACHE_MAX);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
    return 500;
}

function enabled() {
    const v = String(process.env.MUSIC_CACHE_DISABLED || '').toLowerCase();
    return !['1', 'true', 'yes', 'on'].includes(v);
}

function normalizeKey(query, prefix = 'q') {
    const q = String(query || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/\s+/g, ' ')
        .slice(0, 300);
    return `${prefix}:${q}`;
}

function purgeExpired() {
    const now = Date.now();
    for (const [k, v] of store) {
        if (!v || now >= v.expireAt) store.delete(k);
    }
}

function evictIfNeeded() {
    const max = maxEntries();
    if (store.size <= max) return;
    const entries = [...store.entries()].sort((a, b) => {
        const ha = a[1].hits || 0;
        const hb = b[1].hits || 0;
        if (ha !== hb) return ha - hb;
        return (a[1].expireAt || 0) - (b[1].expireAt || 0);
    });
    const remove = store.size - max;
    for (let i = 0; i < remove; i++) store.delete(entries[i][0]);
}

function get(query, prefix = 'q') {
    if (!enabled()) return null;
    const key = normalizeKey(query, prefix);
    const hit = store.get(key);
    if (!hit) return null;
    if (Date.now() >= hit.expireAt) {
        store.delete(key);
        return null;
    }
    hit.hits = (hit.hits || 0) + 1;
    try {
        return structuredClone(hit.data);
    } catch (_) {
        return JSON.parse(JSON.stringify(hit.data));
    }
}

function set(query, data, prefix = 'q') {
    if (!enabled() || data == null) return;
    purgeExpired();
    const key = normalizeKey(query, prefix);
    const ttl = ttlMs();
    if (ttl <= 0) return;
    store.set(key, {
        data: (() => {
            try {
                return structuredClone(data);
            } catch (_) {
                return JSON.parse(JSON.stringify(data));
            }
        })(),
        expireAt: Date.now() + ttl,
        hits: 0
    });
    evictIfNeeded();
}

function clear() {
    store.clear();
}

function stats() {
    purgeExpired();
    return {
        size: store.size,
        max: maxEntries(),
        ttlMs: ttlMs(),
        enabled: enabled()
    };
}

async function wrap(query, fn, prefix = 'q') {
    const cached = get(query, prefix);
    if (cached != null) return { ...cached, _cached: true };
    const result = await fn();
    if (result) set(query, result, prefix);
    return result;
}

module.exports = {
    get,
    set,
    clear,
    stats,
    wrap,
    normalizeKey,
    enabled
};
