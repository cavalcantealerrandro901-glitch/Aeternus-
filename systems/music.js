/**
 * Sistema de música — Shoukaku + Lavalink v4 (Serenetia)
 */
let Shoukaku, Connectors;
try {
    ({ Shoukaku, Connectors } = require('shoukaku'));
} catch (e) {
    console.warn('[music] shoukaku não instalado — música desativada. npm i shoukaku');
}

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

function pickIdealNode(nodesMap) {
    if (!nodesMap || typeof nodesMap.values !== 'function') return null;
    let best = null;
    let bestScore = Infinity;
    for (const node of nodesMap.values()) {
        if (!node) continue;
        const st = node.state;
        const connected =
            st === 2 ||
            st === 'CONNECTED' ||
            String(st).toUpperCase() === 'CONNECTED' ||
            !!node.sessionId;
        if (!connected) continue;
        const players = node.players?.size ?? 0;
        const pen = Number(node.penalties ?? 0) || 0;
        const score = players * 10 + pen;
        if (score < bestScore) {
            bestScore = score;
            best = node;
        }
    }
    if (best) return best;
    // fallback: qualquer node no mapa
    try {
        return nodesMap.values().next().value || null;
    } catch {
        return null;
    }
}

function setup(client) {
    if (!Shoukaku) {
        console.warn('[music] desativado (sem shoukaku)');
        return;
    }
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
            reconnectTries: 15,
            reconnectInterval: 6,
            restTimeout: 45,
            userAgent: 'Aeternus/2.1 (Shoukaku)',
            voiceConnectionTimeout: 60,
            nodeResolver: (map) => pickIdealNode(map)
        });
    } catch (e) {
        console.error('[music] falha ao iniciar Shoukaku:', e.message);
        return;
    }

    client.shoukaku = shoukaku;

    // Polyfill Shoukaku v3 → v4 (tocar.js / musicManager)
    if (typeof shoukaku.getIdealNode !== 'function') {
        shoukaku.getIdealNode = () => pickIdealNode(shoukaku.nodes);
    }
    if (typeof shoukaku.getNode !== 'function') {
        shoukaku.getNode = () => pickIdealNode(shoukaku.nodes);
    }

    shoukaku.on('ready', (name, reconnected) => {
        throttledLog(
            `ready:${name}`,
            () => {
                console.log(
                    `🎵 [lavalink] node pronto: ${name}${reconnected ? ' (reconectado)' : ''}`
                );
            },
            15_000
        );
        const node = shoukaku.nodes.get(name);
        if (node) {
            youtubeOauth.applyYoutubeOauthToNode(node).catch(() => {});
        }
    });

    shoukaku.on('error', (name, error) => {
        const msg = error?.message || String(error || '');
        throttledLog(`err:${name}:${msg.slice(0, 40)}`, () => {
            console.warn(`🎵 [lavalink] ${name}: ${msg.slice(0, 160)}`);
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

    const forceConnectHint = () => {
        try {
            const keys = [...(shoukaku.nodes?.keys?.() || [])];
            console.log(`🎵 [music] nodes no mapa: ${keys.join(', ') || '—'}`);
            for (const [name, node] of shoukaku.nodes || []) {
                const st = node?.state;
                const ok = st === 2 || st === 'CONNECTED' || !!node?.sessionId;
                console.log(`  → ${name} state=${st} session=${!!node?.sessionId} ok=${ok}`);
                // força connect se o connector do d.js v14 não disparou "ready"
                if (!ok && typeof node?.connect === 'function') {
                    try {
                        node.connect();
                        console.log(`  ↻ connect() forçado em ${name}`);
                    } catch (e) {
                        console.warn(`  connect fail ${name}:`, e.message);
                    }
                }
            }
            youtubeOauth.applyToAllNodes(shoukaku).catch(() => {});
        } catch (e) {
            console.warn('[music] forceConnect:', e.message);
        }
    };

    // discord.js v14: clientReady; algumas versões ainda emitem ready
    client.once('clientReady', forceConnectHint);
    client.once('ready', forceConnectHint);
    // se o bot já estiver online (hot-reload)
    if (client.isReady?.() || client.readyAt) {
        setTimeout(forceConnectHint, 1500);
    }
    // retry extra (Render / cold start)
    setTimeout(forceConnectHint, 5000);
    setTimeout(forceConnectHint, 15000);

    console.log(`[music] Shoukaku · ${nodes.length} node(s)`);
    for (const n of nodes) {
        console.log(`  → ${n.name} @ ${n.url} (secure=${!!n.secure})`);
    }
}

module.exports = { setup, musicManager };
