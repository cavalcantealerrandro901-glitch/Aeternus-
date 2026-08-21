/**
 * Busca de músicas por API (sem key):
 * 1) iTunes Search API — metadados oficiais
 * 2) YouTube (play-dl) — stream para o Discord
 */

let play;
try {
    play = require('play-dl');
} catch {
    play = null;
}

/**
 * Busca no iTunes (Apple). Grátis, sem token.
 * @returns {Promise<Array<{title:string,artist:string,album?:string,artwork?:string,preview?:string,query:string}>>}
 */
async function searchItunes(term, limit = 5) {
    const url =
        'https://itunes.apple.com/search?' +
        new URLSearchParams({
            term: term,
            media: 'music',
            entity: 'song',
            limit: String(limit),
            country: 'BR',
            lang: 'pt_br'
        });

    const res = await fetch(url, {
        headers: { 'User-Agent': 'AeternusBot/2.0' }
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];

    return results.map((r) => ({
        title: r.trackName || r.collectionName || 'Música',
        artist: r.artistName || 'Desconhecido',
        album: r.collectionName || null,
        artwork: r.artworkUrl100
            ? String(r.artworkUrl100).replace('100x100bb', '300x300bb')
            : null,
        preview: r.previewUrl || null, // 30s AAC
        durationMs: r.trackTimeMillis || 0,
        query: `${r.trackName || ''} ${r.artistName || ''}`.trim()
    }));
}

/**
 * Busca no YouTube via play-dl (para tocar no Discord).
 */
async function searchYoutube(term, limit = 5) {
    if (!play) return [];
    try {
        const results = await play.search(term, {
            limit,
            source: { youtube: 'video' }
        });
        return (results || []).map((v) => ({
            title: v.title || term,
            url: v.url,
            duration: v.durationInSec || 0,
            thumbnail: v.thumbnails?.[0]?.url || null,
            channel: v.channel?.name || 'YouTube',
            query: v.title || term
        }));
    } catch (e) {
        console.error('[musicSearch] youtube', e.message);
        return [];
    }
}

/**
 * Resolve uma faixa tocável (YouTube) a partir do pedido do usuário.
 * Fluxo: iTunes (nome oficial) → busca YouTube com esse nome → fallback busca direta YT.
 */
async function resolvePlayable(userQuery) {
    const q = String(userQuery || '').trim();
    if (!q) throw new Error('Digite o nome da música.');

    // URL direta do YouTube
    if (play && (play.yt_validate(q) === 'video' || /youtube\.com|youtu\.be/i.test(q))) {
        const info = await play.video_info(q);
        const v = info.video_details;
        return {
            title: v.title || 'Música',
            url: v.url,
            duration: v.durationInSec || 0,
            thumbnail: v.thumbnails?.[0]?.url || null,
            channel: v.channel?.name || 'YouTube',
            source: 'youtube-url'
        };
    }

    // 1) Metadados no iTunes
    let searchTerm = q;
    let artwork = null;
    let artist = null;
    try {
        const itunes = await searchItunes(q, 3);
        if (itunes[0]) {
            searchTerm = `${itunes[0].title} ${itunes[0].artist}`;
            artwork = itunes[0].artwork;
            artist = itunes[0].artist;
        }
    } catch (e) {
        console.warn('[musicSearch] itunes', e.message);
    }

    // 2) YouTube com termo melhorado
    const yt = await searchYoutube(searchTerm, 3);
    if (yt[0]) {
        return {
            title: yt[0].title,
            url: yt[0].url,
            duration: yt[0].duration,
            thumbnail: artwork || yt[0].thumbnail,
            channel: artist || yt[0].channel,
            source: 'itunes+youtube'
        };
    }

    // 3) Fallback: YouTube com termo original
    const yt2 = await searchYoutube(q, 3);
    if (yt2[0]) {
        return {
            title: yt2[0].title,
            url: yt2[0].url,
            duration: yt2[0].duration,
            thumbnail: yt2[0].thumbnail,
            channel: yt2[0].channel,
            source: 'youtube'
        };
    }

    throw new Error('Nenhuma música encontrada nesse nome. Tente outro termo.');
}

/**
 * Só busca (sem tocar) — lista para o usuário escolher.
 */
async function searchList(userQuery, limit = 5) {
    const q = String(userQuery || '').trim();
    if (!q) return [];

    const itunes = await searchItunes(q, limit).catch(() => []);
    if (itunes.length) {
        // Para cada resultado iTunes, pega 1 link YT (em paralelo limitado)
        const out = [];
        for (const item of itunes.slice(0, limit)) {
            const yt = await searchYoutube(item.query, 1);
            out.push({
                title: item.title,
                artist: item.artist,
                album: item.album,
                artwork: item.artwork,
                preview: item.preview,
                youtube: yt[0]?.url || null,
                duration: yt[0]?.duration || Math.floor((item.durationMs || 0) / 1000)
            });
        }
        return out;
    }

    // só YouTube
    const yt = await searchYoutube(q, limit);
    return yt.map((v) => ({
        title: v.title,
        artist: v.channel,
        album: null,
        artwork: v.thumbnail,
        preview: null,
        youtube: v.url,
        duration: v.duration
    }));
}

module.exports = {
    searchItunes,
    searchYoutube,
    resolvePlayable,
    searchList
};
