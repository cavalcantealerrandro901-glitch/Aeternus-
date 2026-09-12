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
                name: 'Fonte',
                value: String(info.sourceName || '—').slice(0, 32),
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

function isYoutubeUrl(q) {
    return /youtube\.com|youtu\.be|music\.youtube\.com/i.test(String(q || ''));
}

/** Prefixos de busca em ordem de tentativa (nodes públicos quebram YT com frequência) */
function searchIdentifiers(raw) {
    const q = String(raw || '').trim();
    if (!q) return [];
    if (isUrl(q)) return [q];
    return [`ytsearch:${q}`, `scsearch:${q}`, `ytmsearch:${q}`];
}

function parseResolveResult(result) {
    if (!result) return null;
    const loadType = result.loadType || result.load_type;

    if (loadType === 'error' || loadType === 'LOAD_FAILED') return null;
    if (loadType === 'empty' || loadType === 'NO_MATCHES') return null;

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

    if (result.tracks?.length) {
        return {
            type: 'legacy',
            tracks: result.tracks,
            playlistName: result.playlistInfo?.name || null
        };
    }
    return null;
}

/**
 * Resolve com fallback entre fontes (YouTube → SoundCloud → YT Music).
 */
async function resolveTracks(shoukaku, query) {
    const node = shoukaku.getIdealNode();
    if (!node) throw new Error('Nenhum node Lavalink conectado. Aguarde ou configure LAVALINK_NODES.');

    const identifiers = searchIdentifiers(query);
    if (!identifiers.length) throw new Error('Query vazia.');

    const errors = [];

    for (const identifier of identifiers) {
        try {
            const result = await node.rest.resolve(identifier);
            const parsed = parseResolveResult(result);
            if (parsed?.tracks?.length) {
                return { ...parsed, usedQuery: identifier, nodeName: node.name };
            }
            const loadType = result?.loadType || result?.load_type;
            if (loadType === 'error' || loadType === 'LOAD_FAILED') {
                errors.push(
                    `${identifier}: ${result?.data?.message || result?.exception?.message || 'falha'}`
                );
            }
        } catch (e) {
            errors.push(`${identifier}: ${e.message || e}`);
        }
    }

    // URL do YouTube falhou → tenta buscar o título no SoundCloud se possível
    if (isUrl(query) && isYoutubeUrl(query)) {
        try {
            const meta = await node.rest.resolve(query).catch(() => null);
            const title =
                meta?.data?.info?.title ||
                meta?.tracks?.[0]?.info?.title ||
                null;
            if (title) {
                const sc = await node.rest.resolve(`scsearch:${title}`);
                const parsed = parseResolveResult(sc);
                if (parsed?.tracks?.length) {
                    return {
                        ...parsed,
                        usedQuery: `scsearch:${title}`,
                        nodeName: node.name,
                        fallbackFromYoutube: true
                    };
                }
            }
        } catch (_) {}
    }

    const hint = errors.slice(0, 2).join(' · ');
    throw new Error(
        hint
            ? `Não achei uma fonte tocável. ${hint}`
            : 'Nada encontrado (YouTube costuma falhar em nodes públicos). Tente outro nome ou link do SoundCloud.'
    );
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

function exceptionMessage(data) {
    const msg =
        data?.exception?.message ||
        data?.message ||
        (typeof data === 'string' ? data : '') ||
        '';
    if (/requires login|All clients failed|No supported audio/i.test(msg)) {
        return 'O YouTube bloqueou esta faixa neste node (login/OAuth). Pulando… Tente SoundCloud ou outro título.';
    }
    if (msg) return msg.split('\n')[0].slice(0, 180);
    return 'Erro ao decodificar a faixa. Pulando…';
}

async function notifyChannel(client, guildId, content) {
    try {
        const q = getQueue(guildId);
        if (!q.textChannelId) return;
        const ch = await client.channels.fetch(q.textChannelId).catch(() => null);
        if (ch?.isTextBased()) {
            await ch
                .send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf87171)
                            .setTitle('⚠️ Faixa ignorada')
                            .setDescription(content)
                    ]
                })
                .catch(() => {});
        }
    } catch (_) {}
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
        console.warn('[music] playTrack', e?.message || e);
        await notifyChannel(
            client,
            guildId,
            `Não consegui tocar **${next.info?.title || 'faixa'}**. ${e.message || ''}`
        );
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
        // loadFailed também dispara end em alguns nodes
        if (reason === 'loadFailed') {
            const q = getQueue(guildId);
            const title = q.current?.info?.title || 'faixa';
            notifyChannel(
                client,
                guildId,
                `Falha ao carregar **${title}** (fonte bloqueada). Pulando…`
            ).finally(() => playNext(client, guildId).catch(() => {}));
            return;
        }
        playNext(client, guildId).catch((e) => console.warn('[music] end', e?.message || e));
    });

    player.on('stuck', () => {
        console.warn(`[music] stuck ${guildId} — pulando`);
        playNext(client, guildId).catch(() => {});
    });

    player.on('closed', () => {
        deleteQueue(guildId);
    });

    player.on('exception', (data) => {
        const q = getQueue(guildId);
        const title = q.current?.info?.title || 'faixa';
        const human = exceptionMessage(data);
        // warn (não error) para não spammar autoRepair
        console.warn(`[music] exception ${guildId}: ${human}`);
        notifyChannel(
            client,
            guildId,
            `**${title}**\n${human}`
        ).finally(() => {
            q.current = null;
            playNext(client, guildId).catch(() => {});
        });
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
        queueSize: q.tracks.length + (q.current ? 1 : 0),
        usedQuery: resolved.usedQuery || null,
        fallbackFromYoutube: !!resolved.fallbackFromYoutube
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
