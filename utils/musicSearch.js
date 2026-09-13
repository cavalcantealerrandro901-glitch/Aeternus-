/**
 * Busca para bots Discord — SoundCloud prioritário (estável).
 * YouTube desligado na busca (bloqueia muito em datacenter).
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

    const suffixes = [
        'official',
        'official audio',
        'lyrics',
        'song',
        'music',
        'audio',
        'remix',
        'live'
    ];
    for (const s of suffixes) {
        variants.push(`${base} ${s}`);
        if (noAcc !== base) variants.push(`${noAcc} ${s}`);
    }

    if (short) {
        variants.push(
            `${base} song`,
            `${base} music`,
            `${base} official audio`,
            `${base} track`,
            `${base} remix`
        );
    }

    if (base.includes(' - ')) {
        const [a, b] = base.split(' - ').map((x) => x.trim());
        if (a && b) {
            variants.push(`${a} ${b}`, `${b} ${a}`, `${a} ${b} official`);
        }
    }

    return uniq(variants).slice(0, 14);
}

/**
 * Ordem fixa:
 * 1. SoundCloud (principal)
 * 2. Deezer (reforço)
 * 3. YouTube só se MUSIC_ALLOW_YOUTUBE=1
 */
function searchIdentifiers(raw) {
    const q = String(raw || '').trim();
    if (!q) return [];

    // Link SoundCloud → direto
    if (isUrl(q) && isSoundcloudUrl(q)) return [q];

    // Link YouTube → não resolve no YT; manager tenta mirror SC pelo título
    if (isUrl(q) && isYoutubeUrl(q)) {
        return [q]; // mirror no musicManager
    }

    // Outros links (spotify/deezer/http)
    if (isUrl(q)) return [q];

    const queries = expandQueries(q);
    const ids = [];

    // SoundCloud — todas as variantes
    for (const query of queries) {
        ids.push(`scsearch:${query}`);
    }

    // Deezer — top queries
    for (const query of queries.slice(0, 3)) {
        ids.push(`dzsearch:${query}`);
    }

    // YouTube só se ativado explicitamente
    if (process.env.MUSIC_ALLOW_YOUTUBE === '1') {
        for (const query of queries.slice(0, 2)) {
            ids.push(`ytsearch:${query}`);
            ids.push(`ytmsearch:${query}`);
        }
    }

    return uniq(ids).slice(0, 32);
}

module.exports = {
    isUrl,
    isYoutubeUrl,
    isSoundcloudUrl,
    stripAccents,
    expandQueries,
    searchIdentifiers
};
