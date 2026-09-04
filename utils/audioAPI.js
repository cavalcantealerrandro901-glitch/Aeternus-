const axios = require('axios');
const play = require('play-dl');
const scClient = require('./soundcloudClient');

const API_CACHE = new Map();
const CACHE_TTL = 3600000;

async function searchJioSaavnAPI(query) {
    try {
        const cacheKey = `saavn_${query}`;
        if (API_CACHE.has(cacheKey)) {
            const cached = API_CACHE.get(cacheKey);
            if (Date.now() < cached.expireAt) return cached.data;
            API_CACHE.delete(cacheKey);
        }
        const response = await axios.get('https://www.jiosaavn.com/api.php', {
            params: { __call: 'autocomplete.get', _format: 'json', query },
            timeout: 10000
        });
        if (response.data?.songs?.length > 0) {
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
            API_CACHE.set(cacheKey, { data: result, expireAt: Date.now() + CACHE_TTL });
            return result;
        }
        return null;
    } catch (error) {
        console.error('[Jio Saavn API] Erro:', error.message);
        return null;
    }
}

async function searchSoundCloudAPI(query) {
    try {
        const cacheKey = `soundcloud_${query}`;
        if (API_CACHE.has(cacheKey)) {
            const cached = API_CACHE.get(cacheKey);
            if (Date.now() < cached.expireAt) return cached.data;
            API_CACHE.delete(cacheKey);
        }
        const data = await scClient.searchTracks(query, 1);
        const track = data?.collection?.[0];
        if (!track) return null;
        const result = {
            source: 'soundcloud',
            title: track.title,
            artist: track.user?.username || 'Unknown',
            url: track.permalink_url,
            duration: Math.floor((track.duration || 0) / 1000),
            thumbnail: track.artwork_url,
            downloadUrl: track.download_url || track.permalink_url
        };
        API_CACHE.set(cacheKey, { data: result, expireAt: Date.now() + CACHE_TTL });
        return result;
    } catch (error) {
        if (error.response?.status === 401 || /401/.test(error.message)) {
            console.warn('[SoundCloud API] client_id rejeitado — pulando SC');
        } else {
            console.error('[SoundCloud API] Erro:', error.message);
        }
        return null;
    }
}

async function searchYouTubeAPI(query) {
    try {
        const cacheKey = `youtube_${query}`;
        if (API_CACHE.has(cacheKey)) {
            const cached = API_CACHE.get(cacheKey);
            if (Date.now() < cached.expireAt) return cached.data;
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
        API_CACHE.set(cacheKey, { data: result, expireAt: Date.now() + CACHE_TTL });
        return result;
    } catch (error) {
        console.error('[YouTube API] Erro:', error.message);
        return null;
    }
}

async function getAudioStream(musicData) {
    try {
        if (musicData.url.includes('youtube.com') || musicData.url.includes('youtu.be')) {
            return await play.stream(musicData.url);
        }
        if (musicData.source === 'soundcloud') {
            try {
                return await play.stream(musicData.url);
            } catch (e) {
                console.error('[Audio Stream] SoundCloud fallback para YouTube');
                const ytResult = await searchYouTubeAPI(`${musicData.title} ${musicData.artist}`);
                if (ytResult) return await play.stream(ytResult.url);
            }
        }
        if (musicData.source === 'jio_saavn') {
            const ytResult = await searchYouTubeAPI(`${musicData.title} ${musicData.artist}`);
            if (ytResult) return await play.stream(ytResult.url);
        }
        return null;
    } catch (error) {
        console.error('[Audio Stream] Erro:', error.message);
        return null;
    }
}

async function searchMusic(query) {
    try {
        console.log(`[Music Search] Buscando: ${query}`);
        let result = await searchYouTubeAPI(query);
        if (result) {
            console.log(`[Music Search] Encontrado via YouTube: ${result.title}`);
            return result;
        }
        result = await searchJioSaavnAPI(query);
        if (result) {
            console.log(`[Music Search] Encontrado via Jio Saavn: ${result.title}`);
            return result;
        }
        result = await searchSoundCloudAPI(query);
        if (result) {
            console.log(`[Music Search] Encontrado via SoundCloud: ${result.title}`);
            return result;
        }
        console.log(`[Music Search] Nenhuma música encontrada para: ${query}`);
        return null;
    } catch (error) {
        console.error('[Music Search] Erro geral:', error.message);
        return null;
    }
}

function cleanOldCache() {
    const now = Date.now();
    for (const [key, value] of API_CACHE.entries()) {
        if (now > value.expireAt) API_CACHE.delete(key);
    }
}

setInterval(cleanOldCache, 30 * 60 * 1000);

module.exports = {
    searchMusic,
    searchJioSaavnAPI,
    searchSoundCloudAPI,
    searchYouTubeAPI,
    getAudioStream,
    API_CACHE
};
