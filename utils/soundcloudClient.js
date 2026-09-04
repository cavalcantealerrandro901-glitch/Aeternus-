/**
 * client_id dinâmico do SoundCloud (renova em 401/403)
 */
const axios = require('axios');

let scClientId = process.env.SOUNDCLOUD_CLIENT_ID || '';
let scClientFetchedAt = 0;
let refreshing = null;

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchClientIdFromSite() {
    const { data: html } = await axios.get('https://soundcloud.com', {
        timeout: 10000,
        headers: { 'User-Agent': UA, Accept: 'text/html' }
    });
    const scriptUrls = [
        ...String(html).matchAll(/src="(https:\/\/[^"]*sndcdn\.com\/assets\/[^"]+\.js)"/g)
    ].map((m) => m[1]);

    const extra = [
        'https://a-v2.sndcdn.com/assets/47-d5d2b8b9.js',
        'https://a-v2.sndcdn.com/assets/0-a8b7e2c1.js'
    ];

    for (const url of [...scriptUrls.slice(0, 12), ...extra]) {
        try {
            const { data: js } = await axios.get(url, {
                timeout: 10000,
                headers: { 'User-Agent': UA }
            });
            const patterns = [
                /client_id\s*[:=]\s*["']([a-zA-Z0-9]{32})["']/
,
                /"client_id"\s*:\s*"([a-zA-Z0-9]{32})"/
,
                /clientId["']?\s*[:=]\s*["']([a-zA-Z0-9]{32})["']/
            ];
            for (const re of patterns) {
                const m = String(js).match(re);
                if (m?.[1]) return m[1];
            }
        } catch (_) {}
    }
    return null;
}

async function getSoundCloudClientId(opts = {}) {
    const force = !!opts.force;
    const freshEnough =
        scClientId && Date.now() - scClientFetchedAt < 2 * 60 * 60 * 1000;

    if (!force && freshEnough) return scClientId;
    if (refreshing) return refreshing;

    refreshing = (async () => {
        try {
            const id = await fetchClientIdFromSite();
            if (id) {
                scClientId = id;
                scClientFetchedAt = Date.now();
                console.log('[soundcloud] client_id renovado');
                return scClientId;
            }
        } catch (e) {
            console.warn('[soundcloud] refresh client_id:', e.message);
        } finally {
            refreshing = null;
        }
        if (!scClientId && process.env.SOUNDCLOUD_CLIENT_ID) {
            scClientId = process.env.SOUNDCLOUD_CLIENT_ID;
        }
        scClientFetchedAt = Date.now();
        return scClientId || null;
    })();

    return refreshing;
}

async function soundcloudGet(path, params = {}) {
    let client_id = await getSoundCloudClientId();
    if (!client_id) throw new Error('SoundCloud client_id indispon\u00edvel');

    const url = path.startsWith('http') ? path : `https://api-v2.soundcloud.com${path}`;

    try {
        return await axios.get(url, {
            params: { ...params, client_id },
            timeout: 12000,
            headers: {
                'User-Agent': UA,
                Accept: 'application/json',
                Origin: 'https://soundcloud.com',
                Referer: 'https://soundcloud.com/'
            },
            validateStatus: (s) => s < 500
        });
    } catch (e) {
        if (e.response?.status === 401 || e.response?.status === 403) {
            client_id = await getSoundCloudClientId({ force: true });
            if (!client_id) throw e;
            return axios.get(url, {
                params: { ...params, client_id },
                timeout: 12000,
                headers: {
                    'User-Agent': UA,
                    Accept: 'application/json',
                    Origin: 'https://soundcloud.com',
                    Referer: 'https://soundcloud.com/'
                }
            });
        }
        throw e;
    }
}

async function searchTracks(query, limit = 5) {
    const res = await soundcloudGet('/search/tracks', {
        q: query,
        limit,
        app_locale: 'pt'
    });

    if (res.status === 401 || res.status === 403) {
        await getSoundCloudClientId({ force: true });
        const res2 = await soundcloudGet('/search/tracks', {
            q: query,
            limit,
            app_locale: 'pt'
        });
        if (res2.status >= 400) {
            const err = new Error(`Request failed with status code ${res2.status}`);
            err.response = res2;
            throw err;
        }
        return res2.data;
    }
    if (res.status >= 400) {
        const err = new Error(`Request failed with status code ${res.status}`);
        err.response = res;
        throw err;
    }
    return res.data;
}

module.exports = {
    getSoundCloudClientId,
    soundcloudGet,
    searchTracks
};
