/**
 * Busca: YouTube primeiro; se falhar → SoundCloud (fallback estável).
 */

function isUrl(q) {
    return /^https?:\/\//i.test(String(q || '').trim());
}

function isYoutubeUrl(q) {
    return /youtube\.com|youtu\.be|music\.youtube\.com/i.test(String(q || ''));
}

function isSoundcloudUrl(q) {
    return /soundcloud\.com/i.test(String(q || ''));
}

function stripAccents(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function uniq(arr) {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
        const k = String(x || '').trim();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push(k);
    }
    return out;
}

function expandQueries(raw) {
    const base = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    if (!base) return [];

    const noAcc = stripAccents(base);
    const words = base.split(' ').filter(Boolean);
    const short = words.length === 1 && base.length <= 8;

    const variants = [base];
    if (noAcc !== base) variants.push(noAcc);

    const suffixes = ['official audio', 'official', 'lyrics', 'song', 'audio'];
    for (const s of suffixes) {
        variants.push(`${base} ${s}`);
        if (noAcc !== base) variants.push(`${noAcc} ${s}`);
    }

    if (short) {
        variants.push(`${base} song`, `${base} music`, `${base} official audio`, `${base} track`);
    }

    if (base.includes(' - ')) {
        const [a, b] = base.split(' - ').map((x) => x.trim());
        if (a && b) variants.push(`${a} ${b}`, `${b} ${a}`);
    }

    return uniq(variants).slice(0, 10);
}

/**
 * Ordem:
 * 1. YouTube / YT Music
 * 2. SoundCloud (fallback)
 * 3. Deezer (extra)
 */
function searchIdentifiers(raw) {
    const q = String(raw || '').trim();
    if (!q) return [];

    if (isUrl(q)) return [q];

    const queries = expandQueries(q);
    const ids = [];

    // YouTube primeiro
    for (const query of queries) {
        ids.push(`ytsearch:${query}`);
        ids.push(`ytmsearch:${query}`);
    }

    // SoundCloud fallback
    for (const query of queries) {
        ids.push(`scsearch:${query}`);
    }

    // Deezer reforço
    for (const query of queries.slice(0, 2)) {
        ids.push(`dzsearch:${query}`);
    }

    return uniq(ids).slice(0, 36);
}

module.exports = {
    isUrl,
    isYoutubeUrl,
    isSoundcloudUrl,
    stripAccents,
    expandQueries,
    searchIdentifiers
};
