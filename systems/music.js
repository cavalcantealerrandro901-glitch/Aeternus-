/**
 * Sistema de música — Shoukaku endurecido (reconnect, failover, sem spam).
 */
const { Shoukaku, Connectors } = require('shoukaku');
const { getNodes } = require('../utils/musicNodes');
const musicManager = require('../utils/musicManager');
const youtubeOauth = require('../utils/youtubeOauth');

const lastLog = new Map();
function throttledLog(key, fn, ms = 90_000) {
    const now = Date.now();
    const prev = lastLog.get(key) || 0;
    if (now - prev < ms) return;
    lastLog.set(key, now);
    try {
        fn();
    } catch (_) {}
}

function setup(client) {
    const nodes = getNodes();
    if (!nodes.length) {
        console.warn('[music] Nenhum node — música desativada.');
        return;
    }

    let shoukaku;
    try {
        shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
            moveOnDisconnect: true,
            resume: true,
            resumeTimeout: 90,
            reconnectTries: 12,
            reconnectInterval: 8,
            restTimeout: 30,
            userAgent: 'Aeternus/2.1 (Shoukaku)',
            voiceConnectionTimeout: 45,
            nodeResolver: (map) => {
                // prefere node com menos players / conectado
                let best = null;
                let bestScore = Infinity;
                for (const node of map.values()) {
                    const st = node.state;
                    const connected = st === 2 || st === 'CONNECTED' || !!node.sessionId;
                    if (!connected) continue;
                    const players = node.players?.size ?? 0;
                    const pen = node.penalties ?? 0;
                    const score = players * 10 + pen;
                    if (score < bestScore) {
                        bestScore = score;
                        best = node;
                    }
                }
                return best || map.values().next().value || null;
            }
        });
    } catch (e) {
        console.error('[music] falha ao iniciar Shoukaku:', e.message);
        return;
    }

    client.shoukaku = shoukaku;

    shoukaku.on('ready', (name, reconnected) => {
        throttledLog(`ready:${name}`, () => {
            console.log(
                `🎵 [lavalink] node pronto: ${name}${reconnected ? ' (reconectado)' : ''}`
            );
        }, 20_000);

        const node = shoukaku.nodes.get(name);
        if (node) {
            youtubeOauth.applyYoutubeOauthToNode(node).catch(() => {});
        }
    });

    shoukaku.on('error', (name, error) => {
        const msg = error?.message || String(error || '');
        // nunca console.error em erros de rede esperados (autoRepair)
        throttledLog(`err:${name}:${msg.slice(0, 30)}`, () => {
            console.warn(`🎵 [lavalink] ${name}: ${msg.slice(0, 120)}`);
        });
    });

    shoukaku.on('close', (name, code) => {
        throttledLog(`close:${name}:${code}`, () => {
            console.warn(`🎵 [lavalink] fechado ${name} · ${code}`);
        });
    });

    shoukaku.on('disconnect', (name) => {
        throttledLog(`disc:${name}`, () => {
            console.warn(`🎵 [lavalink] disconnect ${name}`);
        });
    });

    shoukaku.on('debug', (name, info) => {
        if (process.env.MUSIC_DEBUG === '1') console.log(`[music:debug] ${name}`, info);
    });

    // evita uncaught de eventos do player
    process.on?.('unhandledRejection', (err) => {
        const m = err?.message || String(err || '');
        if (/shoukaku|lavalink|voice/i.test(m)) {
            console.warn('[music] rejection engolida:', m.slice(0, 120));
        }
    });

    const logActive = () => {
        try {
            console.log(
                `🎵 [music] nodes: ${nodes.length} · mapa: ${[...shoukaku.nodes.keys()].join(', ') || '—'}`
            );
            youtubeOauth.applyToAllNodes(shoukaku).catch(() => {});
        } catch (_) {}
    };

    client.on('clientReady', logActive);
    client.on('ready', logActive);

    console.log(`[music] Shoukaku · ${nodes.length} node(s)`);
    for (const n of nodes) {
        console.log(`  → ${n.name} @ ${n.url} (secure=${!!n.secure})`);
    }
}

module.exports = { setup, musicManager };
