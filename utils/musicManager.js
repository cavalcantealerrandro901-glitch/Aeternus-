/**
 * Filas Shoukaku — anti-falha:
 * prioridade SoundCloud, multi-node, retries, sem sair da call,
 * lock contra race, rejoin de voz, botões seguros.
 */
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const { searchIdentifiers, isUrl } = require('./musicSearch');

const MAX_PLAY_RETRIES = 4;
const MAX_RESOLVE_TRIES = 2;

/** @type {Map<string, GuildQueue>} */
const queues = new Map();
/** @type {Map<string, boolean>} */
const playLocks = new Map();

class GuildQueue {
    constructor(guildId) {
        this.guildId = guildId;
        this.tracks = [];
        this.current = null;
        this.textChannelId = null;
        this.volume = 100;
        this.loop = 0;
        this.playing = false;
        this.paused = false;
        this.retries = 0;
        this.panelMessageId = null;
        this.voiceChannelId = null;
        this.lastAdvance = 0;
    }
}

function getQueue(guildId) {
    if (!queues.has(guildId)) queues.set(guildId, new GuildQueue(guildId));
    return queues.get(guildId);
}

function deleteQueue(guildId) {
    queues.delete(guildId);
    playLocks.delete(guildId);
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
    const ratio = Math.min(1, Math.max(0, Number(pos) / Number(len)));
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
    const safeTitle = String(info.title || 'Desconhecido').slice(0, 200);
    const uri = info.uri || info.url || '#';

    const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setAuthor({ name: 'Aeternus Music' })
        .setTitle(`🎵  ${title}`)
        .setDescription(
            `### [${safeTitle}](${uri})\n` +
                `👤 **${String(info.author || 'Artista').slice(0, 80)}**\n\n` +
                `\`${progressBar(0, info.length || 1)}\`\n` +
                `⏱️ \`${info.isStream ? 'AO VIVO' : '0:00'} / ${info.isStream ? '∞' : formatMs(info.length)}\``
        )
        .addFields(
            { name: 'Fonte', value: `\`${source}\``, inline: true },
            { name: 'Volume', value: `\`${q?.volume ?? 100}%\``, inline: true },
            { name: 'Loop', value: `\`${loopLabel}\``, inline: true },
            { name: 'Fila', value: `\`${queueN}\` faixa(s)`, inline: true },
            {
                name: 'Pedido por',
                value: track.requester ? `<@${track.requester}>` : '—',
                inline: true
            }
        )
        .setFooter({ text: 'Busca · SoundCloud prioritário · Serenetia' })
        .setTimestamp();

    const art = info.artworkUrl || info.thumbnail;
    if (art && /^https?:\/\//i.test(art)) embed.setThumbnail(art);
    return embed;
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

function parseResolveResult(result) {
    if (!result) return null;
    const loadType = result.loadType || result.load_type;
    if (loadType === 'error' || loadType === 'LOAD_FAILED') return null;
    if (loadType === 'empty' || loadType === 'NO_MATCHES') return null;

    if (loadType === 'track' && result.data) {
        return { type: 'track', tracks: [result.data], playlistName: null };
    }
    if (loadType === 'playlist') {
        const list = result.data?.tracks || [];
        if (!list.length) return null;
        return {
            type: 'playlist',
            tracks: list,
            playlistName: result.data?.info?.name || 'Playlist'
        };
    }
    if (loadType === 'search') {
        const list = Array.isArray(result.data) ? result.data : [];
        if (!list.length) return null;
        return { type: 'search', tracks: list.slice(0, 1), playlistName: null };
    }
    if (Array.isArray(result.tracks) && result.tracks.length) {
        return {
            type: 'legacy',
            tracks: result.tracks,
            playlistName: result.playlistInfo?.name || null
        };
    }
    return null;
}

function listNodes(shoukaku) {
    const nodes = [];
    try {
        for (const [, n] of shoukaku.nodes || []) {
            if (!n) continue;
            const st = n.state;
            if (st === 2 || st === 'CONNECTED' || String(st).toUpperCase() === 'CONNECTED' || n.sessionId) {
                nodes.push(n);
            }
        }
    } catch (_) {}
    if (!nodes.length) {
        try {
            const ideal =
                (typeof shoukaku.getIdealNode === 'function' && shoukaku.getIdealNode()) ||
                (typeof shoukaku.getNode === 'function' && shoukaku.getNode()) ||
                (shoukaku.options?.nodeResolver && shoukaku.options.nodeResolver(shoukaku.nodes));
            if (ideal) nodes.push(ideal);
        } catch (_) {}
    }
    return nodes;
}

async function resolveOnNode(node, identifier) {
    if (!node?.rest?.resolve) return null;
    try {
        const result = await Promise.race([
            node.rest.resolve(identifier),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15_000))
        ]);
        return parseResolveResult(result);
    } catch (_) {
        return null;
    }
}

async function resolveTracks(shoukaku, query) {
    const identifiers = searchIdentifiers(query);
    if (!identifiers.length) throw new Error('Query vazia.');

    const nodes = listNodes(shoukaku);
    if (!nodes.length) throw new Error('Nenhum node Lavalink conectado. Aguarde alguns segundos e tente de novo.');

    for (let pass = 0; pass < MAX_RESOLVE_TRIES; pass++) {
        for (const node of nodes) {
            for (const identifier of identifiers) {
                const parsed = await resolveOnNode(node, identifier);
                if (parsed?.tracks?.length) {
                    return {
                        ...parsed,
                        usedQuery: identifier,
                        nodeName: node.name
                    };
                }
            }
        }
        if (pass === 0) await sleep(400);
    }

    if (isUrl(query)) {
        for (const node of nodes) {
            const sc = await mirrorByTitle(node, query);
            if (sc) return sc;
        }
    }

    throw new Error('Nada encontrado. Tente outro nome ou um link do **SoundCloud**.');
}

async function mirrorByTitle(node, url) {
    try {
        const meta = await resolveOnNode(node, url);
        const t = meta?.tracks?.[0];
        const title = t?.info?.title;
        const author = t?.info?.author || '';
        if (!title) return null;
        const q = author ? `${title} ${author}` : title;
        const parsed = await resolveOnNode(node, `scsearch:${q}`);
        if (parsed?.tracks?.length) {
            return {
                ...parsed,
                usedQuery: `scsearch:${q}`,
                nodeName: node.name,
                fallbackMirror: true,
                fallbackFromYoutube: isYoutubeUrl(url)
            };
        }
    } catch (_) {}
    return null;
}

async function trySoundcloudMirror(shoukaku, track) {
    const title = track?.info?.title;
    if (!title) return null;
    const author = track?.info?.author || '';
    const q = author ? `${title} ${author}` : title;
    const nodes = listNodes(shoukaku);
    for (const node of nodes) {
        const parsed = await resolveOnNode(node, `scsearch:${q}`);
        if (parsed?.tracks?.[0]) return wrapTrack(parsed.tracks[0], track.requester);
        const parsed2 = await resolveOnNode(node, `scsearch:${title}`);
        if (parsed2?.tracks?.[0]) return wrapTrack(parsed2.tracks[0], track.requester);
    }
    return null;
}

function wrapTrack(raw, requesterId) {
    const encoded = raw?.encoded || raw?.track;
    if (!encoded) return null;
    return {
        encoded,
        info: raw.info || raw,
        requester: requesterId,
        pluginInfo: raw.pluginInfo || {}
    };
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function ensurePlayer(shoukaku, guild, voiceChannelId) {
    let player = shoukaku.players.get(guild.id);
    if (player) return player;

    const shardId = guild.shardId ?? guild.shard?.id ?? 0;
    for (let i = 0; i < 4; i++) {
        try {
            player = await shoukaku.joinVoiceChannel({
                guildId: guild.id,
                channelId: voiceChannelId,
                shardId,
                deaf: false,
                mute: false
            });
            if (player) {
                await sleep(1500);
                return player;
            }
        } catch (e) {
            const msg = String(e?.message || e || '');
            console.warn('[music] joinVoice', msg.slice(0, 140));
            if (/already have an existing connection/i.test(msg)) {
                try {
                    await shoukaku.leaveVoiceChannel(guild.id);
                } catch (_) {}
                await sleep(600);
            }
            if (i === 3) {
                throw new Error(
                    'Não consegui entrar no canal de voz. Dê ao bot Conectar + Falar no canal.'
                );
            }
            await sleep(800 * (i + 1));
        }
    }
    throw new Error('Falha ao conectar na call.');
}

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
        if (!ch?.isTextBased()) return;
        await ch
            .send({
                embeds: [new EmbedBuilder().setColor(color).setDescription(String(content).slice(0, 1900))]
            })
            .catch(() => {});
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
    if (!track?.encoded) throw new Error('track sem encoded');
    const target = Math.max(50, Math.min(100, Number(volume) || 100));

    try {
        await player.playTrack({
            track: { encoded: track.encoded },
            volume: target,
            paused: false
        });
    } catch (e1) {
        console.warn('[music] playTrack+vol falhou, retry mínimo:', e1?.message || e1);
        await player.playTrack({ track: { encoded: track.encoded } });
    }

    try {
        if (typeof player.setGlobalVolume === 'function') {
            await player.setGlobalVolume(target);
        } else if (typeof player.setVolume === 'function') {
            await player.setVolume(target);
        }
    } catch (e) {
        console.warn('[music] volume', e?.message || e);
    }

    try {
        if (typeof player.setPaused === 'function') await player.setPaused(false);
    } catch (_) {}

    console.log('[music] play OK vol=' + target + ' title=' + String(track.info?.title || '').slice(0, 60));
}

async function playNext(client, guildId) {
    if (playLocks.get(guildId)) return;
    playLocks.set(guildId, true);

    try {
        const shoukaku = client.shoukaku;
        if (!shoukaku) return;

        const q = getQueue(guildId);
        let player = shoukaku.players.get(guildId);

        if (!player && q.voiceChannelId && (q.current || q.tracks.length)) {
            try {
                const guild = await client.guilds.fetch(guildId).catch(() => null);
                if (guild) {
                    player = await ensurePlayer(shoukaku, guild, q.voiceChannelId);
                    bindPlayerEvents(client, player, guildId);
                }
            } catch (_) {
                await sleep(1000);
                return;
            }
        }
        if (!player) return;

        const now = Date.now();
        if (now - (q.lastAdvance || 0) < 250 && q.playing && q.current) return;
        q.lastAdvance = now;

        if (q.loop === 1 && q.current && q.retries === 0) {
        } else if (q.loop === 2 && q.current && q.retries === 0) {
            q.tracks.push(q.current);
            q.current = null;
        } else if (q.retries === 0) {
            q.current = null;
        }

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
    } finally {
        playLocks.set(guildId, false);
    }
}

async function handlePlayFailure(client, guildId, track, reason) {
    if (!track) {
        const q = getQueue(guildId);
        q.current = null;
        q.retries = 0;
        if (q.tracks.length) return playNext(client, guildId);
        return leaveIfIdle(client, guildId);
    }

    const shoukaku = client.shoukaku;
    const q = getQueue(guildId);
    q.retries = (q.retries || 0) + 1;

    if (!track.__scTried) {
        track.__scTried = true;
        try {
            const mirror = await trySoundcloudMirror(shoukaku, track);
            if (mirror) {
                q.current = mirror;
                q.retries = 0;
                return playNext(client, guildId);
            }
        } catch (_) {}
    }

    if (q.retries < MAX_PLAY_RETRIES) {
        await sleep(600 * q.retries);
        return playNext(client, guildId);
    }

    q.current = null;
    q.retries = 0;

    if (q.tracks.length) {
        await notifyChannel(
            client,
            guildId,
            `⏭️ Pulando faixa indisponível e seguindo a fila…`,
            0xfbbf24
        );
        return playNext(client, guildId);
    }

    await notifyChannel(
        client,
        guildId,
        `Não consegui reproduzir. Fila vazia — saindo da call.`,
        0xf87171
    );
    await leaveIfIdle(client, guildId);
}

function bindPlayerEvents(client, player, guildId) {
    if (!player || player.__aeternusBound) return;
    player.__aeternusBound = true;

    player.on('end', (data) => {
        try {
            const reason = data?.reason || data;
            if (reason === 'replaced') return;

            const q = getQueue(guildId);
            if (reason === 'loadFailed') {
                handlePlayFailure(client, guildId, q.current, 'loadFailed').catch(() => {});
                return;
            }

            q.retries = 0;
            if (q.loop !== 1) q.current = null;
            playNext(client, guildId).catch(() => {});
        } catch (_) {}
    });

    player.on('stuck', () => {
        try {
            const q = getQueue(guildId);
            handlePlayFailure(client, guildId, q.current, 'stuck').catch(() => {});
        } catch (_) {}
    });

    player.on('closed', () => {
        try {
            const q = getQueue(guildId);
            if (q.tracks.length || q.current) {
                setTimeout(() => {
                    playNext(client, guildId).catch(() => {});
                }, 1500);
            } else {
                deleteQueue(guildId);
            }
        } catch (_) {}
    });

    player.on('exception', (data) => {
        try {
            const q = getQueue(guildId);
            const msg = data?.exception?.message || data?.message || 'exception';
            console.warn(`[music] exception ${guildId}: ${String(msg).slice(0, 100)}`);
            handlePlayFailure(client, guildId, q.current, msg).catch(() => {});
        } catch (_) {}
    });

    player.on('error', () => {});
}

async function enqueue(client, { guild, voiceChannelId, textChannelId, query, requesterId }) {
    const shoukaku = client.shoukaku;
    if (!shoukaku) throw new Error('Sistema de música não inicializado.');

    let resolved;
    try {
        resolved = await resolveTracks(shoukaku, query);
    } catch (e) {
        const nodes = listNodes(shoukaku);
        const q = String(query || '').replace(/https?:\/\/\S+/g, '').trim();
        if (q && nodes[0]) {
            const p = await resolveOnNode(nodes[0], `scsearch:${q}`);
            if (p?.tracks?.length) resolved = { ...p, usedQuery: `scsearch:${q}` };
        }
        if (!resolved) throw e;
    }

    const wrapped = (resolved.tracks || [])
        .map((t) => wrapTrack(t, requesterId))
        .filter(Boolean);

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

async function handleMusicButton(interaction, client) {
    const parts = String(interaction.customId || '').split(':');
    if (parts[0] !== 'music') return false;
    const action = parts[1];
    const guildId = parts[2] || interaction.guildId;
    if (!guildId) return false;

    const member = interaction.member;
    const voiceId = member?.voice?.channelId;
    const me = interaction.guild?.members?.me;
    if (!voiceId || (me?.voice?.channelId && me.voice.channelId !== voiceId)) {
        await interaction
            .reply({ content: 'Entre no mesmo canal de voz do bot.', flags: MessageFlags.Ephemeral })
            .catch(() => {});
        return true;
    }

    const shoukaku = client.shoukaku;
    const player = shoukaku?.players?.get(guildId);
    const q = getQueue(guildId);

    try {
        if (action === 'pause') {
            if (!player) throw new Error('Nada tocando.');
            if (q.paused) {
                await player.setPaused(false);
                q.paused = false;
            } else {
                await player.setPaused(true);
                q.paused = true;
            }
            await interaction.deferUpdate().catch(() => {});
            if (q.current) await sendOrUpdatePanel(client, guildId, q.current);
            return true;
        }
        if (action === 'skip') {
            await interaction.deferUpdate().catch(() => {});
            q.retries = 0;
            q.current = null;
            await playNext(client, guildId);
            return true;
        }
        if (action === 'stop') {
            await interaction.deferUpdate().catch(() => {});
            q.tracks = [];
            q.current = null;
            q.playing = false;
            try {
                if (player) await player.stopTrack();
            } catch (_) {}
            await leaveIfIdle(client, guildId);
            await interaction.channel
                ?.send({ embeds: [new EmbedBuilder().setColor(0xf87171).setDescription('⏹️ Parado.')] })
                .catch(() => {});
            return true;
        }
        if (action === 'queue') {
            const lines = [];
            if (q.current) lines.push(`▶ **${q.current.info?.title || '?'}**`);
            q.tracks.slice(0, 10).forEach((t, i) => {
                lines.push(`\`${i + 1}.\` ${t.info?.title || '?'}`);
            });
            await interaction
                .reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x7c3aed)
                            .setTitle('📜 Fila')
                            .setDescription(lines.join('\n') || 'Vazia')
                    ],
                    flags: MessageFlags.Ephemeral
                })
                .catch(() => {});
            return true;
        }
        if (action === 'loop') {
            q.loop = (q.loop + 1) % 3;
            const label = q.loop === 1 ? 'Faixa' : q.loop === 2 ? 'Fila' : 'Off';
            await interaction
                .reply({ content: `Loop: **${label}**`, flags: MessageFlags.Ephemeral })
                .catch(() => {});
            if (q.current) await sendOrUpdatePanel(client, guildId, q.current);
            return true;
        }
    } catch (e) {
        await interaction
            .reply({ content: `❌ ${e.message || e}`, flags: MessageFlags.Ephemeral })
            .catch(() => {});
        return true;
    }
    return false;
}

module.exports = {
    getQueue,
    deleteQueue,
    enqueue,
    playNext,
    handleMusicButton,
    listNodes,
    resolveTracks
};
