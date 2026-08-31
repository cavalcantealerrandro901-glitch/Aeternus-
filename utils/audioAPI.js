const axios = require('axios');
const play = require('play-dl');

const API_CACHE = new Map();
const CACHE_TTL = 3600000; // 1 hora

/**
 * Buscar música via Jio Saavn API (Gratuita e sem limites)
 */
async function searchJioSaavnAPI(query) {
    try {
        // Verificar cache
        const cacheKey = `saavn_${query}`;
        if (API_CACHE.has(cacheKey)) {
            const cached = API_CACHE.get(cacheKey);
            if (Date.now() < cached.expireAt) {
                return cached.data;
            }
            API_CACHE.delete(cacheKey);
        }

        // Jio Saavn API (Gratuita)
        const response = await axios.get('https://www.jiosaavn.com/api.php', {
            params: {
                __call: 'autocomplete.get',
                _format: 'json',
                query: query
            },
            timeout: 10000
        });

        if (response.data && response.data.songs && response.data.songs.length > 0) {
            const track = response.data.songs[0];
            const result = {
                source: 'jio_saavn',
                title: track.title,
                artist: track.more_info?.artists?.[0]?.name || 'Unknown',
                url: track.permaUrl,
                duration: parseInt(track.duration) || 180,
                thumbnail: track.image,
                downloadUrl: track.more_info?.song_peri_url || track.permaUrl
            };

            // Cachear resultado
            API_CACHE.set(cacheKey, {
                data: result,
                expireAt: Date.now() + CACHE_TTL
            });

            return result;
        }

        return null;
    } catch (error) {
        console.error('[Jio Saavn API] Erro:', error.message);
        return null;
    }
}

/**
 * Buscar música via SoundCloud API (Gratuita)
 */
async function searchSoundCloudAPI(query) {
    try {
        // Verificar cache
        const cacheKey = `soundcloud_${query}`;
        if (API_CACHE.has(cacheKey)) {
            const cached = API_CACHE.get(cacheKey);
            if (Date.now() < cached.expireAt) {
                return cached.data;
            }
            API_CACHE.delete(cacheKey);
        }

        // SoundCloud API pública
        const response = await axios.get('https://api-v2.soundcloud.com/search/tracks', {
            params: {
                q: query,
                client_id: 'a3e059563d7fd3372b49b37f4ef3e9a9',
                limit: 1
            },
            timeout: 10000
        });

        if (response.data && response.data.collection && response.data.collection.length > 0) {
            const track = response.data.collection[0];
            const result = {
                source: 'soundcloud',
                title: track.title,
                artist: track.user?.username || 'Unknown',
                url: track.permalink_url,
                duration: Math.floor(track.duration / 1000),
                thumbnail: track.artwork_url,
                downloadUrl: track.download_url || track.permalink_url
            };

            // Cachear resultado
            API_CACHE.set(cacheKey, {
                data: result,
                expireAt: Date.now() + CACHE_TTL
            });

            return result;
        }

        return null;
    } catch (error) {
        console.error('[SoundCloud API] Erro:', error.message);
        return null;
    }
}

/**
 * Buscar música via YouTube (Fallback final)
 */
async function searchYouTubeAPI(query) {
    try {
        // Verificar cache
        const cacheKey = `youtube_${query}`;
        if (API_CACHE.has(cacheKey)) {
            const cached = API_CACHE.get(cacheKey);
            if (Date.now() < cached.expireAt) {
                return cached.data;
            }
            API_CACHE.delete(cacheKey);
        }

        const results = await play.search(query, { limit: 1 });
        if (!results || results.length === 0) return null;

        const video = results[0];
        const result = {
            source: 'youtube',
            title: video.title,
            url: video.url,
            duration: video.durationInSec,
            thumbnail: video.thumbnail?.url
        };

        // Cachear resultado
        API_CACHE.set(cacheKey, {
            data: result,
            expireAt: Date.now() + CACHE_TTL
        });

        return result;
    } catch (error) {
        console.error('[YouTube API] Erro:', error.message);
        return null;
    }
}

/**
 * Obter stream de áudio da música
 */
async function getAudioStream(musicData) {
    try {
        // Se for URL do YouTube, usar play-dl
        if (musicData.url.includes('youtube.com') || musicData.url.includes('youtu.be')) {
            const stream = await play.stream(musicData.url);
            return stream;
        }

        // Se for SoundCloud, tentar usar play-dl também
        if (musicData.source === 'soundcloud') {
            try {
                const stream = await play.stream(musicData.url);
                return stream;
            } catch (e) {
                console.error('[Audio Stream] SoundCloud fallback para YouTube');
                // Fallback para YouTube se SoundCloud falhar
                const ytResult = await searchYouTubeAPI(`${musicData.title} ${musicData.artist}`);
                if (ytResult) {
                    const stream = await play.stream(ytResult.url);
                    return stream;
                }
            }
        }

        // Se for Jio Saavn, tentar converter para YouTube
        if (musicData.source === 'jio_saavn') {
            const ytResult = await searchYouTubeAPI(`${musicData.title} ${musicData.artist}`);
            if (ytResult) {
                const stream = await play.stream(ytResult.url);
                return stream;
            }
        }

        return null;
    } catch (error) {
        console.error('[Audio Stream] Erro:', error.message);
        return null;
    }
}

/**
 * Buscar música com fallback entre APIs
 */
async function searchMusic(query) {
    try {
        console.log(`[Music Search] Buscando: ${query}`);

        // 1. Tentar Jio Saavn API (Gratuita e sem limites)
        let result = await searchJioSaavnAPI(query);
        if (result) {
            console.log(`[Music Search] Encontrado via Jio Saavn: ${result.title}`);
            return result;
        }

        // 2. Fallback para SoundCloud
        result = await searchSoundCloudAPI(query);
        if (result) {
            console.log(`[Music Search] Encontrado via SoundCloud: ${result.title}`);
            return result;
        }

        // 3. Fallback final para YouTube
        result = await searchYouTubeAPI(query);
        if (result) {
            console.log(`[Music Search] Encontrado via YouTube: ${result.title}`);
            return result;
        }

        console.log(`[Music Search] Nenhuma música encontrada para: ${query}`);
        return null;
    } catch (error) {
        console.error('[Music Search] Erro geral:', error.message);
        return null;
    }
}

/**
 * Limpar cache antigo
 */
function cleanOldCache() {
    const now = Date.now();
    for (const [key, value] of API_CACHE.entries()) {
        if (now > value.expireAt) {
            API_CACHE.delete(key);
        }
    }
}

// Limpar cache a cada 30 minutos
setInterval(cleanOldCache, 30 * 60 * 1000);

module.exports = {
    searchMusic,
    searchJioSaavnAPI,
    searchSoundCloudAPI,
    searchYouTubeAPI,
    getAudioStream,
    API_CACHE
};
