/**
 * Busca multi-fonte para Lavalink (Serenetia).
 * Ordem: SoundCloud → YouTube → Deezer (mais chances de stream válido).
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
    const base = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!base) return [];

    const noAcc = stripAccents(base);
    const variants = [base];
    if (noAcc !== base) variants.push(noAcc);

    if (base.includes(' - ')) {
        const [a, b] = base.split(' - ').map((x) => x.trim());
        if (a && b) variants.push(`${a} ${b}`, `${b} ${a}`);
    }

    return uniq(variants).slice(0, 6);
}

/**
 * Identifiers para o Lavalink resolver.
 * Várias fontes = se uma quebra no play, o manager tenta outra.
 */
function searchIdentifiers(raw) {
    const q = String(raw || '').trim();
    if (!q) return [];

    if (isUrl(q)) {
        const ids = [q];
        if (isYoutubeUrl(q)) {
            const idMatch = q.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{6,})/);
            if (idMatch) ids.push(`ytsearch:${idMatch[1]}`);
            ids.push(`scsearch:${q.replace(/^https?:\/\//i, '').slice(0, 80)}`);
        }
        return uniq(ids);
    }

    const queries = expandQueries(q);
    const ids = [];

    // SoundCloud
    for (const query of queries.slice(0, 3)) {
        ids.push(`scsearch:${query}`);
    }
    // YouTube (Serenetia tem source youtube)
    for (const query of queries.slice(0, 2)) {
        ids.push(`ytsearch:${query}`);
        ids.push(`ytmsearch:${query}`);
    }
    // Deezer
    for (const query of queries.slice(0, 2)) {
        ids.push(`dzsearch:${query}`);
    }

    return uniq(ids).slice(0, 16);
}

module.exports = {
    isUrl,
    isYoutubeUrl,
    isSoundcloudUrl,
    stripAccents,
    expandQueries,
    searchIdentifiers
};
