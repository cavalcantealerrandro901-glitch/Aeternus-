const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection
} = require('@discordjs/voice');
const play = require('play-dl');
const {
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const settings = require('./settings');
const { resolvePlayable } = require('./musicSearch');

/** @type {Map<string, any>} */
const guilds = new Map();

const IDLE_MS = 5 * 60 * 1000; // 5 min sem música

const RANDOM_POOL = [
    'lofi hip hop',
    'the weeknd blinding lights',
    'coldplay yellow',
    'ed sheeran perfect',
    'imagine dragons bones',
    'billie eilish birds of a feather',
    'queen bohemian rhapsody',
    'dua lipa levitating',
    'adele easy on me',
    'linkin park numb'
];

const DEFAULT_MAX_QUEUE = 50;

function maxQueue(guildId) {
    const cfg = settings.getGuild(guildId);
    const n = parseInt(cfg.musicMaxQueue, 10);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_MAX_QUEUE;
    return Math.min(n, 100);
}

function getMusicCategoryId(guildId) {
    const cfg = settings.getGuild(guildId);
    return cfg.musicCategory || cfg.musicVoiceChannel || null;
}

function safeDestroy(connection) {
    if (!connection) return;
    try {
        if (connection.state?.status === VoiceConnectionStatus.Destroyed) return;
        connection.destroy();
    } catch (err) {
        if (!/already been destroyed/i.test(String(err?.message || err))) {
            console.warn('[voice] safeDestroy:', err.message);
        }
    }
}

function getState(guildId) {
    if (!guilds.has(guildId)) {
        const player = createAudioPlayer();
        guilds.set(guildId, {
            player,
            queue: [],
            history: [],
            textChannelId: null,
            now: null,
            playing: false,
            paused: false,
            loop: false,
            privateChannelId: null,
            ownerId: null,
            idleTimer: null,
            client: null
        });

        player.on(AudioPlayerStatus.Idle, () => {
            const st = guilds.get(guildId);
            if (!st || st.paused) return;

            if (st.loop && st.now) {
                st.queue.unshift({ ...st.now });
            } else if (st.now) {
                st.history.push(st.now);
                if (st.history.length > 30) st.history.shift();
            }
            st.now = null;
            st.playing = false;
            st.paused = false;

            if (st.queue.length) {
                playNext(guildId).catch(() => {});
            } else {
                // nada na fila → inicia contagem de inatividade
                armIdleTimer(guildId);
            }
        });

        player.on('error', (err) => {
            console.error('[music] player', guildId, err.message);
            const st = guilds.get(guildId);
            if (st) {
                st.now = null;
                st.playing = false;
                st.paused = false;
            }
            playNext(guildId).catch(() => {});
        });
    }
    return guilds.get(guildId);
}

function clearIdleTimer(guildId) {
    const st = getState(guildId);
    if (st.idleTimer) {
        clearTimeout(st.idleTimer);
        st.idleTimer = null;
    }
}

function armIdleTimer(guildId) {
    const st = getState(guildId);
    clearIdleTimer(guildId);
    st.idleTimer = setTimeout(() => {
        const s = getState(guildId);
        // ainda sem música?
        if (s.now || s.playing || s.queue.length) return;
        console.log(`[music] inatividade 5min — encerrando sala ${guildId}`);
        stop(guildId, s.client).catch(() => {});
    }, IDLE_MS);
}

function controlRow(guildId) {
    const st = getState(guildId);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mctl_prev_${guildId}`)
            .setLabel('Voltar')
            .setEmoji('⏮️')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`mctl_pause_${guildId}`)
            .setLabel(st.paused ? 'Continuar' : 'Pausa')
            .setEmoji(st.paused ? '▶️' : '⏸️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`mctl_skip_${guildId}`)
            .setLabel('Passar')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`mctl_loop_${guildId}`)
            .setLabel('Repetir')
            .setEmoji('🔁')
            .setStyle(st.loop ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
}

function nowEmbed(guildId) {
    const st = getState(guildId);
    const t = st.now;
    const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle(st.paused ? '⏸️ Pausado' : '🎶 Tocando agora')
        .setDescription(t ? `**[${t.title}](${t.url})**` : '_Nada tocando — sala fecha em 5 min_')
        .addFields(
            { name: 'Fila', value: String(st.queue.length), inline: true },
            { name: 'Loop', value: st.loop ? 'Ligado' : 'Desligado', inline: true },
            {
                name: 'Sala',
                value: st.privateChannelId ? `<#${st.privateChannelId}>` : '—',
                inline: true
            }
        )
        .setFooter({ text: '⏮️ Voltar · ⏸️ Pausa · ⏭️ Passar · 🔁 Repetir' });
    if (t?.thumbnail) embed.setThumbnail(t.thumbnail);
    return embed;
}

async function createPrivateVoice(guild, member) {
    const me = guild.members.me || (await guild.members.fetchMe());
    const everyone = guild.roles.everyone;
    const parentId = getMusicCategoryId(guild.id);

    // valida categoria
    let parent = null;
    if (parentId) {
        parent = await guild.channels.fetch(parentId).catch(() => null);
        if (parent && parent.type !== ChannelType.GuildCategory && parent.type !== 4) {
            parent = null;
        }
    }

    const channel = await guild.channels.create({
        name: `🎵 · ${member.displayName || member.user.username}`.slice(0, 90),
        type: ChannelType.GuildVoice,
        parent: parent ? parent.id : undefined,
        reason: `Sala privada de música — ${member.user.tag}`,
        permissionOverwrites: [
            {
                id: everyone.id,
                deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
            },
            {
                id: member.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.Speak,
                    PermissionFlagsBits.Stream
                ]
            },
            {
                id: me.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.Speak,
                    PermissionFlagsBits.MoveMembers,
                    PermissionFlagsBits.ManageChannels
                ]
            }
        ]
    });

    try {
        await member.voice.setChannel(channel.id);
    } catch (e) {
        console.warn('[music] move member:', e.message);
    }

    return channel;
}

async function deletePrivateChannel(guildId, client) {
    const st = getState(guildId);
    if (!st.privateChannelId || !client) return;
    const id = st.privateChannelId;
    st.privateChannelId = null;
    try {
        const ch = await client.channels.fetch(id).catch(() => null);
        if (ch) await ch.delete('Sessão de música encerrada').catch(() => {});
    } catch (_) {}
}

async function ensureConnection(guild, voiceChannelId) {
    const existing = getVoiceConnection(guild.id);
    if (existing) {
        const status = existing.state?.status;
        if (status !== VoiceConnectionStatus.Destroyed) {
            if (existing.joinConfig.channelId === voiceChannelId) {
                if (status === VoiceConnectionStatus.Ready) return existing;
                try {
                    await entersState(existing, VoiceConnectionStatus.Ready, 20_000);
                    return existing;
                } catch {
                    safeDestroy(existing);
                }
            } else {
                safeDestroy(existing);
            }
        }
    }

    const channel = await guild.channels.fetch(voiceChannelId).catch(() => null);
    if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== 2)) {
        throw new Error('Canal de voz inválido.');
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
    });

    connection.on('stateChange', (o, n) => {
        if (o.status !== n.status) console.log(`[voice ${guild.id}] ${o.status} → ${n.status}`);
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch {
        safeDestroy(connection);
        throw new Error('Não consegui conectar na voz. Verifique permissões e a rede do host (Render).');
    }

    getState(guild.id).player;
    connection.subscribe(getState(guild.id).player);
    return connection;
}

async function resolveTrack(query) {
    const q = (query || '').trim() || RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
    return resolvePlayable(q);
}

function formatDuration(sec) {
    sec = Math.floor(Number(sec) || 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

async function playNext(guildId) {
    const st = getState(guildId);
    clearIdleTimer(guildId);

    if (st.playing && !st.paused) return;

    const next = st.queue.shift();
    if (!next) {
        st.now = null;
        st.playing = false;
        st.paused = false;
        armIdleTimer(guildId);
        return;
    }

    st.playing = true;
    st.paused = false;
    st.now = next;

    try {
        const stream = await play.stream(next.url, { discordPlayerCompatibility: true });
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        st.player.play(resource);
    } catch (err) {
        console.error('[music] stream', err.message);
        st.playing = false;
        st.now = null;
        await playNext(guildId);
    }
}

async function startPrivateSession(guild, member, textChannel, query, client) {
    const st = getState(guild.id);
    st.client = client;
    clearIdleTimer(guild.id);

    let voiceChannelId = st.privateChannelId;
    if (voiceChannelId) {
        const ch = await guild.channels.fetch(voiceChannelId).catch(() => null);
        if (!ch) {
            st.privateChannelId = null;
            voiceChannelId = null;
        }
    }

    if (!voiceChannelId) {
        const priv = await createPrivateVoice(guild, member);
        st.privateChannelId = priv.id;
        st.ownerId = member.id;
        voiceChannelId = priv.id;
    } else {
        await member.voice.setChannel(voiceChannelId).catch(() => {});
    }

    const track = await resolveTrack(query);
    track.requestedBy = member.id;
    track.client = client;

    await ensureConnection(guild, voiceChannelId);
    st.textChannelId = textChannel.id;

    const limit = maxQueue(guild.id);
    const total = (st.now ? 1 : 0) + st.queue.length;
    if (total >= limit) throw new Error(`Fila cheia (máx. ${limit}).`);

    const wasIdle = !st.playing && !st.now && st.queue.length === 0;
    st.queue.push(track);

    if (wasIdle || !st.playing) {
        await playNext(guild.id);
    }

    return {
        track,
        voiceChannelId,
        started: wasIdle || !!st.now,
        embed: nowEmbed(guild.id),
        components: [controlRow(guild.id)]
    };
}

/** Se o dono sair da sala privada → encerra */
async function onVoiceStateUpdate(oldState, newState) {
    const guildId = oldState.guild.id;
    const st = getState(guildId);
    if (!st.privateChannelId || !st.ownerId) return;

    const leftPriv =
        oldState.channelId === st.privateChannelId &&
        newState.channelId !== st.privateChannelId &&
        oldState.id === st.ownerId;

    if (leftPriv) {
        console.log(`[music] dono saiu da sala — encerrando ${guildId}`);
        await stop(guildId, st.client || newState.client);
        return;
    }

    // sala vazia (só bot ou ninguém)
    if (oldState.channelId === st.privateChannelId || newState.channelId === st.privateChannelId) {
        const ch = await oldState.guild.channels.fetch(st.privateChannelId).catch(() => null);
        if (ch && ch.members) {
            const humans = ch.members.filter((m) => !m.user.bot);
            if (humans.size === 0) {
                console.log(`[music] sala vazia — encerrando ${guildId}`);
                await stop(guildId, st.client || newState.client);
            }
        }
    }
}

async function handleControl(interaction) {
    const m = interaction.customId.match(/^mctl_(skip|prev|pause|loop)_(\d+)$/);
    if (!m) return false;

    const action = m[1];
    const guildId = m[2];
    if (interaction.guildId !== guildId) {
        await interaction.reply({ content: 'Sessão de outro servidor.', ephemeral: true });
        return true;
    }

    const st = getState(guildId);
    if (st.ownerId && interaction.user.id !== st.ownerId) {
        const inPriv =
            st.privateChannelId && interaction.member?.voice?.channelId === st.privateChannelId;
        if (!inPriv) {
            await interaction.reply({
                content: 'Só quem pediu a música (ou está na sala) controla.',
                ephemeral: true
            });
            return true;
        }
    }

    clearIdleTimer(guildId);

    if (action === 'skip') {
        if (st.now) {
            st.history.push(st.now);
            if (st.history.length > 30) st.history.shift();
        }
        st.player.stop(true);
        st.playing = false;
        st.paused = false;
        st.now = null;
        await playNext(guildId);
    } else if (action === 'prev') {
        const prev = st.history.pop();
        if (!prev) {
            await interaction.reply({ content: 'Não há música anterior.', ephemeral: true });
            return true;
        }
        if (st.now) st.queue.unshift(st.now);
        st.queue.unshift(prev);
        st.player.stop(true);
        st.playing = false;
        st.paused = false;
        st.now = null;
        await playNext(guildId);
    } else if (action === 'pause') {
        if (st.paused) {
            st.player.unpause();
            st.paused = false;
            clearIdleTimer(guildId);
        } else {
            st.player.pause();
            st.paused = true;
            armIdleTimer(guildId); // pausado conta como inativo para o timer? user said without playing music - paused is not playing
        }
    } else if (action === 'loop') {
        st.loop = !st.loop;
    }

    await interaction
        .update({
            embeds: [nowEmbed(guildId)],
            components: [controlRow(guildId)]
        })
        .catch(async () => {
            await interaction.deferUpdate().catch(() => {});
        });
    return true;
}

function skip(guildId) {
    const st = getState(guildId);
    if (st.now) {
        st.history.push(st.now);
        if (st.history.length > 30) st.history.shift();
    }
    st.player.stop(true);
    return true;
}

async function stop(guildId, client) {
    const st = getState(guildId);
    clearIdleTimer(guildId);
    st.queue = [];
    st.history = [];
    st.now = null;
    st.playing = false;
    st.paused = false;
    st.loop = false;
    st.ownerId = null;
    try {
        st.player.stop(true);
    } catch (_) {}
    safeDestroy(getVoiceConnection(guildId));
    await deletePrivateChannel(guildId, client || st.client);
    return true;
}

function clearQueue(guildId) {
    const st = getState(guildId);
    const n = st.queue.length;
    st.queue = [];
    return n;
}

function removeAt(guildId, index1) {
    const st = getState(guildId);
    const i = index1 - 1;
    if (i < 0 || i >= st.queue.length) return null;
    const [removed] = st.queue.splice(i, 1);
    return removed;
}

function toggleLoop(guildId) {
    const st = getState(guildId);
    st.loop = !st.loop;
    return st.loop;
}

function getQueue(guildId) {
    const st = getState(guildId);
    return {
        now: st.now,
        queue: [...st.queue],
        loop: st.loop,
        max: maxQueue(guildId),
        privateChannelId: st.privateChannelId
    };
}

function buildQueueEmbed(guildId) {
    const data = getQueue(guildId);
    const lines = [];
    if (data.now) lines.push(`**▶** [${data.now.title}](${data.now.url})`);
    else lines.push('**▶** _Nada_');
    return new EmbedBuilder().setColor(0x1db954).setTitle('🎶 Fila').setDescription(lines.join('\n'));
}

async function enqueue(guild, voiceChannelId, textChannelId, query, userId, client) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) throw new Error('Membro não encontrado.');
    const textChannel = await client.channels.fetch(textChannelId);
    return startPrivateSession(guild, member, textChannel, query, client);
}

module.exports = {
    startPrivateSession,
    handleControl,
    onVoiceStateUpdate,
    enqueue,
    skip,
    stop,
    clearQueue,
    removeAt,
    toggleLoop,
    getQueue,
    buildQueueEmbed,
    formatDuration,
    controlRow,
    nowEmbed,
    RANDOM_POOL
};
