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
            // host:port:password:secure|true|false
            const bits = part.split(':');
            if (bits.length < 3) continue;
            const secureFlag = String(bits[bits.length - 1]).toLowerCase();
            const isSecure =
                secureFlag === 'secure' || secureFlag === 'true' || secureFlag === '1';
            // password may contain ':' rarely — take port as number near end
            // format: host:port:password:secure
            // host can be hostname only (no port in host)
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

    // fallback: nodes públicos conhecidos (podem cair) + default Hjgaming
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

    return list;
}

/**
 * @typedef {{ host: string, port: number, password: string, secure: boolean, ws?: WebSocket, sessionId?: string, ready?: boolean, reconnecting?: boolean, label: string }}
 */

function nodeLabel(n) {
    return `${n.host}:${n.port}`;
}

function httpBase(n) {
    return `${n.secure ? 'https' : 'http'}://${n.host}:${n.port}`;
}

function wsUrl(n) {
    return `${n.secure ? 'wss' : 'ws'}://${n.host}:${n.port}/v4/websocket`;
}

function currentNode() {
    return nodes[activeIdx] || nodes[0] || null;
}

function setup(client) {
    clientRef = client;
    const configs = parseNodes();
    nodes = configs.map((c) => ({
        ...c,
        label: nodeLabel(c),
        ws: null,
        sessionId: null,
        ready: false,
        reconnecting: false
    }));

    console.log(`[lavalink] ${nodes.length} node(s): ${nodes.map((n) => n.label).join(' | ')}`);

    // voice state → lavalink
    client.on('raw', (packet) => {
        if (!packet?.t) return;
        if (packet.t === 'VOICE_SERVER_UPDATE' || packet.t === 'VOICE_STATE_UPDATE') {
            handleVoicePacket(packet).catch((e) =>
                console.error('[lavalink] voice packet:', e.message)
            );
        }
    });

    // conecta o primeiro node
    connectNode(activeIdx);

    client.once('clientReady', () => {
        // reconecta com user id correto se já tentou cedo
        const n = currentNode();
        if (n && !n.ready) connectNode(activeIdx);
    });
    // discord.js v14 ready
    client.once('ready', () => {
        const n = currentNode();
        if (n && !n.ready) connectNode(activeIdx);
    });
}

function connectNode(idx) {
    const n = nodes[idx];
    if (!n || !clientRef) return;
    if (n.ws && (n.ws.readyState === WebSocket.OPEN || n.ws.readyState === WebSocket.CONNECTING))
        return;

    const userId = clientRef.user?.id;
    if (!userId) {
        console.log(`[lavalink] aguardando ready para conectar ${n.label}…`);
        return;
    }

    console.log(`[lavalink] conectando em ${n.label} (secure=${n.secure})…`);

    try {
        const ws = new WebSocket(wsUrl(n), {
            headers: {
                Authorization: n.password,
                'User-Id': userId,
                'Client-Name': 'Aeternus/2.0',
                'Client-Version': '2.0.0'
            },
            handshakeTimeout: 15000
        });
        n.ws = ws;
        n.ready = false;
        n.sessionId = null;

        ws.on('open', () => {
            console.log(`[lavalink] WS aberto: ${n.label}`);
        });

        ws.on('message', (data) => {
            let msg;
            try {
                msg = JSON.parse(String(data));
            } catch {
                return;
            }
            if (msg.op === 'ready') {
                n.sessionId = msg.sessionId;
                n.ready = true;
                n.reconnecting = false;
                activeIdx = idx;
                console.log(`[lavalink] sessão pronta em ${n.label}: ${n.sessionId}`);
            }
            if (msg.op === 'event') {
                handlePlayerEvent(msg).catch(() => {});
            }
        });

        ws.on('error', (err) => {
            console.error(`[lavalink] WS erro (${n.label}):`, err.message);
        });

        ws.on('close', (code) => {
            console.warn(`[lavalink] WS fechado (${code}) em ${n.label}`);
            n.ready = false;
            n.sessionId = null;
            n.ws = null;
            if (!n.reconnecting) {
                n.reconnecting = true;
                setTimeout(() => failover('reconnect'), 3000);
            }
        });
    } catch (e) {
        console.error('[lavalink] connect fail:', e.message);
        setTimeout(() => failover('connect-fail'), 4000);
    }
}

function failover(reason) {
    if (!nodes.length) return;
    const prev = activeIdx;
    activeIdx = (activeIdx + 1) % nodes.length;
    console.log(
        `[lavalink] failover (${reason}): ${nodes[prev]?.label} → ${nodes[activeIdx]?.label}`
    );
    connectNode(activeIdx);
}

async function rest(method, path, body) {
    const n = currentNode();
    if (!n?.sessionId && path.includes('/sessions/')) {
        throw new Error('Sessão Lavalink indisponível');
    }
    if (!n) throw new Error('Nenhum node Lavalink');

    const url = `${httpBase(n)}${path}`;
    try {
        const res = await axios({
            method,
            url,
            data: body,
            headers: {
                Authorization: n.password,
                'Content-Type': 'application/json'
            },
            timeout: 20000,
            validateStatus: () => true
        });
        if (res.status >= 400) {
            const msg =
                res.data?.message ||
                res.data?.error ||
                `Lavalink HTTP ${res.status}`;
            throw new Error(String(msg));
        }
        return res.data;
    } catch (e) {
        if (e.message?.includes('Lavalink HTTP') || e.code === 'ECONNREFUSED') {
            console.error(`[lavalink] REST falhou em ${n.label}:`, e.message);
            failover('rest');
        }
        throw e;
    }
}

async function loadTracks(query) {
    let identifier = query;
    if (!/^(https?:\/\/|ytsearch:|scsearch:|spsearch:)/i.test(query)) {
        identifier = `ytsearch:${query}`;
    }
    const n = currentNode();
    if (!n) throw new Error('Node indisponível');
    const url = `${httpBase(n)}/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`;
    const res = await axios.get(url, {
        headers: { Authorization: n.password },
        timeout: 25000,
        validateStatus: () => true
    });
    if (res.status >= 400) {
        throw new Error(res.data?.message || `loadtracks HTTP ${res.status}`);
    }
    return res.data;
}

function getPlayer(guildId) {
    if (!players.has(guildId)) {
        players.set(guildId, {
            guildId,
            queue: [],
            current: null,
            textChannelId: null,
            voiceChannelId: null,
            volume: 80,
            paused: false
        });
    }
    return players.get(guildId);
}

async function updatePlayer(guildId, payload) {
    const n = currentNode();
    if (!n?.sessionId) throw new Error('Sessão Lavalink indisponível');
    return rest('PATCH', `/v4/sessions/${n.sessionId}/players/${guildId}?noReplace=false`, payload);
}

async function destroyPlayer(guildId) {
    const n = currentNode();
    players.delete(guildId);
    if (!n?.sessionId) return;
    try {
        await rest('DELETE', `/v4/sessions/${n.sessionId}/players/${guildId}`);
    } catch (_) {}
}

async function joinVoice(guildId, channelId) {
    if (!clientRef) return;
    clientRef.ws.send({
        op: 4,
        d: {
            guild_id: guildId,
            channel_id: channelId,
            self_mute: false,
            self_deaf: true
        }
    });
}

async function leaveVoice(guildId) {
    if (!clientRef) return;
    clientRef.ws.send({
        op: 4,
        d: {
            guild_id: guildId,
            channel_id: null,
            self_mute: false,
            self_deaf: false
        }
    });
}

const voiceServers = new Map(); // guildId -> { token, endpoint }
const voiceStates = new Map(); // guildId -> session_id

async function handleVoicePacket(packet) {
    if (packet.t === 'VOICE_SERVER_UPDATE') {
        const d = packet.d;
        voiceServers.set(d.guild_id, { token: d.token, endpoint: d.endpoint });
        await trySendVoiceUpdate(d.guild_id);
    }
    if (packet.t === 'VOICE_STATE_UPDATE') {
        const d = packet.d;
        if (d.user_id !== clientRef?.user?.id) return;
        if (d.channel_id) {
            voiceStates.set(d.guild_id, d.session_id);
            const p = getPlayer(d.guild_id);
            p.voiceChannelId = d.channel_id;
            await trySendVoiceUpdate(d.guild_id);
        } else {
            voiceStates.delete(d.guild_id);
            voiceServers.delete(d.guild_id);
        }
    }
}

async function trySendVoiceUpdate(guildId) {
    const server = voiceServers.get(guildId);
    const sessionId = voiceStates.get(guildId);
    const n = currentNode();
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

async function playTrack(guildId, encoded) {
    return updatePlayer(guildId, {
        track: { encoded },
        volume: getPlayer(guildId).volume,
        paused: false
    });
}

async function playNext(guildId) {
    const p = getPlayer(guildId);
    if (!p.queue.length) {
        p.current = null;
        try {
            await updatePlayer(guildId, { track: { encoded: null } });
        } catch (_) {}
        const ch = p.textChannelId
            ? await clientRef.channels.fetch(p.textChannelId).catch(() => null)
            : null;
        ch?.send({
            embeds: [new EmbedBuilder().setColor(COLOR).setDescription('Fila terminou.')]
        }).catch(() => {});
        return;
    }
    const next = p.queue.shift();
    p.current = next;
    await playTrack(guildId, next.encoded);
    const ch = p.textChannelId
        ? await clientRef.channels.fetch(p.textChannelId).catch(() => null)
        : null;
    if (ch) {
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('🎵 Tocando')
            .setDescription(`[**${next.title}**](${next.uri || next.url || '#'})`)
            .addFields(
                { name: 'Duração', value: formatMs(next.length), inline: true },
                { name: 'Pedido por', value: next.requester || '—', inline: true },
                { name: 'Fila', value: `${p.queue.length}`, inline: true }
            );
        if (next.artwork) emb.setThumbnail(next.artwork);
        ch.send({ embeds: [emb] }).catch(() => {});
    }
}

async function handlePlayerEvent(msg) {
    const guildId = msg.guildId;
    if (!guildId) return;
    const type = msg.type;
    if (type === 'TrackEndEvent') {
        if (msg.reason === 'replaced') return;
        await playNext(guildId);
    }
    if (type === 'TrackStuckEvent' || type === 'TrackExceptionEvent') {
        const chId = getPlayer(guildId).textChannelId;
        const ch = chId ? await clientRef.channels.fetch(chId).catch(() => null) : null;
        ch?.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLOR_ERR)
                    .setDescription(`Erro na faixa: ${msg.exception?.message || msg.reason || type}`)
            ]
        }).catch(() => {});
        await playNext(guildId);
    }
}

function formatMs(ms) {
    if (!ms || ms < 0) return '—';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const ss = String(s % 60).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function mapTrack(t, requester) {
    const info = t.info || {};
    return {
        encoded: t.encoded,
        title: info.title || 'Desconhecido',
        uri: info.uri || '',
        url: info.uri || '',
        length: info.length || 0,
        artwork: info.artworkUrl || info.thumbnail || null,
        author: info.author || '',
        requester: requester || '—'
    };
}

/** API pública dos comandos */
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

    const n = currentNode();
    if (!n?.ready || !n.sessionId) {
        connectNode(activeIdx);
        throw new Error(
            'Lavalink ainda não conectou. Configure `LAVALINK_NODES` (deploy: Hjgaming/lavalink-server) e aguarde o log de sessão.'
        );
    }

    const data = await loadTracks(query);
    const loadType = data.loadType;
    let tracks = [];

    if (loadType === 'track') tracks = [data.data];
    else if (loadType === 'search') tracks = data.data || [];
    else if (loadType === 'playlist') tracks = data.data?.tracks || [];
    else if (loadType === 'error') {
        throw new Error(data.data?.message || 'Erro ao buscar');
    }

    if (!tracks.length) throw new Error('Nada encontrado.');

    const p = getPlayer(guild.id);
    p.textChannelId = channel.id;
    p.voiceChannelId = voice.id;

    await joinVoice(guild.id, voice.id);

    // espera voice update um pouco
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

async function skip(guildId) {
    const p = getPlayer(guildId);
    if (!p.current) throw new Error('Nada tocando.');
    await playNext(guildId);
}

async function stop(guildId) {
    const p = getPlayer(guildId);
    p.queue = [];
    p.current = null;
    await destroyPlayer(guildId);
    await leaveVoice(guildId);
}

async function pause(guildId, paused) {
    const p = getPlayer(guildId);
    if (!p.current) throw new Error('Nada tocando.');
    p.paused = paused;
    await updatePlayer(guildId, { paused });
}

async function setVolume(guildId, vol) {
    const p = getPlayer(guildId);
    p.volume = Math.max(0, Math.min(100, vol));
    await updatePlayer(guildId, { volume: p.volume });
    return p.volume;
}

function queueInfo(guildId) {
    return getPlayer(guildId);
}

function status() {
    return {
        nodes: nodes.map((n) => ({
            label: n.label,
            ready: !!n.ready,
            sessionId: n.sessionId || null,
            active: n === currentNode()
        })),
        active: currentNode()?.label || null
    };
}

module.exports = {
    setup,
    play,
    skip,
    stop,
    pause,
    setVolume,
    queueInfo,
    status,
    formatMs,
    COLOR,
    COLOR_ERR,
    COLOR_WARN
};
