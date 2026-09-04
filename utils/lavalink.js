/**
 * Cliente Lavalink v4 — busca + play na call
 * Env: LAVALINK_HOST, LAVALINK_PORT, LAVALINK_PASSWORD, LAVALINK_SECURE
 */
const axios = require('axios');
const { EventEmitter } = require('events');

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
    }

    config() {
        const host = process.env.LAVALINK_HOST || process.env.LAVALINK_URL || '';
        if (!host) return null;
        let hostname = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
        let port = process.env.LAVALINK_PORT || '';
        let secure = process.env.LAVALINK_SECURE === 'true' || host.startsWith('https');
        if (hostname.includes(':') && !port) {
            const [h, p] = hostname.split(':');
            hostname = h;
            port = p;
        }
        port = port || (secure ? '443' : '2333');
        const password = process.env.LAVALINK_PASSWORD || process.env.LAVALINK_PASS || 'youshallnotpass';
        return { hostname, port: String(port), secure, password };
    }

    isAvailable() {
        return this.enabled && this.ready && !!this.sessionId;
    }

    restBase() {
        const c = this.config();
        if (!c) return null;
        const proto = c.secure ? 'https' : 'http';
        return `${proto}://${c.hostname}:${c.port}`;
    }

    async init(client) {
        this.client = client;
        const c = this.config();
        if (!c || !WebSocket) {
            if (!WebSocket) console.warn('[lavalink] pacote "ws" não instalado');
            else console.log('[lavalink] não configurado (defina LAVALINK_HOST)');
            this.enabled = false;
            return false;
        }
        this.enabled = true;
        client.on('raw', (packet) => this.onRaw(packet));
        this.connect();
        return true;
    }

    connect() {
        const c = this.config();
        if (!c || !this.client?.user?.id) {
            if (this.client && !this.client.user) {
                this.client.once('clientReady', () => this.connect());
                this.client.once('ready', () => this.connect());
            }
            return;
        }

        if (this.ws) {
            try {
                this.ws.removeAllListeners();
                this.ws.close();
            } catch (_) {}
        }

        const proto = c.secure ? 'wss' : 'ws';
        const url = `${proto}://${c.hostname}:${c.port}/v4/websocket`;

        try {
            this.ws = new WebSocket(url, {
                headers: {
                    Authorization: c.password,
                    'User-Id': this.client.user.id,
                    'Client-Name': 'Aeternus/2.0'
                }
            });
        } catch (e) {
            console.error('[lavalink] WS create:', e.message);
            this.scheduleReconnect();
            return;
        }

        this.ws.on('open', () => {
            console.log(`[lavalink] conectado em ${c.hostname}:${c.port}`);
        });

        this.ws.on('message', (data) => {
            try {
                const msg = JSON.parse(String(data));
                this.onMessage(msg);
            } catch (_) {}
        });

        this.ws.on('close', (code) => {
            console.warn(`[lavalink] WS fechado (${code})`);
            this.ready = false;
            this.sessionId = null;
            this.scheduleReconnect();
        });

        this.ws.on('error', (err) => {
            console.error('[lavalink] WS erro:', err.message);
        });
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.enabled) this.connect();
        }, 5000);
    }

    onMessage(msg) {
        if (msg.op === 'ready') {
            this.sessionId = msg.sessionId;
            this.ready = true;
            console.log('[lavalink] sessão pronta:', this.sessionId);
            this.emit('ready');
            return;
        }
        if (msg.op === 'event') {
            const guildId = msg.guildId;
            const type = msg.type;
            if (type === 'TrackEndEvent' || type === 'TrackStuckEvent' || type === 'TrackExceptionEvent') {
                if (type === 'TrackExceptionEvent') {
                    console.error('[lavalink] track exception:', msg.exception?.message || msg);
                }
                if (msg.reason === 'replaced') return;
                this.emit('trackEnd', guildId, msg);
            }
            if (type === 'TrackStartEvent') {
                this.emit('trackStart', guildId, msg);
            }
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

    async rest(method, path, body) {
        const base = this.restBase();
        const c = this.config();
        if (!base || !c) throw new Error('Lavalink não configurado');
        const res = await axios({
            method,
            url: `${base}${path}`,
            data: body,
            headers: {
                Authorization: c.password,
                'Content-Type': 'application/json'
            },
            timeout: 15000,
            validateStatus: () => true
        });
        if (res.status >= 400) {
            const msg = res.data?.message || res.statusText || String(res.status);
            throw new Error(`Lavalink HTTP ${res.status}: ${msg}`);
        }
        return res.data;
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
            await this.rest('DELETE', `/v4/sessions/${this.sessionId}/players/${guildId}`);
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

        try {
            let data = await this.rest(
                'GET',
                `/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`
            );

            if (
                !isUrl &&
                (!data?.data?.length || data.loadType === 'empty' || data.loadType === 'error')
            ) {
                data = await this.rest(
                    'GET',
                    `/v4/loadtracks?identifier=${encodeURIComponent(`scsearch:${q}`)}`
                );
            }

            return this.normalizeLoadResult(data, q);
        } catch (e) {
            console.error('[lavalink] search:', e.message);
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
            throw new Error('Não consegui conectar na call (voice state). Verifique permissões de voz.');
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
            return { ok: false, error: 'Lavalink offline', fallback: true };
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
            lavalink: true
        };
    }

    hasPlayer(guildId) {
        const s = players.get(guildId);
        return !!(s && (s.current || s.queue.length));
    }
}

const manager = new LavalinkManager();

manager.on('trackEnd', (guildId) => {
    manager.playNext(guildId).catch(() => {});
});

module.exports = manager;
