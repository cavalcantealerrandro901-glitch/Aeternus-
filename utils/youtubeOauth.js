/**
 * Envia o refresh token do YouTube do bot para o node Lavalink (plugin youtube-source).
 * POST /youtube { refreshToken, skipInitialization }
 *
 * Variáveis aceitas no Render do BOT:
 *   YOUTUBE_OAUTH_REFRESH_TOKEN
 *   YOUTUBE_REFRESH_TOKEN
 *   PLUGINS_YOUTUBE_OAUTH_REFRESHTOKEN
 *   YOUTUBE_TOKEN
 *   GOOGLE_REFRESH_TOKEN
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

/**
 * @param {import('shoukaku').Node} node
 */
async function applyYoutubeOauthToNode(node) {
    const found = getRefreshTokenFromEnv();
    if (!found) {
        console.log(
            '[music] YouTube OAuth: nenhum token no env do bot (YOUTUBE_OAUTH_REFRESH_TOKEN etc.)'
        );
        return { ok: false, reason: 'no_token' };
    }

    const name = node?.name || '?';
    try {
        // Shoukaku Node.rest — path relativo à base do node
        const res = await node.rest.post('/youtube', {
            refreshToken: found.token,
            skipInitialization: true
        });

        console.log(
            `🎵 [music] YouTube OAuth aplicado em ${name} (env=${found.key})`,
            res && typeof res === 'object' ? JSON.stringify(res).slice(0, 120) : ''
        );
        return { ok: true, node: name, envKey: found.key };
    } catch (e1) {
        // algumas builds usam body em formato diferente / rota sem barra
        try {
            const res = await node.rest.post('youtube', {
                refreshToken: found.token,
                skipInitialization: true
            });
            console.log(`🎵 [music] YouTube OAuth aplicado em ${name} (rota alt)`, res);
            return { ok: true, node: name, envKey: found.key };
        } catch (e2) {
            const msg = e2?.message || e1?.message || String(e2 || e1);
            console.warn(`🎵 [music] falha ao aplicar YouTube OAuth em ${name}: ${msg}`);
            return { ok: false, reason: msg, node: name };
        }
    }
}

/**
 * Aplica em todos os nodes prontos do Shoukaku.
 * @param {import('shoukaku').Shoukaku} shoukaku
 */
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
