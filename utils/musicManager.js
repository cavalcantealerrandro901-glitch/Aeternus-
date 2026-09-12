/**
 * Filas Shoukaku — prioridade SoundCloud, retries sem sair da call,
 * painel com botões.
 */
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const MAX_PLAY_RETRIES = 3;

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
        this.retries = 0;
        this.panelMessageId = null;
        this.voiceChannelId = null;
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

function progressBar(pos, len, size = 12) {
    if (!len || len <= 0) return '▬'.repeat(size);
    const ratio = Math.min(1, Math.max(0, pos / len));
    const filled = Math.round(size * ratio);
    return '━'.repeat(filled) + '●' + '─'.repeat(Math.max(0, size - filled - 1));
}

function controlRow(guildId, paused = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`music:pause:${guildId}`)
            .setLabel(paused ? 'Retomar' : 'Pausar')
            .setEmoji(paused ? '▶️' : '⏸️')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`music:skip:${guildId}`)
            .setLabel('Pular')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`music:stop:${guildId}`)
            .setLabel('Parar')
            .setEmoji('⏹️')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`music:queue:${guildId}`)
            .setLabel('Fila')
            .setEmoji('📜')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`music:loop:${guildId}`)
            .setLabel('Loop')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Secondary)
    );
}

function trackEmbed(track, q, title = 'Tocando agora') {
    const info = track?.info || {};
    const source = String(info.sourceName || '—').slice(0, 32);
    const loopLabel = q?.loop === 1 ? 'Faixa' : q?.loop === 2 ? 'Fila' : 'Off';
    const queueN = (q?.tracks?.length || 0) + (q?.current ? 1 : 0);

    const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setAuthor({
            name: 'Aeternus Music',
            iconURL: 'https://cdn.discordapp.com/emojis/741612713310879824.webp?size=64'
        })
        .setTitle(`🎵  ${title}`)
        .setDescription(
            `### [${info.title || 'Desconhecido'}](${info.uri || info.url || '#'})\n` +
                `👤 **${String(info.author || 'Artista').slice(0, 80)}**\n\n` +
                `\`${progressBar(0, info.length || 1)}\`\n` +
                `⏱️ \`${info.isStream ? 'AO VIVO' : '0:00'} / ${info.isStream ? '∞' : formatMs(info.length)}\``
        )
        .addFields(
            { name: 'Fonte', value: `\`${source}\``, inline: true },
            { name: 'Volume', value: `\`${q?.volume ?? 80}%\``, inline: true },
            { name: 'Loop', value: `\`${loopLabel}\``, inline: true },
            {
                name: 'Fila',
                value: `\`${queueN}\` faixa(s)`,
                inline: true
            },
            {
                name: 'Pedido por',
                value: track.requester ? `<@${track.requester}>` : '—',
                inline: true
            }
        )
        .setFooter({ text: 'SoundCloud prioritário · retries automáticos' })
        .setTimestamp();

    if (info.artworkUrl || info.thumbnail) {
        embed.setThumbnail(info.artworkUrl || info.thumbnail);
    }
    return embed;
}

function isUrl(q) {
    return /^https?:\/\//i.test(String(q || '').trim());
}

function isYoutubeUrl(q) {
    return /youtube\.com|youtu\.be|music\.youtube\.com/i.test(String(q || ''));
}

function isSpotifyUrl(q) {
    return /open\.spotify\.com|spotify\.com/i.test(String(q || ''));
}

function isDeezerUrl(q) {
    return /deezer\.com/i.test(String(q || ''));
}

/** Só SoundCloud primeiro; resto é fallback */
function searchIdentifiers(raw) {
    const q = String(raw || '').trim();
    if (!q) return [];
    if (isUrl(q)) return [q];
    // SC 2x (variações) → outras fontes
    return [
        `scsearch:${q}`,
        `scsearch:${q} audio`,
        `dzsearch:${q}`,
        `spsearch:${q}`,
        `ytmsearch:${q}`,
        `ytsearch:${q}`
    ];
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

async function resolveTracks(shoukaku, query) {
    const node = shoukaku.getIdealNode();
    if (!node) throw new Error('Nenhum node Lavalink conectado.');

    const identifiers = searchIdentifiers(query);
    if (!identifiers.length) throw new Error('Query vazia.');

    for (const identifier of identifiers) {
        try {
            const result = await node.rest.resolve(identifier);
            const parsed = parseResolveResult(result);
            if (parsed?.tracks?.length) {
                return { ...parsed, usedQuery: identifier, nodeName: node.name };
            }
        } catch (_) {
            /* tenta próxima fonte */
        }
    }

    if (isUrl(query) && isYoutubeUrl(query)) {
        const sc = await mirrorByTitle(node, query, 'youtube');
        if (sc) return sc;
    }
    if (isUrl(query) && (isSpotifyUrl(query) || isDeezerUrl(query))) {
        const sc = await mirrorByTitle(node, query, 'mirror');
        if (sc) return sc;
    }

    throw new Error('Nada encontrado. Tente outro nome ou link do **SoundCloud**.');
}

async function mirrorByTitle(node, url, tag) {
    try {
        const meta = await node.rest.resolve(url).catch(() => null);
        const title =
            meta?.data?.info?.title ||
            meta?.data?.tracks?.[0]?.info?.title ||
            meta?.tracks?.[0]?.info?.title ||
            null;
        const author =
            meta?.data?.info?.author || meta?.tracks?.[0]?.info?.author || '';
        if (!title) return null;
        const q = author ? `${title} ${author}` : title;
        const sc = await node.rest.resolve(`scsearch:${q}`);
        const parsed = parseResolveResult(sc);
        if (parsed?.tracks?.length) {
            return {
                ...parsed,
                usedQuery: `scsearch:${q}`,
                nodeName: node.name,
                fallbackMirror: true,
                fallbackFromYoutube: tag === 'youtube'
            };
        }
    } catch (_) {}
    return null;
}

async function trySoundcloudMirror(shoukaku, track) {
    const title = track?.info?.title;
    const author = track?.info?.author || '';
    if (!title) return null;
    const node = shoukaku.getIdealNode();
    if (!node) return null;
    const q = author ? `${title} ${author}` : title;
    try {
        const result = await node.rest.resolve(`scsearch:${q}`);
        const parsed = parseResolveResult(result);
        if (parsed?.tracks?.[0]) return wrapTrack(parsed.tracks[0], track.requester);
    } catch (_) {}
    return null;
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

/** Sai da call só quando não há mais o que tocar */
async function leaveIfIdle(client, guildId) {
    const shoukaku = client.shoukaku;
    if (!shoukaku) return;
    const q = getQueue(guildId);
    if (q.current || q.tracks.length) return;
    q.playing = false;
    q.paused = false;
    try {
        await shoukaku.leaveVoiceChannel(guildId);
    } catch (_) {}
    deleteQueue(guildId);
}

async function notifyChannel(client, guildId, content, color = 0xf87171) {
    try {
        const q = getQueue(guildId);
        if (!q.textChannelId) return;
        const ch = await client.channels.fetch(q.textChannelId).catch(() => null);
        if (ch?.isTextBased()) {
            await ch
                .send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(color)
                            .setDescription(content)
                    ]
                })
                .catch(() => {});
        }
    } catch (_) {}
}

async function sendOrUpdatePanel(client, guildId, track) {
    const q = getQueue(guildId);
    if (!q.textChannelId || !track) return;
    const ch = await client.channels.fetch(q.textChannelId).catch(() => null);
    if (!ch?.isTextBased()) return;

    const payload = {
        embeds: [trackEmbed(track, q)],
        components: [controlRow(guildId, q.paused)]
    };

    try {
        if (q.panelMessageId) {
            const msg = await ch.messages.fetch(q.panelMessageId).catch(() => null);
            if (msg) {
                await msg.edit(payload).catch(() => {});
                return;
            }
        }
        const sent = await ch.send(payload).catch(() => null);
        if (sent) q.panelMessageId = sent.id;
    } catch (_) {}
}

async function attemptPlay(player, track, volume) {
    await player.playTrack({ track: { encoded: track.encoded } });
    // volume suave: aplica em etapas leves
    const target = Math.max(1, Math.min(100, volume || 80));
    try {
        await player.setGlobalVolume(Math.min(40, target));
        await new Promise((r) => setTimeout(r, 120));
        await player.setGlobalVolume(target);
    } catch (_) {
        try {
            await player.setGlobalVolume(target);
        } catch (__) {}
    }
}

async function playNext(client, guildId) {
    const shoukaku = client.shoukaku;
    if (!shoukaku) return;

    const q = getQueue(guildId);
    const player = shoukaku.players.get(guildId);
    if (!player) return;

    if (q.loop === 1 && q.current) {
        // repete
    } else if (q.loop === 2 && q.current) {
        q.tracks.push(q.current);
        q.current = null;
    } else if (q.retries === 0) {
        q.current = null;
    }
    // se retries > 0, mantém current para re-tentar

    let next = q.current;
    if (!next) {
        next = q.tracks.shift();
        q.retries = 0;
    }
    if (!next) {
        await leaveIfIdle(client, guildId);
        return;
    }

    q.current = next;
    q.playing = true;
    q.paused = false;

    try {
        await attemptPlay(player, next, q.volume);
        q.retries = 0;
        await sendOrUpdatePanel(client, guildId, next);
    } catch (e) {
        console.warn('[music] playTrack', e?.message || e);
        await handlePlayFailure(client, guildId, next, e?.message || 'erro');
    }
}

async function handlePlayFailure(client, guildId, track, reason) {
    const shoukaku = client.shoukaku;
    const q = getQueue(guildId);
    q.retries = (q.retries || 0) + 1;

    // 1) mirror SoundCloud
    if (!track.__scTried) {
        track.__scTried = true;
        const mirror = await trySoundcloudMirror(shoukaku, track);
        if (mirror) {
            await notifyChannel(
                client,
                guildId,
                `🔄 Reproduzindo pelo **SoundCloud**: **${mirror.info?.title || track.info?.title}**`,
                0x34d399
            );
            q.current = mirror;
            q.retries = 0;
            return playNext(client, guildId);
        }
    }

    // 2) retry mesma faixa
    if (q.retries < MAX_PLAY_RETRIES) {
        await notifyChannel(
            client,
            guildId,
            `⏳ Tentativa **${q.retries}/${MAX_PLAY_RETRIES}** — **${track.info?.title || 'faixa'}**\n_${String(reason).slice(0, 120)}_\nPermaneço na call.`,
            0xfbbf24
        );
        await new Promise((r) => setTimeout(r, 1500 * q.retries));
        return playNext(client, guildId);
    }

    // 3) esgotou retries → próxima da fila (ainda na call)
    await notifyChannel(
        client,
        guildId,
        `⏭️ Sem sucesso com **${track.info?.title || 'faixa'}** após ${MAX_PLAY_RETRIES} tentativas. Seguindo a fila…`,
        0xf87171
    );
    q.current = null;
    q.retries = 0;

    if (q.tracks.length) {
        return playNext(client, guildId);
    }
    // só agora sai
    await leaveIfIdle(client, guildId);
}

function bindPlayerEvents(client, player, guildId) {
    if (player.__aeternusBound) return;
    player.__aeternusBound = true;

    player.on('end', (data) => {
        const reason = data?.reason || data;
        if (reason === 'replaced') return;

        if (reason === 'loadFailed') {
            const q = getQueue(guildId);
            handlePlayFailure(client, guildId, q.current, 'loadFailed').catch(() => {});
            return;
        }

        // fim normal → zera retries e avança
        const q = getQueue(guildId);
        q.retries = 0;
        if (q.loop !== 1) q.current = null;
        playNext(client, guildId).catch((e) => console.warn('[music] end', e?.message || e));
    });

    player.on('stuck', () => {
        const q = getQueue(guildId);
        handlePlayFailure(client, guildId, q.current, 'stuck').catch(() => {});
    });

    player.on('closed', () => {
        // voz fechada pelo Discord — limpa estado
        deleteQueue(guildId);
    });

    player.on('exception', (data) => {
        const q = getQueue(guildId);
        const msg =
            data?.exception?.message || data?.message || 'exception';
        console.warn(`[music] exception ${guildId}: ${String(msg).slice(0, 120)}`);
        handlePlayFailure(client, guildId, q.current, msg).catch(() => {});
    });
}

async function enqueue(client, { guild, voiceChannelId, textChannelId, query, requesterId }) {
    const shoukaku = client.shoukaku;
    if (!shoukaku) throw new Error('Sistema de música não inicializado.');

    const resolved = await resolveTracks(shoukaku, query);
    const wrapped = resolved.tracks
        .filter((t) => t && (t.encoded || t.track))
        .map((t) => wrapTrack(t, requesterId));

    if (!wrapped.length) throw new Error('Nenhuma faixa válida.');

    const q = getQueue(guild.id);
    q.textChannelId = textChannelId;
    q.voiceChannelId = voiceChannelId;

    const player = await ensurePlayer(shoukaku, guild, voiceChannelId);
    bindPlayerEvents(client, player, guild.id);

    const wasEmpty = !q.current && !q.playing;

    if (resolved.type === 'playlist') q.tracks.push(...wrapped);
    else q.tracks.push(wrapped[0]);

    if (wasEmpty || !q.current) {
        await playNext(client, guild.id);
    }

    return {
        added: resolved.type === 'playlist' ? wrapped.length : 1,
        playlistName: resolved.playlistName,
        first: wrapped[0],
        queueSize: q.tracks.length + (q.current ? 1 : 0),
        usedQuery: resolved.usedQuery || null,
        fallbackFromYoutube: !!resolved.fallbackFromYoutube,
        fallbackMirror: !!resolved.fallbackMirror
    };
}

/** Botões do painel */
async function handleMusicButton(interaction, client) {
    const parts = String(interaction.customId || '').split(':');
    // music:action:guildId
    const action = parts[1];
    const guildId = parts[2] || interaction.guildId;
    if (!guildId || guildId !== interaction.guildId) {
        return interaction.reply({ content: 'Sessão inválida.', ephemeral: true });
    }

    const member = interaction.member;
    const voiceId = member?.voice?.channelId;
    const q = getQueue(guildId);
    const shoukaku = client.shoukaku;
    const player = shoukaku?.players?.get(guildId);

    if (!voiceId || (q.voiceChannelId && voiceId !== q.voiceChannelId)) {
        return interaction.reply({
            content: 'Entre no mesmo canal de voz do bot.',
            ephemeral: true
        });
    }

    if (action === 'pause') {
        if (!player || !q.current) {
            return interaction.reply({ content: 'Nada tocando.', ephemeral: true });
        }
        if (q.paused) {
            await player.setPaused(false);
            q.paused = false;
        } else {
            await player.setPaused(true);
            q.paused = true;
        }
        await interaction.update({
            embeds: [trackEmbed(q.current, q, q.paused ? 'Pausado' : 'Tocando agora')],
            components: [controlRow(guildId, q.paused)]
        }).catch(() => interaction.deferUpdate());
        return;
    }

    if (action === 'skip') {
        if (!player || !q.current) {
            return interaction.reply({ content: 'Nada para pular.', ephemeral: true });
        }
        q.retries = 0;
        q.current = null;
        await interaction.reply({ content: '⏭️ Pulando…', ephemeral: true }).catch(() => {});
        try {
            await player.stopTrack();
        } catch (_) {
            playNext(client, guildId).catch(() => {});
        }
        return;
    }

    if (action === 'stop') {
        q.tracks = [];
        q.current = null;
        q.retries = 0;
        q.playing = false;
        try {
            await player?.stopTrack?.();
        } catch (_) {}
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x6b7280)
                    .setTitle('⏹️  Parado')
                    .setDescription('Fila limpa. Saindo do canal…')
            ],
            components: []
        }).catch(() => {});
        await leaveIfIdle(client, guildId);
        return;
    }

    if (action === 'queue') {
        const lines = [];
        if (q.current) {
            lines.push(`**▶** ${q.current.info?.title || '?'} — <@${q.current.requester}>`);
        }
        q.tracks.slice(0, 10).forEach((t, i) => {
            lines.push(`\`${i + 1}.\` ${t.info?.title || '?'} — <@${t.requester}>`);
        });
        if (!lines.length) lines.push('_Fila vazia._');
        if (q.tracks.length > 10) lines.push(`_…e mais ${q.tracks.length - 10}_`);

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('📜 Fila')
                    .setDescription(lines.join('\n'))
            ],
            ephemeral: true
        });
    }

    if (action === 'loop') {
        q.loop = (q.loop + 1) % 3;
        const label = q.loop === 0 ? 'Off' : q.loop === 1 ? 'Faixa' : 'Fila';
        if (q.current) {
            await interaction.update({
                embeds: [trackEmbed(q.current, q)],
                components: [controlRow(guildId, q.paused)]
            }).catch(() => {});
        }
        return interaction.followUp({
            content: `🔁 Loop: **${label}**`,
            ephemeral: true
        }).catch(() => {});
    }

    return interaction.reply({ content: 'Ação desconhecida.', ephemeral: true }).catch(() => {});
}

module.exports = {
    queues,
    getQueue,
    deleteQueue,
    formatMs,
    trackEmbed,
    controlRow,
    resolveTracks,
    enqueue,
    playNext,
    ensurePlayer,
    bindPlayerEvents,
    handleMusicButton,
    leaveIfIdle,
    MAX_PLAY_RETRIES
};
