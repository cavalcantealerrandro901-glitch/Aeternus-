/**
 * Busca de músicas por API (sem key):
 * 1) iTunes Search API — metadados
 * 2) YouTube (play-dl) — stream / links
 */

let play = null;
try {
    play = require('play-dl');
} catch (e) {
    console.warn('[musicSearch] play-dl não instalado:', e.message);
}

class SearchError extends Error {
    constructor(message, code = 'SEARCH_ERROR') {
        super(message);
        this.name = 'SearchError';
        this.code = code;
    }
}

async function fetchJson(url, { timeoutMs = 12000, label = 'API' } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: {
                'User-Agent': 'AeternusBot/2.0',
                Accept: 'application/json'
            }
        });

        if (res.status === 429) {
            throw new SearchError(
                'A API está sobrecarregada (muitas buscas). Espere alguns segundos e tente de novo.',
                'RATE_LIMIT'
            );
        }

        if (!res.ok) {
            throw new SearchError(
                `${label} respondeu com erro HTTP ${res.status}. Tente novamente.`,
                'HTTP_ERROR'
            );
        }

        try {
            return await res.json();
        } catch {
            throw new SearchError(`${label} devolveu uma resposta inválida.`, 'BAD_JSON');
        }
    } catch (err) {
        if (err instanceof SearchError) throw err;

        if (err.name === 'AbortError') {
            throw new SearchError(
                `A ${label} demorou demais para responder. Verifique a internet e tente de novo.`,
                'TIMEOUT'
            );
        }

        throw new SearchError(
            `Falha de rede ao contatar a ${label}: ${err.message || 'erro desconhecido'}`,
            'NETWORK'
        );
    } finally {
        clearTimeout(timer);
    }
}

function sanitizeQuery(term) {
    const q = String(term || '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()
        .slice(0, 120);
    return q;
}

async function searchItunes(term, limit = 5) {
    const q = sanitizeQuery(term);
    if (!q) return [];

    const url =
        'https://itunes.apple.com/search?' +
        new URLSearchParams({
            term: q,
            media: 'music',
            entity: 'song',
            limit: String(Math.min(Math.max(limit, 1), 15)),
            country: 'BR',
            lang: 'pt_br'
        });

    const data = await fetchJson(url, { label: 'iTunes API', timeoutMs: 12000 });
    const results = Array.isArray(data?.results) ? data.results : [];

    return results
        .filter((r) => r && (r.trackName || r.collectionName))
        .map((r) => ({
            title: r.trackName || r.collectionName || 'Música',
            artist: r.artistName || 'Desconhecido',
            album: r.collectionName || null,
            artwork: r.artworkUrl100
                ? String(r.artworkUrl100).replace('100x100bb', '300x300bb')
                : null,
            preview: r.previewUrl || null,
            durationMs: r.trackTimeMillis || 0,
            query: `${r.trackName || ''} ${r.artistName || ''}`.trim()
        }));
}

async function searchYoutube(term, limit = 5) {
    const q = sanitizeQuery(term);
    if (!q) return [];
    if (!play) {
        throw new SearchError(
            'Módulo **play-dl** não está instalado. Rode: `npm i play-dl`',
            'NO_PLAYDL'
        );
    }

    try {
        const results = await Promise.race([
            play.search(q, { limit, source: { youtube: 'video' } }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new SearchError('YouTube demorou demais.', 'YT_TIMEOUT')), 15000)
            )
        ]);

        return (results || []).map((v) => ({
            title: v.title || q,
            url: v.url,
            duration: v.durationInSec || 0,
            thumbnail: v.thumbnails?.[0]?.url || null,
            channel: v.channel?.name || 'YouTube',
            query: v.title || q
        }));
    } catch (err) {
        if (err instanceof SearchError) throw err;
        console.error('[musicSearch] youtube', err);
        throw new SearchError(
            'Não foi possível buscar no YouTube agora. Tente de novo em instantes.',
            'YT_ERROR'
        );
    }
}

async function resolvePlayable(userQuery) {
    const q = sanitizeQuery(userQuery);
    if (!q) throw new SearchError('Digite o nome da música.', 'EMPTY_QUERY');

    if (play && (play.yt_validate(q) === 'video' || /youtube\.com|youtu\.be/i.test(q))) {
        try {
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
        } catch (e) {
            throw new SearchError(
                'Link do YouTube inválido ou indisponível.',
                'BAD_URL'
            );
        }
    }

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
        console.warn('[musicSearch] itunes fallback:', e.message);
        // continua só com YouTube
    }

    try {
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
    } catch (e) {
        console.warn('[musicSearch] yt term1:', e.message);
    }

    try {
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
    } catch (e) {
        throw new SearchError(
            e.message || 'Falha ao buscar a música nas APIs.',
            e.code || 'SEARCH_FAIL'
        );
    }

    throw new SearchError('Nenhuma música encontrada com esse nome.', 'NOT_FOUND');
}

async function searchList(userQuery, limit = 5) {
    const q = sanitizeQuery(userQuery);
    if (!q) throw new SearchError('Digite o nome da música ou artista.', 'EMPTY_QUERY');

    const errors = [];

    // iTunes primeiro
    let itunes = [];
    try {
        itunes = await searchItunes(q, limit);
    } catch (e) {
        errors.push(`iTunes: ${e.message}`);
        console.warn('[musicSearch] itunes list:', e.message);
    }

    if (itunes.length) {
        const out = [];
        for (const item of itunes.slice(0, limit)) {
            let ytUrl = null;
            let duration = Math.floor((item.durationMs || 0) / 1000);
            try {
                const yt = await searchYoutube(item.query, 1);
                if (yt[0]) {
                    ytUrl = yt[0].url;
                    duration = yt[0].duration || duration;
                }
            } catch (e) {
                // mantém item sem link YT
                console.warn('[musicSearch] yt por item:', e.message);
            }
            out.push({
                title: item.title,
                artist: item.artist,
                album: item.album,
                artwork: item.artwork,
                preview: item.preview,
                youtube: ytUrl,
                duration
            });
        }
        // se nenhum tem youtube e play-dl sumiu, ainda devolve metadados
        return out;
    }

    // Fallback só YouTube
    try {
        const yt = await searchYoutube(q, limit);
        if (yt.length) {
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
    } catch (e) {
        errors.push(`YouTube: ${e.message}`);
        throw new SearchError(
            `Não foi possível buscar músicas.\n${errors.join('\n')}`,
            'ALL_FAILED'
        );
    }

    if (errors.length) {
        throw new SearchError(
            `Nenhum resultado e algumas APIs falharam:\n${errors.join('\n')}`,
            'NOT_FOUND_PARTIAL'
        );
    }

    throw new SearchError('Nenhum resultado encontrado. Tente outro nome.', 'NOT_FOUND');
}

module.exports = {
    SearchError,
    searchItunes,
    searchYoutube,
    resolvePlayable,
    searchList,
    sanitizeQuery
};
