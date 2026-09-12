/**
 * Envia o refresh token do YouTube do bot para o node Lavalink (plugin youtube-source).
 * Rota do plugin: POST /youtube (FORA do prefixo /v4 do Shoukaku).
 *
 * Env aceitos no BOT:
 *   YOUTUBE_OAUTH_REFRESH_TOKEN | YOUTUBE_REFRESH_TOKEN |
 *   PLUGINS_YOUTUBE_OAUTH_REFRESHTOKEN | YOUTUBE_TOKEN | GOOGLE_REFRESH_TOKEN
 */

function getRefreshTokenFromEnv() {
    const keys = [
        'YOUTUBE_OAUTH_REFRESH_TOKEN',
        'YOUTUBE_REFRESH_TOKEN',
        'PLUGINS_YOUTUBE_OAUTH_REFRESHTOKEN',
        'PLUGINS_YOUTUBE_OAUTH_REFRESH_TOKEN',
        'YOUTUBE_TOKEN',
        'GOOGLE_REFRESH_TOKEN'
    ];
    for (const k of keys) {
        const v = String(process.env[k] || '').trim();
        if (v && v.length > 10) return { key: k, token: v };
    }
    return null;
}

/** Extrai base URL (sem /v4) e auth a partir do node Shoukaku */
function getNodeHttp(node) {
    const rest = node?.rest;
    if (!rest) return null;

    // rest.url = https://host:443/v4
    let base = String(rest.url || '').replace(/\/v\d+\/?$/, '');
    if (!base && node.options) {
        const secure = !!node.options.secure;
        const host = String(node.options.url || '').replace(/^https?:\/\//, '');
        base = `${secure ? 'https' : 'http'}://${host}`;
    }
    const auth = rest.auth || node.options?.auth || null;
    if (!base || !auth) return null;
    return { base, auth };
}

/**
 * @param {import('shoukaku').Node} node
 */
async function applyYoutubeOauthToNode(node) {
    const found = getRefreshTokenFromEnv();
    if (!found) {
        return { ok: false, reason: 'no_token' };
    }

    const http = getNodeHttp(node);
    if (!http) {
        console.warn('[music] YouTube OAuth: não consegui ler URL/auth do node');
        return { ok: false, reason: 'no_http' };
    }

    const name = node?.name || '?';
    const url = `${http.base}/youtube`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: http.auth,
                'Content-Type': 'application/json',
                'User-Agent': 'Aeternus/2.0'
            },
            body: JSON.stringify({
                refreshToken: found.token,
                skipInitialization: true
            })
        });

        const text = await res.text().catch(() => '');
        if (!res.ok) {
            console.warn(
                `🎵 [music] YouTube OAuth HTTP ${res.status} em ${name}: ${text.slice(0, 200)}`
            );
            return { ok: false, reason: `http_${res.status}`, node: name };
        }

        console.log(
            `🎵 [music] YouTube OAuth OK em ${name} (env=${found.key}) ${text.slice(0, 80)}`
        );
        return { ok: true, node: name, envKey: found.key };
    } catch (e) {
        console.warn(`🎵 [music] falha YouTube OAuth em ${name}: ${e.message || e}`);
        return { ok: false, reason: e.message, node: name };
    }
}

async function applyToAllNodes(shoukaku) {
    if (!shoukaku?.nodes) return;
    for (const [, node] of shoukaku.nodes) {
        try {
            await applyYoutubeOauthToNode(node);
        } catch (e) {
            console.warn('[music] youtube oauth loop:', e.message);
        }
    }
}

module.exports = {
    getRefreshTokenFromEnv,
    applyYoutubeOauthToNode,
    applyToAllNodes
};
