/**
 * Cliente Lavalink v4 — multi-node com failover automático
 * Ver utils/lavalinkNodes.js para parsing do .env
 */
const axios = require('axios');
const { EventEmitter } = require('events');
const { parseNodesFromEnv } = require('./lavalinkNodes');

let WebSocket;
try {
    WebSocket = require('ws');
} catch (_) {
    WebSocket = null;
}

const players = new Map();

class LavalinkManager extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.sessionId = null;
        this.ready = false;
        this.client = null;
        this.reconnectTimer = null;
        this.voiceServers = new Map();
        this.voiceStates = new Map();
        this.enabled = false;
        this.nodes = [];
        this.nodeIndex = 0;
        this.connecting = false;
        this.failStreak = 0;
    }

    currentNode() {
        if (!this.nodes.length) return null;
        return this.nodes[this.nodeIndex % this.nodes.length];
    }

    isAvailable() {
        return this.enabled && this.ready && !!this.sessionId && !!this.currentNode();
    }

    restBase() {
        const c = this.currentNode();
        if (!c) return null;
        const proto = c.secure ? 'https' : 'http';
        return `${proto}://${c.hostname}:${c.port}`;
    }

    async init(client) {
        this.client = client;
        this.nodes = parseNodesFromEnv();

        if (!WebSocket) {
            console.warn('[lavalink] pacote "ws" não instalado (npm i ws)');
            this.enabled = false;
            return false;
        }
        if (!this.nodes.length) {
            console.log('[lavalink] nenhum node configurado (LAVALINK_NODES ou LAVALINK_HOST)');
            this.enabled = false;
            return false;
        }

        this.enabled = true;
        console.log(
            `[lavalink] ${this.nodes.length} node(s): ${this.nodes.map((n) => n.label).join(' | ')}`
        );

        client.on('raw', (packet) => this.onRaw(packet));
        this.connect();
        return true;
    }

    rotateNode(reason = '') {
        if (this.nodes.length <= 1) return this.currentNode();
        const prev = this.currentNode()?.label;
        this.nodeIndex = (this.nodeIndex + 1) % this.nodes.length;
        this.ready = false;
        this.sessionId = null;
        const next = this.currentNode();
        console.warn(
            `[lavalink] failover${reason ? ` (${reason})` : ''}: ${prev} → ${next?.label}`
        );
        return next;
    }

    connect() {
        if (!this.enabled || this.connecting) return;

        const c = this.currentNode();
        if (!c) return;

        if (!this.client?.user?.id) {
            if (this.client && !this.client.user) {
                this.client.once('clientReady', () => this.connect());
                this.client.once('ready', () => this.connect());
            }
            return;
        }

        this.connecting = true;
        this.ready = false;
        this.sessionId = null;

        if (this.ws) {
            try {
                this.ws.removeAllListeners();
                this.ws.close();
            } catch (_) {}
            this.ws = null;
        }

        const proto = c.secure ? 'wss' : 'ws';
        const url = `${proto}://${c.hostname}:${c.port}/v4/websocket`;

        console.log(`[lavalink] conectando em ${c.label} (secure=${c.secure})…`);

        try {
            this.ws = new WebSocket(url, {
                headers: {
                    Authorization: c.password,
                    'User-Id': this.client.user.id,
                    'Client-Name': 'Aeternus/2.0'
                },
                handshakeTimeout: 12000
            });
        } catch (e) {
            console.error('[lavalink] WS create:', e.message);
            this.connecting = false;
            this.scheduleReconnect(true);
            return;
        }

        const connectTimeout = setTimeout(() => {
            if (!this.ready) {
                console.warn(`[lavalink] timeout em ${c.label}`);
                try {
                    this.ws?.terminate?.();
                    this.ws?.close?.();
                } catch (_) {}
            }
        }, 15000);

        this.ws.on('open', () => {
            console.log(`[lavalink] WS aberto: ${c.label}`);
        });

        this.ws.on('message', (data) => {
            try {
                const msg = JSON.parse(String(data));
                this.onMessage(msg);
            } catch (_) {}
        });

        this.ws.on('close', (code) => {
            clearTimeout(connectTimeout);
            this.connecting = false;
            const wasReady = this.ready;
            this.ready = false;
            this.sessionId = null;
            console.warn(`[lavalink] WS fechado (${code}) em ${c.label}`);
            this.scheduleReconnect(!wasReady || code !== 1000);
        });

        this.ws.on('error', (err) => {
            console.error(`[lavalink] WS erro (${c.label}):`, err.message);
        });
    }

    scheduleReconnect(failover = false) {
        if (this.reconnectTimer) return;
        const delay = failover && this.nodes.length > 1 ? 1500 : 4000;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.enabled) return;
            if (failover && this.nodes.length > 1) {
                this.failStreak += 1;
                this.rotateNode('reconnect');
            }
            this.connect();
        }, delay);
    }

    onMessage(msg) {
        if (msg.op === 'ready') {
            this.sessionId = msg.sessionId;
            this.ready = true;
            this.connecting = false;
            this.failStreak = 0;
            const n = this.currentNode();
            console.log(`[lavalink] sessão pronta em ${n?.label}: ${this.sessionId}`);
            this.emit('ready', n);
            for (const guildId of this.voiceStates.keys()) {
                this.trySendVoiceUpdate(guildId);
            }
            return;
        }
        if (msg.op === 'event') {
            const guildId = msg.guildId;
            const type = msg.type;
            if (
                type === 'TrackEndEvent' ||
                type === 'TrackStuckEvent' ||
                type === 'TrackExceptionEvent'
            ) {
                if (type === 'TrackExceptionEvent') {
                    console.error('[lavalink] track exception:', msg.exception?.message || msg);
                }
                if (msg.reason === 'replaced') return;
                this.emit('trackEnd', guildId, msg);
            }
            if (type === 'TrackStartEvent') this.emit('trackStart', guildId, msg);
        }
    }

    onRaw(packet) {
        if (!packet?.t) return;
        if (packet.t === 'VOICE_SERVER_UPDATE') {
            const guildId = packet.d.guild_id;
            this.voiceServers.set(guildId, packet.d);
            this.trySendVoiceUpdate(guildId);
        }
        if (packet.t === 'VOICE_STATE_UPDATE') {
            if (packet.d.user_id !== this.client?.user?.id) return;
            const guildId = packet.d.guild_id;
            if (packet.d.channel_id) {
                this.voiceStates.set(guildId, packet.d.session_id);
                this.trySendVoiceUpdate(guildId);
            } else {
                this.voiceStates.delete(guildId);
                this.voiceServers.delete(guildId);
            }
        }
    }

    async trySendVoiceUpdate(guildId) {
        if (!this.isAvailable()) return;
        const sessionId = this.voiceStates.get(guildId);
        const event = this.voiceServers.get(guildId);
        if (!sessionId || !event) return;
        try {
            await this.patchPlayer(guildId, {
                voice: {
                    token: event.token,
                    endpoint: event.endpoint,
                    sessionId
                }
            });
        } catch (e) {
            console.error('[lavalink] voice update:', e.message);
        }
    }

    async rest(method, path, body, { tryFailover = true } = {}) {
        const base = this.restBase();
        const c = this.currentNode();
        if (!base || !c) throw new Error('Lavalink não configurado');

        try {
            const res = await axios({
                method,
                url: `${base}${path}`,
                data: body,
                headers: {
                    Authorization: c.password,
                    'Content-Type': 'application/json'
                },
                timeout: 12000,
                validateStatus: () => true
            });
            if (res.status >= 400) {
                const msg = res.data?.message || res.statusText || String(res.status);
                throw new Error(`Lavalink HTTP ${res.status}: ${msg}`);
            }
            return res.data;
        } catch (e) {
            if (tryFailover && this.nodes.length > 1) {
                console.warn(`[lavalink] REST falhou em ${c.label}: ${e.message}`);
                this.rotateNode('rest');
                await new Promise((r) => {
                    const onReady = () => {
                        this.off('ready', onReady);
                        r();
                    };
                    this.on('ready', onReady);
                    this.connect();
                    setTimeout(r, 8000);
                });
                if (this.isAvailable()) {
                    return this.rest(method, path, body, { tryFailover: false });
                }
            }
            throw e;
        }
    }

    async patchPlayer(guildId, body) {
        if (!this.sessionId) throw new Error('Sessão Lavalink indisponível');
        return this.rest(
            'PATCH',
            `/v4/sessions/${this.sessionId}/players/${guildId}?noReplace=false`,
            body
        );
    }

    async destroyPlayer(guildId) {
        if (!this.sessionId) return;
        try {
            await this.rest('DELETE', `/v4/sessions/${this.sessionId}/players/${guildId}`, undefined, {
                tryFailover: false
            });
        } catch (_) {}
        players.delete(guildId);
    }

    async search(query) {
        if (!this.isAvailable()) return null;
        const q = String(query || '').trim();
        if (!q) return null;

        let identifier = q;
        const isUrl = /^https?:\/\//i.test(q);
        if (!isUrl) identifier = `ytsearch:${q}`;

        const tryLoad = async (id) => {
            return this.rest('GET', `/v4/loadtracks?identifier=${encodeURIComponent(id)}`);
        };

        try {
            let data = await tryLoad(identifier);
            if (
                !isUrl &&
                (!data?.data?.length || data.loadType === 'empty' || data.loadType === 'error')
            ) {
                data = await tryLoad(`scsearch:${q}`);
            }
            return this.normalizeLoadResult(data, q);
        } catch (e) {
            console.error('[lavalink] search:', e.message);
            if (this.nodes.length > 1) {
                for (let i = 1; i < this.nodes.length; i++) {
                    this.rotateNode('search');
                    await new Promise((r) => {
                        const onReady = () => {
                            this.off('ready', onReady);
                            r();
                        };
                        this.once('ready', onReady);
                        this.connect();
                        setTimeout(r, 8000);
                    });
                    if (!this.isAvailable()) continue;
                    try {
                        let data = await tryLoad(identifier);
                        if (
                            !isUrl &&
                            (!data?.data?.length ||
                                data.loadType === 'empty' ||
                                data.loadType === 'error')
                        ) {
                            data = await tryLoad(`scsearch:${q}`);
                        }
                        const track = this.normalizeLoadResult(data, q);
                        if (track) return track;
                    } catch (e2) {
                        console.error('[lavalink] search failover:', e2.message);
                    }
                }
            }
            return null;
        }
    }

    normalizeLoadResult(data, originalQuery) {
        if (!data) return null;
        const loadType = data.loadType;
        let tracks = [];

        if (loadType === 'track') {
            tracks = data.data ? [data.data] : [];
        } else if (loadType === 'search' || loadType === 'playlist') {
            tracks = Array.isArray(data.data?.tracks)
                ? data.data.tracks
                : Array.isArray(data.data)
                  ? data.data
                  : [];
        } else if (loadType === 'empty' || loadType === 'error') {
            return null;
        } else if (Array.isArray(data.tracks)) {
            tracks = data.tracks;
        }

        if (!tracks.length) return null;

        const t = tracks[0];
        const info = t.info || t;
        const encoded = t.encoded || t.track;
        if (!encoded) return null;

        return {
            title: info.title || originalQuery,
            url: info.uri || info.url || null,
            duration: Math.floor((info.length || info.duration || 0) / 1000),
            thumbnail:
                info.artworkUrl ||
                info.thumbnail ||
                (info.identifier
                    ? `https://img.youtube.com/vi/${info.identifier}/hqdefault.jpg`
                    : null),
            channel: info.author || info.artist || 'Lavalink',
            source: (info.sourceName || 'lavalink').toLowerCase(),
            encoded,
            lavalink: true,
            requestedBy: null
        };
    }

    getPlayerState(guildId) {
        if (!players.has(guildId)) {
            players.set(guildId, {
                queue: [],
                current: null,
                paused: false,
                volume: 100,
                channelId: null,
                textChannelId: null
            });
        }
        return players.get(guildId);
    }

    async join(guild, voiceChannel) {
        const guildId = guild.id;
        const channelId = voiceChannel.id;

        const sendOp4 = (chId) => {
            const payload = {
                op: 4,
                d: {
                    guild_id: guildId,
                    channel_id: chId,
                    self_mute: false,
                    self_deaf: true
                }
            };
            try {
                if (guild.shard?.send) guild.shard.send(payload);
                else if (this.client.ws?.shards) {
                    for (const s of this.client.ws.shards.values()) {
                        s.send(payload);
                    }
                }
            } catch (e) {
                console.error('[lavalink] op4:', e.message);
            }
        };

        try {
            const { getVoiceConnection } = require('@discordjs/voice');
            const conn = getVoiceConnection(guildId);
            if (conn) conn.destroy();
        } catch (_) {}

        sendOp4(channelId);

        for (let i = 0; i < 30; i++) {
            if (this.voiceStates.has(guildId) && this.voiceServers.has(guildId)) {
                await this.trySendVoiceUpdate(guildId);
                return true;
            }
            await new Promise((r) => setTimeout(r, 200));
        }

        await this.trySendVoiceUpdate(guildId);
        if (!this.voiceStates.has(guildId)) {
            throw new Error(
                'Não consegui conectar na call (voice state). Verifique permissões de voz.'
            );
        }
        return true;
    }

    async playEncoded(guildId, encoded, options = {}) {
        const volume = options.volume ?? 100;
        await this.patchPlayer(guildId, {
            track: { encoded },
            volume,
            paused: false
        });
    }

    async enqueue(guild, voiceChannel, textChannel, query, user) {
        if (!this.isAvailable()) {
            if (this.enabled && this.nodes.length) {
                await new Promise((r) => {
                    const onReady = () => {
                        this.off('ready', onReady);
                        r();
                    };
                    this.once('ready', onReady);
                    this.connect();
                    setTimeout(r, 6000);
                });
            }
            if (!this.isAvailable()) {
                return { ok: false, error: 'Lavalink offline', fallback: true };
            }
        }
        if (!voiceChannel) {
            return { ok: false, error: 'Entre em um canal de voz.' };
        }

        const track = await this.search(query);
        if (!track) {
            return { ok: false, error: null, fallback: true };
        }
        track.requestedBy = user || null;

        try {
            await this.join(guild, voiceChannel);
        } catch (e) {
            return { ok: false, error: e.message || 'Falha ao conectar na call.', fallback: true };
        }

        const state = this.getPlayerState(guild.id);
        state.channelId = voiceChannel.id;
        state.textChannelId = textChannel?.id || state.textChannelId;

        if (!state.current) {
            state.current = track;
            try {
                await this.playEncoded(guild.id, track.encoded, { volume: state.volume });
                return { ok: true, track, position: 0, playing: true, lavalink: true };
            } catch (e) {
                state.current = null;
                console.error('[lavalink] play:', e.message);
                return {
                    ok: false,
                    error: 'Lavalink não conseguiu tocar. Tentando outra fonte…',
                    fallback: true
                };
            }
        }

        state.queue.push(track);
        return { ok: true, track, position: state.queue.length, playing: false, lavalink: true };
    }

    async playNext(guildId) {
        const state = this.getPlayerState(guildId);
        if (state.queue.length) {
            state.current = state.queue.shift();
            try {
                await this.playEncoded(guildId, state.current.encoded, { volume: state.volume });
                return true;
            } catch (e) {
                console.error('[lavalink] playNext:', e.message);
                state.current = null;
                return this.playNext(guildId);
            }
        }
        state.current = null;
        return false;
    }

    skip(guildId) {
        const state = this.getPlayerState(guildId);
        if (!state.current && !state.queue.length) return false;
        this.patchPlayer(guildId, { track: { encoded: null } }).catch(() => {});
        setTimeout(() => this.playNext(guildId), 150);
        return true;
    }

    async pause(guildId) {
        const state = this.getPlayerState(guildId);
        if (!state.current) return false;
        await this.patchPlayer(guildId, { paused: true });
        state.paused = true;
        return true;
    }

    async resume(guildId) {
        const state = this.getPlayerState(guildId);
        if (!state.current) return false;
        await this.patchPlayer(guildId, { paused: false });
        state.paused = false;
        return true;
    }

    async setVolume(guildId, vol) {
        const state = this.getPlayerState(guildId);
        state.volume = Math.max(0, Math.min(150, Math.floor(Number(vol) || 100)));
        if (state.current) {
            await this.patchPlayer(guildId, { volume: state.volume }).catch(() => {});
        }
        return state.volume;
    }

    async stop(guildId) {
        const state = this.getPlayerState(guildId);
        state.queue = [];
        state.current = null;
        state.paused = false;
        await this.destroyPlayer(guildId);
        try {
            if (this.client) {
                const guild = this.client.guilds.cache.get(guildId);
                if (guild?.shard) {
                    guild.shard.send({
                        op: 4,
                        d: {
                            guild_id: guildId,
                            channel_id: null,
                            self_mute: false,
                            self_deaf: false
                        }
                    });
                }
            }
        } catch (_) {}
        this.voiceServers.delete(guildId);
        this.voiceStates.delete(guildId);
        return true;
    }

    getQueueView(guildId) {
        const state = this.getPlayerState(guildId);
        return {
            current: state.current,
            queue: [...state.queue],
            loop: false,
            volume: state.volume,
            paused: state.paused,
            lavalink: true,
            node: this.currentNode()?.label || null
        };
    }

    hasPlayer(guildId) {
        const s = players.get(guildId);
        return !!(s && (s.current || s.queue.length));
    }

    listNodes() {
        return this.nodes.map((n, i) => ({
            ...n,
            active: i === this.nodeIndex % Math.max(1, this.nodes.length)
        }));
    }
}

const manager = new LavalinkManager();

manager.on('trackEnd', (guildId) => {
    manager.playNext(guildId).catch(() => {});
});

module.exports = manager;
