/**
 * Música — Node.js + Lavalink v4 (Lavaplayer no servidor)
 *
 * ENV:
 *   LAVALINK_NODES=host:port:password:secure[,host2:...]
 *   ou host|port|password|secure  (melhor se a senha tiver ":")
 *   LAVALINK_NO_PUBLIC=1  → não usa nodes públicos embutidos
 *   LAVALINK_SEARCH_PREFIX=ytsearch:
 */

const WebSocket = require('ws');
const axios = require('axios');

const COLOR = 0xa78bfa;
const COLOR_ERR = 0xef4444;
const COLOR_WARN = 0xf59e0b;

let clientRef = null;
const guilds = new Map();
const pendingVoice = new Map();

let nodesConfig = [];
let ws = null;
let sessionId = null;
let activeNode = null;
let reconnectTimer = null;
let connecting = false;

function formatMs(ms) {
    if (!ms || ms < 0) return '—';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const ss = String(s % 60).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Nodes públicos de vários provedores (fallback + complementares) */
const DEFAULT_PUBLIC_NODES = [
    { host: 'lavalinkv4.serenetia.com', port: 443, password: 'BatuManaBisa', secure: true },
    { host: 'lavalinkv4-id.serenetia.com', port: 443, password: 'BatuManaBisa', secure: true },
    { host: 'lavalink.hewkawar.xyz', port: 443, password: 'HewkawArrPass', secure: true },
    { host: 'lava-v4.ajieblogs.eu.org', port: 443, password: 'https://dsc.gg/ajidevserver', secure: true },
    { host: 'free-lava.heavencloud.in', port: 4000, password: 'heavencloud.in', secure: false },
    { host: 'lava-v4.ajieblogs.eu.org', port: 80, password: 'https://dsc.gg/ajidevserver', secure: false },
    { host: 'lava4.horizxon.studio', port: 80, password: 'horizxon.studio', secure: false },
    { host: 'lava1.horizxon.studio', port: 80, password: 'horizxon.studio', secure: false }
];

function parseOneNode(part) {
    const s = String(part || '').trim();
    if (!s) return null;
    if (s.includes('|')) {
        const bits = s.split('|').map((x) => x.trim());
        if (bits.length < 3) return null;
        const host = bits[0];
        const port = Number(bits[1]);
        const secureRaw = bits[bits.length - 1].toLowerCase();
        const secure =
            secureRaw === 'true' || secureRaw === '1' || secureRaw === 'secure';
        const password = secure
            ? bits.slice(2, -1).join('|')
            : bits.slice(2).join('|');
        if (!host || !port) return null;
        return { host, port, password: password || 'youshallnotpass', secure };
    }
    const bits = s.split(':');
    if (bits.length < 3) return null;
    const last = bits[bits.length - 1].toLowerCase();
    const secure = last === 'true' || last === '1' || last === 'secure';
    if (secure) {
        if (bits.length < 4) return null;
        const port = Number(bits[bits.length - 3]);
        const password = bits[bits.length - 2];
        const host = bits.slice(0, -3).join(':');
        if (!host || !port) return null;
        return { host, port, password: password || 'youshallnotpass', secure: true };
    }
    const port = Number(bits[bits.length - 2]);
    const password = bits[bits.length - 1];
    const host = bits.slice(0, -2).join(':');
    if (!host || !port) return null;
    return {
        host,
        port,
        password: password || 'youshallnotpass',
        secure: port === 443
    };
}

function parseNodes() {
    const raw = String(process.env.LAVALINK_NODES || '').trim();
    const list = [];
    const seen = new Set();

    const push = (n) => {
        if (!n?.host || !n?.port) return;
        const key = `${n.host}:${n.port}:${n.secure ? 1 : 0}`;
        if (seen.has(key)) return;
        seen.add(key);
        list.push({
            host: n.host,
            port: Number(n.port),
            password: n.password || 'youshallnotpass',
            secure: !!n.secure
        });
    };

    if (raw) {
        for (const part of raw.split(',').map((x) => x.trim()).filter(Boolean)) {
            push(parseOneNode(part));
        }
    }

    const host = String(process.env.LAVALINK_HOST || '').trim();
    if (host) {
        const port = Number(process.env.LAVALINK_PORT || 2333);
        const password = String(process.env.LAVALINK_PASSWORD || 'youshallnotpass');
        const secure =
            String(process.env.LAVALINK_SECURE || '').toLowerCase() === 'true' ||
            port === 443;
        push({ host, port, password, secure });
    }

    const noPublic = String(process.env.LAVALINK_NO_PUBLIC || '').toLowerCase();
    if (noPublic !== '1' && noPublic !== 'true') {
        for (const n of DEFAULT_PUBLIC_NODES) push(n);
    }

    return list;
}

function getState(guildId) {
    if (!guilds.has(guildId)) {
        guilds.set(guildId, {
            guildId,
            queue: [],
            current: null,
            volume: 80,
            textChannelId: null,
            voiceChannelId: null,
            paused: false
        });
    }
    return guilds.get(guildId);
}

function restBase(node) {
    const scheme = node.secure ? 'https' : 'http';
    return `${scheme}://${node.host}:${node.port}`;
}

function wsUrl(node) {
    const scheme = node.secure ? 'wss' : 'ws';
    return `${scheme}://${node.host}:${node.port}/v4/websocket`;
}

async function rest(method, path, body) {
    if (!activeNode || !sessionId)
        throw new Error('Lavalink ainda não conectou.');
    const url = restBase(activeNode) + path;
    const res = await axios({
        method,
        url,
        data: body,
        headers: {
            Authorization: activeNode.password,
            'Content-Type': 'application/json'
        },
        timeout: 20000,
        validateStatus: () => true
    });
    if (res.status >= 400) {
        const msg =
            (res.data && (res.data.message || res.data.error)) ||
            `Lavalink HTTP ${res.status}`;
        throw new Error(String(msg));
    }
    return res.data;
}

async function loadItem(identifier) {
    if (!activeNode) throw new Error('Nenhum node Lavalink ativo.');
    const url =
        restBase(activeNode) +
        '/v4/loadtracks?identifier=' +
        encodeURIComponent(identifier);
    const res = await axios.get(url, {
        headers: { Authorization: activeNode.password },
        timeout: 25000,
        validateStatus: () => true
    });
    if (res.status >= 400) {
        throw new Error(
            (res.data && (res.data.message || res.data.error)) ||
                `loadtracks HTTP ${res.status}`
        );
    }
    return res.data;
}

function normalizeTrack(t, requester) {
    const info = t.info || {};
    return {
        encoded: t.encoded,
        title: info.title || 'Desconhecido',
        uri: info.uri || info.url || null,
        url: info.uri || info.url || null,
        length: info.length || 0,
        artwork: info.artworkUrl || info.artwork || null,
        author: info.author || null,
        identifier: info.identifier || null,
        isStream: !!info.isStream,
        requester: requester || null
    };
}

function searchPrefix() {
    return String(process.env.LAVALINK_SEARCH_PREFIX || 'ytsearch:').trim() || 'ytsearch:';
}

function resolveIdentifier(query) {
    const q = String(query || '').trim();
    if (!q) return q;
    if (/^https?:\/\//i.test(q)) return q;
    if (/^(ytsearch:|scsearch:|spsearch:|ymsearch:)/i.test(q)) return q;
    return searchPrefix() + q;
}

async function resolveQuery(query, requester) {
    const identifier = resolveIdentifier(query);
    const data = await loadItem(identifier);
    const loadType = data.loadType || data.load_type || '';

    if (loadType === 'track' || loadType === 'TRACK_LOADED') {
        const raw = data.data || data.tracks?.[0] || data.track;
        if (!raw) throw new Error('Faixa vazia.');
        return { tracks: [normalizeTrack(raw, requester)], playlist: null };
    }

    if (loadType === 'search' || loadType === 'SEARCH_RESULT') {
        const arr = data.data || data.tracks || [];
        if (!arr.length) throw new Error('Nenhum resultado.');
        return { tracks: [normalizeTrack(arr[0], requester)], playlist: null };
    }

    if (loadType === 'playlist' || loadType === 'PLAYLIST_LOADED') {
        const pl = data.data || data;
        const list = pl.tracks || [];
        if (!list.length) throw new Error('Playlist vazia.');
        return {
            tracks: list.slice(0, 50).map((t) => normalizeTrack(t, requester)),
            playlist: pl.info?.name || pl.name || 'Playlist'
        };
    }

    if (loadType === 'empty' || loadType === 'NO_MATCHES') {
        throw new Error('Nada encontrado para essa busca.');
    }

    if (loadType === 'error' || loadType === 'LOAD_FAILED') {
        const err = data.data || data.exception || {};
        throw new Error(err.message || err.cause || 'Falha ao carregar a faixa.');
    }

    if (data.tracks?.length) {
        return {
            tracks: data.tracks.slice(0, 1).map((t) => normalizeTrack(t, requester)),
            playlist: null
        };
    }
    throw new Error('Resposta Lavalink desconhecida: ' + loadType);
}

function connectNode(index = 0) {
    if (!nodesConfig.length) {
        console.warn('[lavalink] nenhum node configurado');
        return;
    }
    if (connecting) return;
    if (index >= nodesConfig.length) index = 0;
    const node = nodesConfig[index];
    connecting = true;
    activeNode = node;
    sessionId = null;

    const url = wsUrl(node);
    console.log(`[lavalink] conectando em ${node.host}:${node.port} (secure=${node.secure})…`);

    const socket = new WebSocket(url, {
        headers: {
            Authorization: node.password,
            'User-Id': clientRef?.user?.id || '0',
            'Client-Name': 'Aeternus/2.0'
        }
    });

    socket.on('open', () => {
        connecting = false;
        ws = socket;
        console.log(`[lavalink] WS aberto: ${node.host}:${node.port}`);
    });

    socket.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(String(raw));
        } catch {
            return;
        }
        if (msg.op === 'ready') {
            sessionId = msg.sessionId || msg.session_id;
            console.log(`[lavalink] sessão pronta em ${node.host}:${node.port}: ${sessionId}`);
            return;
        }
        if (msg.op === 'event') {
            handlePlayerEvent(msg).catch((e) =>
                console.warn('[lavalink] event:', e.message)
            );
            return;
        }
        if (msg.op === 'error') {
            console.warn('[lavalink] error op:', msg.message || JSON.stringify(msg).slice(0, 200));
        }
    });

    socket.on('error', (err) => {
        console.warn(`[lavalink] WS erro (${node.host}:${node.port}):`, err.message);
    });

    socket.on('close', (code) => {
        console.warn(`[lavalink] WS fechado (${code}) em ${node.host}:${node.port}`);
        ws = null;
        sessionId = null;
        connecting = false;
        const next = (index + 1) % nodesConfig.length;
        const nextNode = nodesConfig[next];
        console.log(
            `[lavalink] failover → ${nextNode.host}:${nextNode.port} (${next + 1}/${nodesConfig.length})`
        );
        if (reconnectTimer) clearTimeout(reconnectTimer);
        const delay = next === 0 ? 8000 : 2500;
        reconnectTimer = setTimeout(() => connectNode(next), delay);
    });
}

async function handlePlayerEvent(msg) {
    const guildId = msg.guildId || msg.guild_id;
    if (!guildId) return;
    const type = msg.type || msg.event;
    const st = getState(guildId);

    if (type === 'TrackEndEvent' || type === 'TrackStuckEvent' || type === 'TrackExceptionEvent') {
        const reason = String(msg.reason || '').toLowerCase();
        if (
            type !== 'TrackEndEvent' ||
            reason === 'finished' ||
            reason === 'loadfailed' ||
            reason === ''
        ) {
            st.current = null;
            await playNext(guildId).catch(() => {});
        }
    }
}

function waitForVoice(guildId, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
        const t0 = Date.now();
        const tick = () => {
            const v = pendingVoice.get(guildId);
            if (v?.token && v?.endpoint && v?.sessionId) return resolve(v);
            if (Date.now() - t0 > timeoutMs) {
                return reject(new Error('Timeout ao conectar no canal de voz.'));
            }
            setTimeout(tick, 200);
        };
        tick();
    });
}

async function joinVoice(guild, voiceChannelId) {
    const payload = {
        op: 4,
        d: {
            guild_id: guild.id,
            channel_id: voiceChannelId,
            self_mute: false,
            self_deaf: true
        }
    };
    try {
        if (guild.shard && typeof guild.shard.send === 'function') {
            guild.shard.send(payload);
        } else if (clientRef?.ws?.shards?.get) {
            const s =
                clientRef.ws.shards.get(guild.shardId ?? 0) ||
                clientRef.ws.shards.first();
            s?.send(payload);
        } else {
            clientRef?.ws?.shards?.first()?.send(payload);
        }
    } catch (e) {
        console.warn('[lavalink] voice op4:', e.message);
    }
    return waitForVoice(guild.id);
}

async function leaveVoice(guildId) {
    pendingVoice.delete(guildId);
    const payload = {
        op: 4,
        d: {
            guild_id: guildId,
            channel_id: null,
            self_mute: false,
            self_deaf: false
        }
    };
    try {
        clientRef?.ws?.shards?.first()?.send(payload);
    } catch (_) {}
}

async function updatePlayer(guildId, body) {
    if (!sessionId) throw new Error('Sessão Lavalink indisponível.');
    return rest(
        'PATCH',
        `/v4/sessions/${sessionId}/players/${guildId}?noReplace=false`,
        body
    );
}

async function destroyPlayer(guildId) {
    if (!sessionId || !activeNode) return;
    try {
        await axios.delete(
            `${restBase(activeNode)}/v4/sessions/${sessionId}/players/${guildId}`,
            {
                headers: { Authorization: activeNode.password },
                timeout: 8000,
                validateStatus: () => true
            }
        );
    } catch (_) {}
}

async function playTrack(guildId, track) {
    const st = getState(guildId);
    st.current = track;
    st.paused = false;
    const voice = pendingVoice.get(guildId);
    if (!voice) throw new Error('Sem dados de voz. Entre em um canal primeiro.');
    await updatePlayer(guildId, {
        track: { encoded: track.encoded },
        voice: {
            token: voice.token,
            endpoint: voice.endpoint,
            sessionId: voice.sessionId
        },
        volume: st.volume,
        paused: false
    });
}

async function playNext(guildId) {
    const st = getState(guildId);
    if (!st.queue.length) {
        st.current = null;
        return null;
    }
    const next = st.queue.shift();
    await playTrack(guildId, next);
    return next;
}

function resolveCtx(ctx) {
    const member =
        ctx.member || ctx.guild?.members?.cache?.get(ctx.author?.id || ctx.user?.id);
    const guild = ctx.guild || member?.guild;
    const user = ctx.user || ctx.author;
    const channel = ctx.channel;
    const voiceId =
        member?.voice?.channelId || member?.voice?.channel?.id || null;
    return { guild, user, channel, voiceId, member };
}

async function play(ctx, query) {
    if (!sessionId) {
        throw new Error(
            'Lavalink ainda não conectou. Aguarde o log de sessão ou configure LAVALINK_NODES.'
        );
    }
    const { guild, user, channel, voiceId } = resolveCtx(ctx);
    if (!guild) throw new Error('Use este comando em um servidor.');
    if (!voiceId) throw new Error('Entre em um canal de voz primeiro.');

    const st = getState(guild.id);
    st.textChannelId = channel?.id || st.textChannelId;
    st.voiceChannelId = voiceId;

    const { tracks, playlist } = await resolveQuery(
        query,
        user?.tag || user?.username || null
    );
    if (!tracks.length) throw new Error('Nenhuma faixa encontrada.');

    const first = tracks[0];
    const restTracks = tracks.slice(1);

    if (!pendingVoice.get(guild.id) || st.voiceChannelId !== voiceId) {
        await joinVoice(guild, voiceId);
    }

    let started = false;
    if (!st.current) {
        await playTrack(guild.id, first);
        started = true;
        if (restTracks.length) st.queue.push(...restTracks);
    } else {
        st.queue.push(first, ...restTracks);
    }

    return {
        track: first,
        started,
        added: playlist ? tracks.length : started ? restTracks.length : 1,
        playlist
    };
}

async function skip(guildId) {
    const st = getState(guildId);
    if (!st.current && !st.queue.length) throw new Error('Nada na fila.');
    await playNext(guildId);
}

async function stop(guildId) {
    const st = getState(guildId);
    st.queue = [];
    st.current = null;
    st.paused = false;
    await destroyPlayer(guildId);
    await leaveVoice(guildId);
    guilds.delete(guildId);
}

async function pause(guildId, paused) {
    const st = getState(guildId);
    if (!st.current) throw new Error('Nada tocando.');
    st.paused = !!paused;
    await updatePlayer(guildId, { paused: st.paused });
    return st.paused;
}

async function setVolume(guildId, n) {
    const st = getState(guildId);
    const v = Math.max(0, Math.min(100, Number(n) || 0));
    st.volume = v;
    if (st.current && sessionId) {
        await updatePlayer(guildId, { volume: v }).catch(() => {});
    }
    return v;
}

function queueInfo(guildId) {
    const st = getState(guildId);
    return {
        current: st.current,
        queue: st.queue.slice(),
        volume: st.volume,
        paused: st.paused
    };
}

function status() {
    return {
        lavalink: !!sessionId,
        node: activeNode ? `${activeNode.host}:${activeNode.port}` : null,
        nodes: nodesConfig.length,
        guilds: guilds.size
    };
}

function wireVoiceEvents(client) {
    client.on('raw', (packet) => {
        if (!packet?.t || !packet.d) return;
        if (packet.t === 'VOICE_SERVER_UPDATE') {
            const { guild_id, token, endpoint } = packet.d;
            if (!guild_id) return;
            const prev = pendingVoice.get(guild_id) || {};
            pendingVoice.set(guild_id, { ...prev, token, endpoint });
            const full = pendingVoice.get(guild_id);
            if (full.token && full.endpoint && full.sessionId && sessionId) {
                updatePlayer(guild_id, {
                    voice: {
                        token: full.token,
                        endpoint: full.endpoint,
                        sessionId: full.sessionId
                    }
                }).catch(() => {});
            }
        }
        if (packet.t === 'VOICE_STATE_UPDATE') {
            const d = packet.d;
            if (!d?.guild_id) return;
            if (d.user_id === client.user?.id) {
                const prev = pendingVoice.get(d.guild_id) || {};
                pendingVoice.set(d.guild_id, { ...prev, sessionId: d.session_id });
                const full = pendingVoice.get(d.guild_id);
                if (full.token && full.endpoint && full.sessionId && sessionId) {
                    updatePlayer(d.guild_id, {
                        voice: {
                            token: full.token,
                            endpoint: full.endpoint,
                            sessionId: full.sessionId
                        }
                    }).catch(() => {});
                }
            }
        }
    });
}

function load(client) {
    clientRef = client;
    nodesConfig = parseNodes();
    wireVoiceEvents(client);

    const start = () => {
        if (!client.user?.id) return;
        if (!nodesConfig.length) {
            console.warn('[lavalink] nenhum node disponível');
            return;
        }
        console.log(
            `[lavalink] ${nodesConfig.length} node(s): ` +
                nodesConfig.map((n) => `${n.host}:${n.port}`).join(' | ')
        );
        connectNode(0);
    };

    if (client.isReady?.() || client.readyAt) start();
    else client.once('clientReady', start);
    client.once('ready', start);

    console.log('[music] cliente Lavalink v4 · multi-node + failover');
}

module.exports = {
    COLOR,
    COLOR_ERR,
    COLOR_WARN,
    formatMs,
    play,
    skip,
    stop,
    pause,
    setVolume,
    queueInfo,
    status,
    load,
    setup: load,
    loadItem,
    resolveQuery
};
