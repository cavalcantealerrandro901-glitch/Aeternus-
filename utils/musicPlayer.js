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

const IDLE_MS = 5 * 60 * 1000;
const PLAY_DELAY_MS = 3 * 1000;

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

function sleep(ms) {
    const t = Math.max(0, Number(ms) || 0);
    return new Promise((r) => setTimeout(r, t));
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
            /** canal atual (público ou privado) */
            voiceChannelId: null,
            /** se true, a sala foi criada pelo bot e pode ser apagada */
            isPrivate: false,
            privateChannelId: null,
            ownerId: null,
            idleTimer: null,
            client: null,
            joining: false
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
        if (s.now || s.playing || s.queue.length || s.joining) return;
        console.log(`[music] inatividade — encerrando ${guildId}`);
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
            .setStyle(st.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`mctl_stop_${guildId}`)
            .setLabel('Parar')
            .setEmoji('⏹️')
            .setStyle(ButtonStyle.Danger)
    );
}

function nowEmbed(guildId) {
    const st = getState(guildId);
    const t = st.now;
    const mode = st.isPrivate ? '🔒 Privada' : '🌐 Pública';
    const chId = st.voiceChannelId || st.privateChannelId;
    const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle(st.paused ? '⏸️ Pausado' : st.joining ? '⏳ Conectando…' : '🎶 Tocando agora')
        .setDescription(t ? `**[${t.title}](${t.url})**` : '_Preparando…_')
        .addFields(
            { name: 'Fila', value: String(st.queue.length), inline: true },
            { name: 'Loop', value: st.loop ? 'Ligado' : 'Desligado', inline: true },
            { name: 'Modo', value: mode, inline: true },
            {
                name: 'Canal',
                value: chId ? `<#${chId}>` : '—',
                inline: true
            }
        )
        .setFooter({ text: '⏮️ Voltar · ⏸️ Pausa · ⏭️ Passar · 🔁 Loop · ⏹️ Parar' });
    if (t?.thumbnail) embed.setThumbnail(t.thumbnail);
    return embed;
}

async function createPrivateVoice(guild, member) {
    const me = guild.members.me || (await guild.members.fetchMe());
    const everyone = guild.roles.everyone;
    const parentId = getMusicCategoryId(guild.id);

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
                deny: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.Speak
                ]
            },
            {
                id: member.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.Speak,
                    PermissionFlagsBits.Stream,
                    PermissionFlagsBits.UseVAD
                ]
            },
            {
                id: me.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.Speak,
                    PermissionFlagsBits.Stream,
                    PermissionFlagsBits.UseVAD,
                    PermissionFlagsBits.MoveMembers,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.MuteMembers,
                    PermissionFlagsBits.DeafenMembers
                ]
            }
        ]
    });

    await channel.permissionOverwrites
        .edit(me.id, {
            ViewChannel: true,
            Connect: true,
            Speak: true,
            Stream: true,
            MoveMembers: true,
            ManageChannels: true
        })
        .catch(() => {});

    try {
        if (member.voice?.channelId) {
            await member.voice.setChannel(channel.id);
        }
    } catch (e) {
        console.warn('[music] move member:', e.message);
    }

    return channel;
}

async function deletePrivateChannel(guildId, client) {
    const st = getState(guildId);
    if (!st.isPrivate || !st.privateChannelId || !client) {
        st.privateChannelId = null;
        st.isPrivate = false;
        return;
    }
    const id = st.privateChannelId;
    st.privateChannelId = null;
    st.isPrivate = false;
    try {
        const ch = await client.channels.fetch(id).catch(() => null);
        if (ch) await ch.delete('Sessão de música encerrada').catch(() => {});
    } catch (_) {}
}

async function allowUserInPrivate(guildId, userId, client) {
    const st = getState(guildId);
    if (!st.isPrivate || !st.privateChannelId || !client) return false;
    const ch = await client.channels.fetch(st.privateChannelId).catch(() => null);
    if (!ch) return false;
    await ch.permissionOverwrites
        .edit(userId, {
            ViewChannel: true,
            Connect: true,
            Speak: true,
            Stream: true
        })
        .catch(() => {});
    return true;
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

    const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (me) {
        const perms = channel.permissionsFor(me);
        if (perms && !perms.has(PermissionFlagsBits.Connect)) {
            throw new Error('Bot sem permissão de **Conectar** neste canal.');
        }
        if (perms && !perms.has(PermissionFlagsBits.Speak)) {
            throw new Error('Bot sem permissão de **Falar** neste canal.');
        }
        if (perms && !perms.has(PermissionFlagsBits.ViewChannel)) {
            throw new Error('Bot sem permissão de **Ver canal**.');
        }
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
    });

    connection.on('stateChange', (o, n) => {
        if (o.status !== n.status) {
            console.log(`[voice ${guild.id}] ${o.status} → ${n.status}`);
        }
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
            ]);
        } catch {
            safeDestroy(connection);
            const st = getState(guild.id);
            stop(guild.id, st.client).catch(() => {});
        }
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch {
        safeDestroy(connection);
        throw new Error(
            'Não consegui conectar no canal de voz. Verifique permissões e a conexão (Render/Wi‑Fi).'
        );
    }

    connection.subscribe(getState(guild.id).player);
    console.log(`[voice ${guild.id}] conectado em ${voiceChannelId}`);
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
        console.log(`[music] tocando: ${next.title}`);
    } catch (err) {
        console.error('[music] stream', err.message);
        st.playing = false;
        st.now = null;
        await playNext(guildId);
    }
}

/**
 * @param {object} opts
 * @param {boolean} [opts.privateMode] — true = cria sala privada; false/default = canal público do usuário
 */
async function startSession(guild, member, textChannel, query, client, opts = {}) {
    const privateMode = !!opts.privateMode;
    const st = getState(guild.id);
    st.client = client;
    st.joining = true;
    clearIdleTimer(guild.id);

    let voiceChannelId = null;
    let createdNew = false;

    // Já existe sessão no mesmo servidor: continua no mesmo canal
    if (st.voiceChannelId) {
        const ch = await guild.channels.fetch(st.voiceChannelId).catch(() => null);
        if (ch) {
            voiceChannelId = ch.id;
        } else {
            st.voiceChannelId = null;
            st.privateChannelId = null;
            st.isPrivate = false;
        }
    }

    if (!voiceChannelId) {
        if (privateMode) {
            try {
                const priv = await createPrivateVoice(guild, member);
                voiceChannelId = priv.id;
                st.privateChannelId = priv.id;
                st.isPrivate = true;
                createdNew = true;
                console.log(`[music] sala privada: ${voiceChannelId}`);
            } catch (e) {
                console.warn('[music] privada falhou, tentando público:', e.message);
                if (!member.voice?.channelId) {
                    st.joining = false;
                    throw new Error(
                        'Não consegui criar sala privada e você não está em um canal de voz.'
                    );
                }
                voiceChannelId = member.voice.channelId;
                st.isPrivate = false;
                st.privateChannelId = null;
            }
        } else {
            // Modo público: entra onde o usuário está
            if (!member.voice?.channelId) {
                st.joining = false;
                throw new Error('Entre em um **canal de voz** (público ou privado) e tente de novo.');
            }
            voiceChannelId = member.voice.channelId;
            st.isPrivate = false;
            st.privateChannelId = null;
            console.log(`[music] canal público: ${voiceChannelId}`);
        }
    }

    st.voiceChannelId = voiceChannelId;
    st.ownerId = st.ownerId || member.id;

    // Se for privada e o membro não está nela, tenta mover
    if (st.isPrivate && member.voice?.channelId !== voiceChannelId) {
        await member.voice.setChannel(voiceChannelId).catch(() => {});
    }

    await ensureConnection(guild, voiceChannelId);

    const track = await resolveTrack(query);
    track.requestedBy = member.id;
    track.client = client;

    st.textChannelId = textChannel.id;

    const limit = maxQueue(guild.id);
    const total = (st.now ? 1 : 0) + st.queue.length;
    if (total >= limit) {
        st.joining = false;
        throw new Error(`Fila cheia (máx. ${limit}).`);
    }

    const shouldStart = !st.playing && !st.now;
    st.queue.push(track);

    if (shouldStart) {
        console.log(`[music] aguardando ${PLAY_DELAY_MS / 1000}s…`);
        await sleep(PLAY_DELAY_MS);
        st.joining = false;
        await playNext(guild.id);
    } else {
        st.joining = false;
    }

    return {
        track,
        voiceChannelId,
        createdNew,
        isPrivate: st.isPrivate,
        started: shouldStart,
        embed: nowEmbed(guild.id),
        components: [controlRow(guild.id)]
    };
}

/** Compat: nome antigo */
async function startPrivateSession(guild, member, textChannel, query, client) {
    return startSession(guild, member, textChannel, query, client, { privateMode: true });
}

async function onVoiceStateUpdate(oldState, newState) {
    const guildId = oldState.guild.id;
    const st = getState(guildId);
    if (!st.voiceChannelId || !st.ownerId) return;
    if (st.joining) return;

    const chId = st.voiceChannelId;

    // Dono saiu do canal da sessão
    const left =
        oldState.channelId === chId &&
        newState.channelId !== chId &&
        oldState.id === st.ownerId;

    if (left) {
        // Em canal público: só encerra se não sobrar ninguém (humano)
        const ch = await oldState.guild.channels.fetch(chId).catch(() => null);
        const humans = ch?.members?.filter((m) => !m.user.bot) || { size: 0 };
        if (st.isPrivate || humans.size === 0) {
            console.log(`[music] canal vazio/dono saiu — encerrando ${guildId}`);
            await stop(guildId, st.client || newState.client);
        }
        return;
    }

    if (oldState.channelId === chId || newState.channelId === chId) {
        const ch = await oldState.guild.channels.fetch(chId).catch(() => null);
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
    const cid = interaction.customId || '';

    if (cid.startsWith('minvite_')) {
        if (cid.startsWith('minvite_pick_')) {
            await interaction.reply({
                content: 'Para convidar: `O.play @usuario`',
                ephemeral: true
            });
            return true;
        }

        const parts = cid.split('_');
        const guildId = parts[1];
        const channelId = parts[2];

        if (interaction.guildId !== guildId) {
            await interaction.reply({ content: 'Servidor inválido.', ephemeral: true });
            return true;
        }

        await allowUserInPrivate(guildId, interaction.user.id, interaction.client);

        try {
            if (interaction.member?.voice?.channelId) {
                await interaction.member.voice.setChannel(channelId);
                await interaction.reply({ content: `🎧 Entrou em <#${channelId}>!`, ephemeral: true });
            } else {
                await interaction.reply({
                    content: `Entre em um canal de voz e clique de novo, ou vá em <#${channelId}>.`,
                    ephemeral: true
                });
            }
        } catch {
            await interaction.reply({
                content: `Não consegui te mover. Entre em <#${channelId}>.`,
                ephemeral: true
            });
        }
        return true;
    }

    if (cid.startsWith('mctl_cancelstop_')) {
        await interaction
            .update({ content: 'Ok, sessão mantida.', embeds: [], components: [] })
            .catch(() => interaction.deferUpdate().catch(() => {}));
        return true;
    }

    const m = cid.match(/^mctl_(skip|prev|pause|loop|stop)_(\d+)$/);
    if (!m) return false;

    const action = m[1];
    const guildId = m[2];
    if (interaction.guildId !== guildId) {
        await interaction.reply({ content: 'Sessão de outro servidor.', ephemeral: true });
        return true;
    }

    const st = getState(guildId);
    if (st.ownerId && interaction.user.id !== st.ownerId) {
        const inCh =
            st.voiceChannelId && interaction.member?.voice?.channelId === st.voiceChannelId;
        if (!inCh) {
            await interaction.reply({
                content: 'Só quem pediu a música (ou está no canal) controla.',
                ephemeral: true
            });
            return true;
        }
    }

    clearIdleTimer(guildId);

    if (action === 'stop') {
        await stop(guildId, interaction.client);
        await interaction
            .update({ content: '⏹️ Sessão encerrada.', embeds: [], components: [] })
            .catch(async () => {
                await interaction.reply({ content: '⏹️ Sessão encerrada.', ephemeral: true });
            });
        return true;
    }

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
            armIdleTimer(guildId);
        }
    } else if (action === 'loop') {
        st.loop = !st.loop;
    }

    await interaction
        .update({ embeds: [nowEmbed(guildId)], components: [controlRow(guildId)] })
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
    st.playing = false;
    st.paused = false;
    st.now = null;
    playNext(guildId).catch(() => {});
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
    st.joining = false;
    st.voiceChannelId = null;
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
        privateChannelId: st.privateChannelId,
        voiceChannelId: st.voiceChannelId,
        isPrivate: st.isPrivate
    };
}

function buildQueueEmbed(guildId) {
    const data = getQueue(guildId);
    const lines = [];
    if (data.now) lines.push(`**▶** [${data.now.title}](${data.now.url})`);
    else lines.push('**▶** _Nada_');
    data.queue.slice(0, 10).forEach((t, i) => lines.push(`**${i + 1}.** ${t.title}`));
    return new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle('📃 Fila')
        .setDescription(lines.join('\n').slice(0, 4000));
}

async function enqueue(guild, voiceChannelId, textChannelId, query, userId, client) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) throw new Error('Membro não encontrado.');
    const textChannel = await client.channels.fetch(textChannelId);
    return startSession(guild, member, textChannel, query, client, { privateMode: false });
}

module.exports = {
    startSession,
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
    allowUserInPrivate,
    RANDOM_POOL
};
