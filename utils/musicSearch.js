/**
 * Busca otimizada para bots Discord.
 * Fonte principal: SoundCloud (catálogo grande + menos bloqueio).
 * YouTube só em último caso (quebra muito em datacenter).
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

    // Sufixos que ajudam a achar a faixa certa no SoundCloud
    const suffixes = ['official', 'official audio', 'lyrics', 'song', 'music', 'audio'];
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

    return uniq(variants).slice(0, 12);
}

/**
 * Identifiers Lavalink — SoundCloud em primeiro (quase exclusivo).
 */
function searchIdentifiers(raw) {
    const q = String(raw || '').trim();
    if (!q) return [];

    // Link direto do SoundCloud → usa o link
    if (isUrl(q) && isSoundcloudUrl(q)) return [q];

    // Link do YouTube → NÃO resolve no YT; tenta achar no SC pelo texto da URL
    // (o manager ainda faz mirror pelo título se precisar)
    if (isUrl(q) && isYoutubeUrl(q)) {
        // deixa o manager tratar mirror; aqui só devolve o URL como tentativa fraca
        return [q];
    }

    // Outros links (spotify/deezer/http) → tenta direto
    if (isUrl(q)) return [q];

    const queries = expandQueries(q);
    const ids = [];

    // === SoundCloud (principal) ===
    for (const query of queries) {
        ids.push(`scsearch:${query}`);
    }

    // === Deezer (metadados / algumas nodes streamam) — só top queries ===
    for (const query of queries.slice(0, 2)) {
        ids.push(`dzsearch:${query}`);
    }

    // === YouTube: desligado por padrão (quebra muito)
    // Ative com MUSIC_ALLOW_YOUTUBE=1 no env do bot se quiser
    if (process.env.MUSIC_ALLOW_YOUTUBE === '1') {
        for (const query of queries.slice(0, 2)) {
            ids.push(`ytmsearch:${query}`);
            ids.push(`ytsearch:${query}`);
        }
    }

    return uniq(ids).slice(0, 28);
}

module.exports = {
    isUrl,
    isYoutubeUrl,
    isSoundcloudUrl,
    stripAccents,
    expandQueries,
    searchIdentifiers
};
