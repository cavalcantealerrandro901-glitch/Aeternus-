/**
 * Sistema de música — Shoukaku + Lavalink v4 (Serenetia)
 *
 * BUG CORRIGIDO: shoukaku@4.1.1 só escutava "ready", mas discord.js v14
 * emite "clientReady". Sem isso os nodes NUNCA conectavam e o áudio não saía.
 */
let Shoukaku, Connectors;
try {
    ({ Shoukaku, Connectors } = require('shoukaku'));
} catch (e) {
    console.warn('[music] shoukaku não instalado — npm i shoukaku');
}

const { getNodes } = require('../utils/musicNodes');
const musicManager = require('../utils/musicManager');
const youtubeOauth = require('../utils/youtubeOauth');

const lastLog = new Map();
function throttledLog(key, fn, ms = 60_000) {
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
    try {
        return nodesMap.values().next().value || null;
    } catch {
        return null;
    }
}

/**
 * Connector que escuta clientReady E ready (compat d.js 14 + shoukaku antigo).
 */
function createConnector(client) {
    const Base = Connectors.DiscordJS;
    class AeternusConnector extends Base {
        listen(nodes) {
            let started = false;
            const start = () => {
                if (started) return;
                started = true;
                console.log('[music] Discord ready → registrando nodes Lavalink…');
                try {
                    this.ready(nodes);
                } catch (e) {
                    console.error('[music] ready(nodes) falhou:', e.message);
                }
            };
            this.client.once('clientReady', start);
            this.client.once('ready', start);
            this.client.on('raw', (packet) => {
                // Diagnóstico seguro: registra apenas presença dos campos de voz,
                // nunca imprime token, sessionId ou endpoint completo.
                if (process.env.MUSIC_DEBUG === '1' &&
                    (packet?.t === 'VOICE_STATE_UPDATE' || packet?.t === 'VOICE_SERVER_UPDATE')) {
                    const d = packet.d || {};
                    console.log(
                        `[music:voice-gateway] type=${packet.t} guild=${d.guild_id || '?'} ` +
                        `channel=${d.channel_id ? 'yes' : 'no'} session=${d.session_id ? 'yes' : 'no'} ` +
                        `token=${d.token ? 'yes' : 'no'} endpoint=${d.endpoint ? 'yes' : 'no'}`
                    );
                }
                this.raw(packet);
            });

            // bot já online (hot-reload)
            if (this.client.user?.id || this.client.isReady?.()) {
                setTimeout(start, 300);
            }
        }
    }
    return new AeternusConnector(client);
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
        shoukaku = new Shoukaku(createConnector(client), nodes, {
            moveOnDisconnect: true,
            resume: true,
            resumeTimeout: 90,
            reconnectTries: 20,
            reconnectInterval: 5,
            restTimeout: 45,
            userAgent: 'Aeternus/2.2 (Shoukaku)',
            voiceConnectionTimeout: 60,
            nodeResolver: (map) => pickIdealNode(map)
        });
    } catch (e) {
        console.error('[music] falha ao iniciar Shoukaku:', e.message);
        return;
    }

    client.shoukaku = shoukaku;

    if (typeof shoukaku.getIdealNode !== 'function') {
        shoukaku.getIdealNode = () => pickIdealNode(shoukaku.nodes);
    }
    if (typeof shoukaku.getNode !== 'function') {
        shoukaku.getNode = () => pickIdealNode(shoukaku.nodes);
    }

    shoukaku.on('ready', (name, reconnected) => {
        console.log(
            `🎵 [lavalink] ONLINE: ${name}${reconnected ? ' (reconectado)' : ''}`
        );
        const node = shoukaku.nodes.get(name);
        if (node) {
            // Descobre a versão real do node externo sem depender do painel web.
            const restUrl = String(node.rest?.url || '').replace(/\\/v\\d+\\/?$/, '');
            const auth = node.rest?.auth || node.options?.auth;
            if (restUrl && auth) {
                fetch(`${restUrl}/version`, {
                    headers: { Authorization: auth, 'User-Agent': 'Aeternus/2.2 (Shoukaku)' }
                }).then(async (res) => {
                    const version = (await res.text()).trim().slice(0, 100);
                    console.log(`[music:lavalink-version] node=${name} http=${res.status} version=${res.ok ? version : 'indisponível'}`);
                }).catch((e) => {
                    console.warn(`[music:lavalink-version] node=${name} erro=${String(e?.message || e).slice(0, 100)}`);
                });
            } else {
                console.warn(`[music:lavalink-version] não foi possível consultar versão do node=${name}`);
            }
            youtubeOauth.applyYoutubeOauthToNode(node).catch(() => {});
        }
    });

    shoukaku.on('error', (name, error) => {
        const msg = error?.message || String(error || '');
        throttledLog(`err:${name}`, () => {
            console.warn(`🎵 [lavalink] erro ${name}: ${msg.slice(0, 180)}`);
        });
    });

    shoukaku.on('close', (name, code) => {
        throttledLog(`close:${name}`, () => {
            console.warn(`🎵 [lavalink] close ${name} code=${code}`);
        });
    });

    shoukaku.on('disconnect', (name) => {
        throttledLog(`disc:${name}`, () => {
            console.warn(`🎵 [lavalink] disconnect ${name}`);
        });
    });

    if (process.env.MUSIC_DEBUG === '1') {
        shoukaku.on('debug', (name, info) => console.log(`[music:debug] ${name}`, info));
    }

    const status = () => {
        try {
            const keys = [...(shoukaku.nodes?.keys?.() || [])];
            console.log(`🎵 [music] nodes no mapa: ${keys.join(', ') || '(vazio)'}`);
            for (const [name, node] of shoukaku.nodes || []) {
                console.log(
                    `  → ${name} state=${node?.state} session=${node?.sessionId ? 'yes' : 'no'}`
                );
            }
        } catch (e) {
            console.warn('[music] status:', e.message);
        }
    };

    client.once('clientReady', () => setTimeout(status, 2000));
    client.once('ready', () => setTimeout(status, 2000));
    setTimeout(status, 8000);

    console.log(`[music] Shoukaku preparado · ${nodes.length} node(s) (aguardando Discord ready)`);
    for (const n of nodes) {
        console.log(`  → ${n.name} @ ${n.url} secure=${!!n.secure}`);
    }
}

module.exports = { setup, musicManager };
