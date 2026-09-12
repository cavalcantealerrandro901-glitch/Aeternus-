/**
 * Sistema de música — Shoukaku + múltiplos nodes Lavalink.
 * Aplica token OAuth do YouTube (env do bot) em cada node ao conectar.
 */
const { Shoukaku, Connectors } = require('shoukaku');
const { getNodes } = require('../utils/musicNodes');
const musicManager = require('../utils/musicManager');
const youtubeOauth = require('../utils/youtubeOauth');

/** evita flood no log / autoRepair */
const lastLog = new Map();
function throttledLog(key, fn, ms = 60_000) {
    const now = Date.now();
    const prev = lastLog.get(key) || 0;
    if (now - prev < ms) return;
    lastLog.set(key, now);
    fn();
}

function setup(client) {
    const nodes = getNodes();
    if (!nodes.length) {
        console.warn('[music] Nenhum node configurado — música desativada.');
        return;
    }

    const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
        moveOnDisconnect: true,
        resume: true,
        resumeTimeout: 60,
        reconnectTries: 6,
        reconnectInterval: 12,
        restTimeout: 45,
        userAgent: 'Aeternus/2.0 (Shoukaku)',
        voiceConnectionTimeout: 30
    });

    client.shoukaku = shoukaku;

    shoukaku.on('ready', (name, reconnected) => {
        throttledLog(
            `ready:${name}`,
            () =>
                console.log(
                    `🎵 [lavalink] node pronto: ${name}${reconnected ? ' (reconectado)' : ''}`
                ),
            15_000
        );

        // Envia refresh token do bot → plugin youtube do node
        const node = shoukaku.nodes.get(name);
        if (node) {
            youtubeOauth.applyYoutubeOauthToNode(node).catch((e) => {
                console.warn('[music] oauth on ready:', e.message);
            });
        }
    });

    shoukaku.on('error', (name, error) => {
        const msg = error?.message || String(error || '');
        if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|ECONNRESET|socket hang up|1006/i.test(msg)) {
            throttledLog(`err:${name}`, () => {
                console.warn(`🎵 [lavalink] ${name} offline/instável: ${msg}`);
            });
            return;
        }
        throttledLog(`err2:${name}:${msg.slice(0, 40)}`, () => {
            console.error(`🎵 [lavalink] erro em ${name}:`, msg);
        });
    });

    shoukaku.on('close', (name, code, reason) => {
        throttledLog(`close:${name}:${code}`, () => {
            console.warn(`🎵 [lavalink] fechado ${name} · ${code} · ${reason || ''}`);
        });
    });

    shoukaku.on('disconnect', (name, count) => {
        throttledLog(`disc:${name}`, () => {
            console.warn(`🎵 [lavalink] disconnect ${name} · players: ${count}`);
        });
    });

    shoukaku.on('debug', (name, info) => {
        if (process.env.MUSIC_DEBUG === '1') console.log(`[music:debug] ${name}`, info);
    });

    const logActive = () => {
        console.log(
            `🎵 [music] Shoukaku · configurados: ${nodes.length} · mapa: ${[...shoukaku.nodes.keys()].join(', ') || '—'}`
        );
        // segunda tentativa (nodes que já estavam ready antes do listener)
        youtubeOauth.applyToAllNodes(shoukaku).catch(() => {});
    };

    client.on('clientReady', logActive);
    client.on('ready', logActive);

    const found = youtubeOauth.getRefreshTokenFromEnv();
    if (found) {
        console.log(`[music] YouTube OAuth token detectado no env (${found.key}) — será enviado aos nodes`);
    } else {
        console.log(
            '[music] Sem token YouTube no env do bot. Use YOUTUBE_OAUTH_REFRESH_TOKEN se tiver.'
        );
    }

    console.log(`[music] Shoukaku · ${nodes.length} node(s) configurado(s)`);
    for (const n of nodes) {
        console.log(`  → ${n.name} @ ${n.url} (secure=${!!n.secure})`);
    }
}

module.exports = { setup, musicManager };
