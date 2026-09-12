/**
 * Monta identificadores de busca multi-fonte / multi-idioma.
 * Prioridade: SoundCloud → Deezer → Spotify → YT Music → YouTube.
 */

function isUrl(q) {
    return /^https?:\/\//i.test(String(q || '').trim());
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

/**
 * Expande a query do usuário em várias formas:
 * - original
 * - sem acento
 * - com "official / audio / lyrics / song"
 * - nomes curtos (ex: sod) ganham reforço
 */
function expandQueries(raw) {
    const base = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    if (!base) return [];

    const noAcc = stripAccents(base);
    const words = base.split(' ').filter(Boolean);
    const short = words.length === 1 && base.length <= 6;

    const variants = [base, noAcc];

    // reforço internacional / oficial
    const suffixes = [
        'official',
        'official audio',
        'official video',
        'lyrics',
        'song',
        'music',
        'audio',
        'tema',
        'música',
        'musica'
    ];

    for (const s of suffixes) {
        variants.push(`${base} ${s}`);
        if (noAcc !== base) variants.push(`${noAcc} ${s}`);
    }

    // nomes curtos tipo "sod", "kpop", "bts"
    if (short) {
        variants.push(
            `${base} song`,
            `${base} music`,
            `${base} official audio`,
            `${base} track`,
            `${base} remix`,
            `${base} lyrics`
        );
    }

    // se parecer artista+música com hífen
    if (base.includes(' - ')) {
        const [a, b] = base.split(' - ').map((x) => x.trim());
        if (a && b) {
            variants.push(`${a} ${b}`, `${b} ${a}`, `${a} ${b} official`);
        }
    }

    return uniq(variants).slice(0, 14);
}

/**
 * Lista de identifiers Lavalink na ordem de prioridade.
 */
function searchIdentifiers(raw) {
    const q = String(raw || '').trim();
    if (!q) return [];
    if (isUrl(q)) return [q];

    const queries = expandQueries(q);
    const ids = [];

    for (const query of queries) {
        // SoundCloud primeiro (melhor para internacional em nodes free)
        ids.push(`scsearch:${query}`);
    }
    for (const query of queries.slice(0, 4)) {
        ids.push(`dzsearch:${query}`);
        ids.push(`spsearch:${query}`);
    }
    for (const query of queries.slice(0, 3)) {
        ids.push(`ytmsearch:${query}`);
        ids.push(`ytsearch:${query}`);
    }

    return uniq(ids).slice(0, 40);
}

module.exports = {
    isUrl,
    stripAccents,
    expandQueries,
    searchIdentifiers
};
