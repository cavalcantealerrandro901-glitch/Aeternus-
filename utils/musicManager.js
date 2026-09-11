/**
 * Filas e controle de players Shoukaku (1 fila por guild).
 */
const { EmbedBuilder } = require('discord.js');

/** @type {Map<string, GuildQueue>} */
const queues = new Map();

class GuildQueue {
    constructor(guildId) {
        this.guildId = guildId;
        this.tracks = [];
        this.current = null;
        this.textChannelId = null;
        this.volume = 80;
        this.loop = 0; // 0 off, 1 track, 2 queue
        this.playing = false;
        this.paused = false;
    }
}

function getQueue(guildId) {
    if (!queues.has(guildId)) queues.set(guildId, new GuildQueue(guildId));
    return queues.get(guildId);
}

function deleteQueue(guildId) {
    queues.delete(guildId);
}

function formatMs(ms) {
    const s = Math.floor(Number(ms || 0) / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const ss = String(s % 60).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function trackEmbed(track, title = 'Tocando agora') {
    const info = track?.info || {};
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle(`🎵 ${title}`)
        .setDescription(`**[${info.title || 'Desconhecido'}](${info.uri || info.url || '#'})**`)
        .addFields(
            {
                name: 'Autor',
                value: String(info.author || '—').slice(0, 100),
                inline: true
            },
            {
                name: 'Duração',
                value: info.isStream ? '🔴 Live' : formatMs(info.length || info.duration),
                inline: true
            },
            {
                name: 'Pedido por',
                value: track.requester ? `<@${track.requester}>` : '—',
                inline: true
            }
        )
        .setThumbnail(info.artworkUrl || info.thumbnail || null)
        .setTimestamp();
}

function isUrl(q) {
    return /^https?:\/\//i.test(String(q || '').trim());
}

function buildQuery(raw) {
    const q = String(raw || '').trim();
    if (!q) return null;
    if (isUrl(q)) return q;
    return `ytsearch:${q}`;
}

/**
 * Resolve tracks no node ideal do Shoukaku.
 */
async function resolveTracks(shoukaku, query) {
    const node = shoukaku.getIdealNode();
    if (!node) throw new Error('Nenhum node Lavalink conectado. Aguarde ou configure LAVALINK_NODES.');

    const identifier = buildQuery(query);
    if (!identifier) throw new Error('Query vazia.');

    const result = await node.rest.resolve(identifier);
    if (!result) throw new Error('Sem resposta do Lavalink.');

    const loadType = result.loadType || result.load_type;

    if (loadType === 'error' || loadType === 'LOAD_FAILED') {
        const msg = result.data?.message || result.exception?.message || 'Falha ao carregar.';
        throw new Error(msg);
    }
    if (loadType === 'empty' || loadType === 'NO_MATCHES') {
        throw new Error('Nada encontrado para essa busca.');
    }

    // Lavalink v4
    if (loadType === 'track') {
        return { type: 'track', tracks: [result.data], playlistName: null };
    }
    if (loadType === 'playlist') {
        const list = result.data?.tracks || [];
        return {
            type: 'playlist',
            tracks: list,
            playlistName: result.data?.info?.name || 'Playlist'
        };
    }
    if (loadType === 'search') {
        const list = Array.isArray(result.data) ? result.data : [];
        return { type: 'search', tracks: list.slice(0, 1), playlistName: null };
    }

    // v3 compat
    if (result.tracks?.length) {
        return {
            type: 'legacy',
            tracks: result.tracks,
            playlistName: result.playlistInfo?.name || null
        };
    }

    throw new Error('Formato de resposta Lavalink desconhecido.');
}

function wrapTrack(raw, requesterId) {
    return {
        encoded: raw.encoded || raw.track,
        info: raw.info || raw,
        requester: requesterId,
        pluginInfo: raw.pluginInfo || {}
    };
}

async function ensurePlayer(shoukaku, guild, voiceChannelId) {
    let player = shoukaku.players.get(guild.id);
    if (player) return player;

    const shardId = guild.shardId ?? guild.shard?.id ?? 0;
    player = await shoukaku.joinVoiceChannel({
        guildId: guild.id,
        channelId: voiceChannelId,
        shardId,
        deaf: true
    });
    return player;
}

async function playNext(client, guildId) {
    const shoukaku = client.shoukaku;
    if (!shoukaku) return;

    const q = getQueue(guildId);
    const player = shoukaku.players.get(guildId);
    if (!player) return;

    if (q.loop === 1 && q.current) {
        // repete faixa
    } else if (q.loop === 2 && q.current) {
        q.tracks.push(q.current);
        q.current = null;
    } else {
        q.current = null;
    }

    const next = q.current || q.tracks.shift();
    if (!next) {
        q.playing = false;
        q.paused = false;
        try {
            await shoukaku.leaveVoiceChannel(guildId);
        } catch (_) {}
        deleteQueue(guildId);
        return;
    }

    q.current = next;
    q.playing = true;
    q.paused = false;

    try {
        await player.playTrack({ track: { encoded: next.encoded } });
        await player.setGlobalVolume(q.volume);
    } catch (e) {
        console.error('[music] playTrack', e?.message || e);
        q.current = null;
        return playNext(client, guildId);
    }

    if (q.textChannelId) {
        const ch = await client.channels.fetch(q.textChannelId).catch(() => null);
        if (ch?.isTextBased()) {
            await ch.send({ embeds: [trackEmbed(next)] }).catch(() => {});
        }
    }
}

function bindPlayerEvents(client, player, guildId) {
    if (player.__aeternusBound) return;
    player.__aeternusBound = true;

    player.on('end', (data) => {
        const reason = data?.reason || data;
        if (reason === 'replaced') return;
        playNext(client, guildId).catch((e) => console.error('[music] end', e));
    });

    player.on('stuck', () => {
        console.warn(`[music] stuck ${guildId} — pulando`);
        playNext(client, guildId).catch(() => {});
    });

    player.on('closed', () => {
        deleteQueue(guildId);
    });

    player.on('exception', (data) => {
        console.error('[music] exception', guildId, data);
        playNext(client, guildId).catch(() => {});
    });
}

async function enqueue(client, { guild, voiceChannelId, textChannelId, query, requesterId }) {
    const shoukaku = client.shoukaku;
    if (!shoukaku) throw new Error('Sistema de música não inicializado.');

    const resolved = await resolveTracks(shoukaku, query);
    const wrapped = resolved.tracks
        .filter((t) => t && (t.encoded || t.track))
        .map((t) => wrapTrack(t, requesterId));

    if (!wrapped.length) throw new Error('Nenhuma faixa válida retornada.');

    const q = getQueue(guild.id);
    q.textChannelId = textChannelId;

    const player = await ensurePlayer(shoukaku, guild, voiceChannelId);
    bindPlayerEvents(client, player, guild.id);

    const wasEmpty = !q.current && !q.playing;

    if (resolved.type === 'playlist') {
        q.tracks.push(...wrapped);
    } else {
        q.tracks.push(wrapped[0]);
    }

    if (wasEmpty || !q.current) {
        await playNext(client, guild.id);
    }

    return {
        added: resolved.type === 'playlist' ? wrapped.length : 1,
        playlistName: resolved.playlistName,
        first: wrapped[0],
        queueSize: q.tracks.length + (q.current ? 1 : 0)
    };
}

module.exports = {
    queues,
    getQueue,
    deleteQueue,
    formatMs,
    trackEmbed,
    resolveTracks,
    enqueue,
    playNext,
    ensurePlayer,
    bindPlayerEvents
};
