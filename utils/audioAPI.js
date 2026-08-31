const axios = require('axios');
const play = require('play-dl');

const API_CACHE = new Map();
const CACHE_TTL = 3600000; // 1 hora

// Ken API configuração
const KEN_API_CONFIG = {
    baseUrl: 'https://api.ken.ai/v1',
    timeout: 10000
};

// Spotify API configuração (backup)
const SPOTIFY_CONFIG = {
    baseUrl: 'https://api.spotify.com/v1',
    clientId: process.env.SPOTIFY_ID || '',
    clientSecret: process.env.SPOTIFY_SECRET || ''
};

let spotifyToken = null;
let spotifyTokenExpire = 0;

/**
 * Obter token do Spotify (backup)
 */
async function getSpotifyToken() {
    try {
        if (spotifyToken && Date.now() < spotifyTokenExpire) {
            return spotifyToken;
        }

        if (!SPOTIFY_CONFIG.clientId || !SPOTIFY_CONFIG.clientSecret) {
            return null;
        }

        const response = await axios.post('https://accounts.spotify.com/api/token', 
            'grant_type=client_credentials',
            {
                auth: {
                    username: SPOTIFY_CONFIG.clientId,
                    password: SPOTIFY_CONFIG.clientSecret
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        spotifyToken = response.data.access_token;
        spotifyTokenExpire = Date.now() + (response.data.expires_in * 1000);
        return spotifyToken;
    } catch (error) {
        console.error('[Music API] Erro ao obter token Spotify:', error.message);
        return null;
    }
}

/**
 * Buscar música via Ken API (Gratuita e sem limites)
 */
async function searchKenAPI(query) {
    try {
        // Verificar cache
        const cacheKey = `ken_${query}`;
        if (API_CACHE.has(cacheKey)) {
            const cached = API_CACHE.get(cacheKey);
            if (Date.now() < cached.expireAt) {
                return cached.data;
            }
            API_CACHE.delete(cacheKey);
        }

        // Tentar usar Ken API
        const response = await axios.get(`${KEN_API_CONFIG.baseUrl}/search`, {
            params: {
                q: query,
                type: 'track',
                limit: 1
            },
            timeout: KEN_API_CONFIG.timeout
        });

        if (response.data && response.data.tracks && response.data.tracks.length > 0) {
            const track = response.data.tracks[0];
            const result = {
                source: 'ken',
                title: track.name,
                artist: track.artist,
                url: track.url,
                duration: track.duration,
                audioUrl: track.audio_url,
                thumbnail: track.thumbnail
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
        console.error('[Ken API] Erro:', error.message);
        return null;
    }
}

/**
 * Buscar música via Spotify API (Backup)
 */
async function searchSpotifyAPI(query) {
    try {
        // Verificar cache
        const cacheKey = `spotify_${query}`;
        if (API_CACHE.has(cacheKey)) {
            const cached = API_CACHE.get(cacheKey);
            if (Date.now() < cached.expireAt) {
                return cached.data;
            }
            API_CACHE.delete(cacheKey);
        }

        const token = await getSpotifyToken();
        if (!token) return null;

        const response = await axios.get(`${SPOTIFY_CONFIG.baseUrl}/search`, {
            params: {
                q: query,
                type: 'track',
                limit: 1
            },
            headers: {
                'Authorization': `Bearer ${token}`
            },
            timeout: 10000
        });

        if (response.data.tracks.items.length > 0) {
            const track = response.data.tracks.items[0];
            const result = {
                source: 'spotify',
                title: track.name,
                artist: track.artists[0].name,
                url: track.external_urls.spotify,
                duration: Math.floor(track.duration_ms / 1000),
                thumbnail: track.album.images[0]?.url
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
        console.error('[Spotify API] Erro:', error.message);
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
        // Se tiver audioUrl direto (Ken API), usar diretamente
        if (musicData.audioUrl) {
            const response = await axios.get(musicData.audioUrl, {
                responseType: 'stream',
                timeout: 30000
            });
            return {
                stream: response.data,
                type: 'unknown',
                source: 'ken'
            };
        }

        // Se for YouTube URL, usar play-dl
        if (musicData.url.includes('youtube.com') || musicData.url.includes('youtu.be')) {
            const stream = await play.stream(musicData.url);
            return stream;
        }

        // Se for Spotify, tentar converter para YouTube
        if (musicData.source === 'spotify') {
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

        // 1. Tentar Ken API (Gratuita e sem limites)
        let result = await searchKenAPI(query);
        if (result) {
            console.log(`[Music Search] Encontrado via Ken API: ${result.title}`);
            return result;
        }

        // 2. Fallback para Spotify
        result = await searchSpotifyAPI(query);
        if (result) {
            console.log(`[Music Search] Encontrado via Spotify: ${result.title}`);
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
    searchKenAPI,
    searchSpotifyAPI,
    searchYouTubeAPI,
    getAudioStream,
    getSpotifyToken,
    API_CACHE
};
