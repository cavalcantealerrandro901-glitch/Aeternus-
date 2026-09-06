/**
 * Cliente Lavalink v4 multi-node (compatível com Hjgaming/lavalink-server)
 *
 * ENV:
 *   LAVALINK_NODES=host1:443:senha:secure,host2:2333:senha:insecure
 *   ou
 *   LAVALINK_HOST + LAVALINK_PORT + LAVALINK_PASSWORD + LAVALINK_SECURE
 *
 * Deploy o servidor: https://github.com/Hjgaming/lavalink-server
 * Senha padrão do repo: arbotixop007
 */
const WebSocket = require('ws');
const axios = require('axios');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');

const COLOR = 0xa78bfa;
const COLOR_ERR = 0xef4444;
const COLOR_WARN = 0xf59e0b;

/** @type {import('discord.js').Client | null} */
let clientRef = null;

/** @type {NodeState[]} */
let nodes = [];
let activeIdx = 0;

/** guildId -> player state */
const players = new Map();

function parseNodes() {
    const raw = process.env.LAVALINK_NODES || '';
    const list = [];

    if (raw.trim()) {
        for (const part of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
            const bits = part.split(':');
            if (bits.length < 3) continue;
            const secureFlag = String(bits[bits.length - 1]).toLowerCase();
            const isSecure =
                secureFlag === 'secure' || secureFlag === 'true' || secureFlag === '1';
            const host = bits[0];
            const port = parseInt(bits[1], 10);
            const password = bits.slice(2, -1).join(':') || bits[2];
            if (!host || !port || !password) continue;
            list.push({ host, port, password, secure: isSecure });
        }
    }

    if (!list.length && process.env.LAVALINK_HOST) {
        list.push({
            host: process.env.LAVALINK_HOST,
            port: parseInt(process.env.LAVALINK_PORT || '443', 10),
            password: process.env.LAVALINK_PASSWORD || 'arbotixop007',
            secure: String(process.env.LAVALINK_SECURE || 'true').toLowerCase() !== 'false'
        });
    }

    if (!list.length) {
        list.push(
            {
                host: process.env.LAVALINK_FALLBACK_HOST || 'lavalinkv4.serenetia.com',
                port: 443,
                password: process.env.LAVALINK_FALLBACK_PASS || 'https://discord.gg/PKR7nMMmB3',
                secure: true
            },
            {
                host: 'free-lava.heavencloud.in',
                port: 4000,
                password: 'youshallnotpass',
                secure: false
            }
        );
        console.warn(
            '[lavalink] Sem LAVALINK_NODES no .env — usando nodes públicos (instáveis). Deploy: https://github.com/Hjgaming/lavalink-server'
        );
    }

    return list.map((n) => ({
        ...n,
        label: `${n.host}:${n.port}`,
        ws: null,
        sessionId: null,
        ready: false,
        reconnecting: false
    }));
}

function currentNode() {
    return nodes[activeIdx] || nodes[0] || null;
}

function setup(client) {
    clientRef = client;
    nodes = parseNodes();
    activeIdx = 0;
    if (!nodes.length) {
        console.warn('[lavalink] nenhum node configurado');
        return;
    }
    console.log(`[lavalink] ${nodes.length} node(s): ${nodes.map((n) => n.label).join(' | ')}`);
    connectNode(activeIdx);

    client.on('raw', (packet) => {
        if (!packet || !packet.t) return;
        if (packet.t === 'VOICE_SERVER_UPDATE' || packet.t === 'VOICE_STATE_UPDATE') {
            handleVoiceUpdate(packet).catch(() => {});
        }
    });

    setInterval(() => {
        const n = currentNode();
        if (n && !n.ready) connectNode(activeIdx);
    }, 30000);
}

function connectNode(idx) {
    const n = nodes[idx];
    if (!n || !clientRef?.user) return;

    try {
        if (n.ws) {
            try {
                n.ws.removeAllListeners();
                n.ws.close();
            } catch (_) {}
            n.ws = null;
        }

        const proto = n.secure ? 'wss' : 'ws';
        const url = `${proto}://${n.host}:${n.port}/v4/websocket`;
        console.log(`[lavalink] conectando em ${n.label} (secure=${n.secure})…`);

        const ws = new WebSocket(url, {
            headers: {
                Authorization: n.password,
                'User-Id': clientRef.user.id,
                'Client-Name': 'Aeternus/1.0'
            }
        });
        n.ws = ws;

        ws.on('open', () => {
            console.log(`[lavalink] WS aberto: ${n.label}`);
        });

        ws.on('message', (raw) => {
            let msg;
            try {
                msg = JSON.parse(String(raw));
            } catch {\n                return;
            }
            if (msg.op === 'ready') {
                n.sessionId = msg.sessionId;
                n.ready = true;
                n.reconnecting = false;
                console.log(`[lavalink] sessão pronta em ${n.label}: ${n.sessionId}`);
            } else if (msg.op === 'event') {
                handlePlayerEvent(msg).catch(() => {});
            } else if (msg.op === 'playerUpdate') {
                // ignore
            }
        });

        ws.on('close', (code) => {
            console.warn(`[lavalink] WS fechado (${code}) em ${n.label}`);
            n.ready = false;
            n.sessionId = null;
            if (!n.reconnecting) {
                n.reconnecting = true;
                setTimeout(() => failover('reconnect'), 3000);
            }
        });

        ws.on('error', (e) => {
            console.error(`[lavalink] WS erro (${n.label}):`, e.message);
        });
    } catch (e) {
        console.error('[lavalink] connect fail:', e.message);
        setTimeout(() => failover('connect-fail'), 4000);
    }
}

function failover(reason) {
    if (!nodes.length) return;
    const prev = currentNode();
    activeIdx = (activeIdx + 1) % nodes.length;
    const next = currentNode();
    console.warn(
        `[lavalink] failover (${reason}): ${prev?.label || '?'} → ${next?.label || '?'}`
    );
    connectNode(activeIdx);
}

async function rest(method, path, body) {
    const n = currentNode();
    if (!n) throw new Error('Sem node Lavalink');
    if (!n.sessionId && path.includes('/sessions/')) {
        throw new Error('Sessão Lavalink indisponível');
    }
    const proto = n.secure ? 'https' : 'http';
    const url = `${proto}://${n.host}:${n.port}${path}`;
    try {
        const res = await axios({
            method,
            url,
            data: body,
            headers: {
                Authorization: n.password,
                'Content-Type': 'application/json'
            },
            timeout: 15000,
            validateStatus: () => true
        });
        if (res.status >= 400) {
            const msg =
                res.data?.message ||
                res.data?.error ||
                (typeof res.data === 'string' ? res.data : JSON.stringify(res.data || {}));
            throw new Error(`Lavalink HTTP ${res.status}: ${msg || 'Bad Request'}`);
        }
        return res.data;
    } catch (e) {
        if (e.message?.startsWith('Lavalink HTTP')) {
            console.error(`[lavalink] REST falhou em ${n.label}:`, e.message);
            failover('rest');
        }
        throw e;
    }
}

async function loadTracksOnce(identifier) {
    const n = currentNode();
    if (!n) throw new Error('Sem node');
    const proto = n.secure ? 'https' : 'http';
    const url = `${proto}://${n.host}:${n.port}/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`;
    const res = await axios.get(url, {
        headers: { Authorization: n.password },
        timeout: 20000,
        validateStatus: () => true
    });
    if (res.status >= 400) {
        throw new Error(`loadtracks ${res.status}`);
    }
    return res.data;
}

function mapLoad(data) {
    if (!data) return { tracks: [], error: 'empty' };
    const loadType = data.loadType;
    if (loadType === 'track') return { tracks: [data.data], error: null };
    if (loadType === 'search') return { tracks: data.data || [], error: null };
    if (loadType === 'playlist') return { tracks: data.data?.tracks || [], error: null };
    if (loadType === 'empty') return { tracks: [], error: 'empty' };
    if (loadType === 'error') return { tracks: [], error: data.data?.message || 'error' };
    return { tracks: [], error: loadType || 'unknown' };
}

async function loadTracks(query) {
    const q = String(query || '').trim();
    if (!q) return { tracks: [] };

    const isUrl = /^https?:\/\//i.test(q);
    const hasPrefix = /^(ytsearch|ytmsearch|scsearch|spsearch|amsearch|dzsearch):/i.test(q);

    const attempts = [];
    if (isUrl || hasPrefix) attempts.push(q);
    else {
        attempts.push(`ytsearch:${q}`);
        attempts.push(`scsearch:${q}`);
        attempts.push(`ytmsearch:${q}`);
    }

    let lastErr = null;
    for (const id of attempts) {
        try {
            const data = await loadTracksOnce(id);
            const mapped = mapLoad(data);
            if (mapped.tracks.length) return mapped;
            lastErr = mapped.error;
        } catch (e) {
            lastErr = e.message;
        }
    }
    if (lastErr) {
        console.warn('[lavalink] busca falhou:', lastErr);
    }
    return { tracks: [] };
}

function getPlayer(guildId) {
    if (!players.has(guildId)) {
        players.set(guildId, {
            guildId,
            queue: [],
            current: null,
            textChannelId: null,
            voiceChannelId: null,
            volume: 100,
            paused: false
        });
    }
    return players.get(guildId);
}

function mapTrack(t, requester) {
    const info = t.info || t;
    return {
        encoded: t.encoded || t.track,
        title: info.title || 'Desconhecido',
        author: info.author || '',
        uri: info.uri || '',
        length: info.length || 0,
        requester
    };
}

async function updatePlayer(guildId, payload) {
    const n = currentNode();
    if (!n?.sessionId) throw new Error('Sessão Lavalink indisponível');
    return rest('PATCH', `/v4/sessions/${n.sessionId}/players/${guildId}?noReplace=false`, payload);
}

async function destroyPlayer(guildId) {
    players.delete(guildId);
    const n = currentNode();
    if (!n?.sessionId) return;
    try {
        await rest('DELETE', `/v4/sessions/${n.sessionId}/players/${guildId}`);
    } catch (_) {}
}

const voiceStates = new Map();
const voiceServers = new Map();

async function handleVoiceUpdate(packet) {
    const d = packet.d;
    if (!d) return;
    if (packet.t === 'VOICE_STATE_UPDATE') {
        if (d.user_id !== clientRef?.user?.id) return;
        voiceStates.set(d.guild_id, d.session_id);
        await sendVoiceUpdate(d.guild_id);
    } else if (packet.t === 'VOICE_SERVER_UPDATE') {
        voiceServers.set(d.guild_id, { token: d.token, endpoint: d.endpoint });
        await sendVoiceUpdate(d.guild_id);
    }
}

async function sendVoiceUpdate(guildId) {
    const n = currentNode();
    const server = voiceServers.get(guildId);
    const sessionId = voiceStates.get(guildId);
    if (!server || !sessionId || !n?.sessionId) return;
    try {
        await updatePlayer(guildId, {
            voice: {
                token: server.token,
                endpoint: server.endpoint,
                sessionId
            }
        });
    } catch (e) {
        console.error('[lavalink] voice update:', e.message);
    }
}

async function joinVoice(guildId, channelId) {
    const guild = clientRef.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild não encontrada');
    const shard = guild.shard || clientRef.ws;
    // @ts-ignore
    clientRef.ws.shards?.first?.()?.send?.({
        op: 4,
        d: {
            guild_id: guildId,
            channel_id: channelId,
            self_mute: false,
            self_deaf: true
        }
    });
    // fallback
    try {
        guild.shard?.send({
            op: 4,
            d: {
                guild_id: guildId,
                channel_id: channelId,
                self_mute: false,
                self_deaf: true
            }
        });
    } catch (_) {}
}

async function playTrack(guildId, encoded) {
    await updatePlayer(guildId, {
        encodedTrack: encoded,
        volume: getPlayer(guildId).volume
    });
}

async function playNext(guildId) {
    const p = getPlayer(guildId);
    const next = p.queue.shift();
    if (!next) {
        p.current = null;
        return false;
    }
    p.current = next;
    await playTrack(guildId, next.encoded);
    return true;
}

async function handlePlayerEvent(msg) {
    const guildId = msg.guildId;
    if (!guildId) return;
    const type = msg.type;
    if (type === 'TrackEndEvent') {
        const reason = msg.reason;
        if (reason === 'replaced') return;
        await playNext(guildId);
    } else if (type === 'TrackExceptionEvent' || type === 'TrackStuckEvent') {
        console.warn('[lavalink] track error', type, msg);
        await playNext(guildId);
    }
}

async function play(ctx, query) {
    const guild = ctx.guild;
    const member = ctx.member;
    const channel = ctx.channel;
    const user = ctx.user || ctx.author;
    if (!guild || !member) throw new Error('Só em servidor');

    const voice = member.voice?.channel;
    if (!voice) throw new Error('Entre em um canal de voz primeiro.');

    const me = guild.members.me;
    if (me) {
        const perms = voice.permissionsFor(me);
        if (perms && !perms.has(PermissionsBitField.Flags.Connect))
            throw new Error('Sem permissão de **Conectar**.');
        if (perms && !perms.has(PermissionsBitField.Flags.Speak))
            throw new Error('Sem permissão de **Falar**.');
    }

    // Aguarda sessão Lavalink (até ~12s) em vez de falhar na hora
    let n = currentNode();
    if (!n?.ready || !n.sessionId) {
        if (n) connectNode(activeIdx);
        for (let i = 0; i < 24; i++) {
            await new Promise((r) => setTimeout(r, 500));
            n = currentNode();
            if (n?.ready && n.sessionId) break;
        }
    }
    if (!n?.ready || !n.sessionId) {
        throw new Error(
            'Lavalink offline. No Render, defina:\n' +
                '`LAVALINK_NODES=seu-host.onrender.com:443:SUA_SENHA:secure`\n' +
                'e reinicie. No log deve aparecer: **sessão pronta**.'
        );
    }

    const { tracks } = await loadTracks(query);
    if (!tracks.length) throw new Error('Nada encontrado.');

    const p = getPlayer(guild.id);
    p.textChannelId = channel.id;
    p.voiceChannelId = voice.id;

    await joinVoice(guild.id, voice.id);
    await new Promise((r) => setTimeout(r, 800));

    const mapped = tracks.slice(0, 50).map((t) => mapTrack(t, `${user}`));
    const wasEmpty = !p.current;

    if (wasEmpty) {
        p.current = mapped[0];
        p.queue.push(...mapped.slice(1));
        await playTrack(guild.id, mapped[0].encoded);
        return { started: true, track: mapped[0], added: mapped.length - 1 };
    }

    p.queue.push(...mapped);
    return { started: false, track: mapped[0], added: mapped.length };
}

module.exports = {
    setup,
    play,
    getPlayer,
    destroyPlayer,
    playNext,
    updatePlayer,
    loadTracks,
    currentNode,
    nodes: () => nodes
};
