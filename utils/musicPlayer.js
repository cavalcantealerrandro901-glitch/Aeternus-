const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection,
    NoSubscriberBehavior,
    StreamType
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

/** 30s sem interação / sem ninguém → sai da call */
const IDLE_MS = 30 * 1000;
const EMPTY_MS = 30 * 1000;
const PLAY_DELAY_MS = 2 * 1000;

const RANDOM_POOL = [
    'lofi hip hop radio',
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
        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        });

        guilds.set(guildId, {
            player,
            queue: [],
            history: [],
            textChannelId: null,
            now: null,
            playing: false,
            paused: false,
            loop: false,
            voiceChannelId: null,
            isPrivate: false,
            privateChannelId: null,
            ownerId: null,
            idleTimer: null,
            emptyTimer: null,
            client: null,
            joining: false
        });

        player.on(AudioPlayerStatus.Playing, () => {
            console.log(`[music] ${guildId} status: Playing`);
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
                playNext(guildId).catch((e) => console.error('[music] playNext idle', e.message));
            } else {
                armIdleTimer(guildId);
            }
        });

        player.on('error', (err) => {
            console.error('[music] player error', guildId, err.message);
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

function clearEmptyTimer(guildId) {
    const st = getState(guildId);
    if (st.emptyTimer) {
        clearTimeout(st.emptyTimer);
        st.emptyTimer = null;
    }
}

function armIdleTimer(guildId) {
    const st = getState(guildId);
    clearIdleTimer(guildId);
    st.idleTimer = setTimeout(() => {
        const s = getState(guildId);
        if (s.now || s.playing || s.queue.length || s.joining) return;
        console.log(`[music] 30s sem interação — saindo ${guildId}`);
        stop(guildId, s.client).catch(() => {});
    }, IDLE_MS);
}

function armEmptyTimer(guildId) {
    const st = getState(guildId);
    clearEmptyTimer(guildId);
    st.emptyTimer = setTimeout(() => {
        const s = getState(guildId);
        console.log(`[music] 30s sem ninguém na call — saindo ${guildId}`);
        stop(guildId, s.client).catch(() => {});
    }, EMPTY_MS);
}

function touchActivity(guildId) {
    clearIdleTimer(guildId);
    // se estiver tocando, não arma idle; idle só quando fila vazia
    const st = getState(guildId);
    if (!st.now && !st.playing && !st.queue.length) {
        armIdleTimer(guildId);
    }
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
            { name: 'Canal', value: chId ? `<#${chId}>` : '—', inline: true }
        )
        .setFooter({ text: 'Sai em 30s se a call ficar vazia ou sem música' });
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
        reason: `Sala privada — ${member.user.tag}`,
        permissionOverwrites: [
            {
                id: everyone.id,
                deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
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
                    PermissionFlagsBits.ManageChannels
                ]
            }
        ]
    });

    try {
        if (member.voice?.channelId) await member.voice.setChannel(channel.id);
    } catch (_) {}

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
        if (ch) await ch.delete('Sessão encerrada').catch(() => {});
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
                if (status === VoiceConnectionStatus.Ready) {
                    existing.subscribe(getState(guild.id).player);
                    return existing;
                }
                try {
                    await entersState(existing, VoiceConnectionStatus.Ready, 20_000);
                    existing.subscribe(getState(guild.id).player);
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
            throw new Error('Bot sem permissão de **Conectar**.');
        }
        if (perms && !perms.has(PermissionFlagsBits.Speak)) {
            throw new Error('Bot sem permissão de **Falar**.');
        }
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
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
            'Não consegui ficar Ready no canal. Intent Guild Voice States + permissões Conectar/Falar.'
        );
    }

    connection.subscribe(getState(guild.id).player);
    console.log(`[voice ${guild.id}] Ready + subscribed em ${voiceChannelId}`);
    return connection;
}

/**
 * Obtém stream reproduzível (várias tentativas — YouTube muda muito)
 */
async function getStream(url) {
    const attempts = [];

    // 1) stream direto com compat
    try {
        const s = await play.stream(url, {
            discordPlayerCompatibility: true,
            quality: 2
        });
        if (s?.stream) {
            console.log('[music] stream ok (compat)', s.type);
            return s;
        }
    } catch (e) {
        attempts.push(`compat: ${e.message}`);
    }

    // 2) via video_info
    try {
        const info = await play.video_info(url);
        const s = await play.stream_from_info(info, {
            discordPlayerCompatibility: true,
            quality: 2
        });
        if (s?.stream) {
            console.log('[music] stream ok (info)', s.type);
            return s;
        }
    } catch (e) {
        attempts.push(`info: ${e.message}`);
    }

    // 3) stream sem flags
    try {
        const s = await play.stream(url);
        if (s?.stream) {
            console.log('[music] stream ok (raw)', s.type);
            return s;
        }
    } catch (e) {
        attempts.push(`raw: ${e.message}`);
    }

    throw new Error(
        'Não consegui abrir o áudio do YouTube.\n' +
            attempts.map((a) => `• ${a}`).join('\n')
    );
}

async function playNext(guildId) {
    const st = getState(guildId);
    clearIdleTimer(guildId);
    clearEmptyTimer(guildId);

    if (st.playing && !st.paused && st.now) return;

    const next = st.queue.shift();
    if (!next) {
        st.now = null;
        st.playing = false;
        st.paused = false;
        armIdleTimer(guildId);
        return;
    }

    if (!next.url) {
        console.error('[music] track sem url', next.title);
        st.playing = false;
        return playNext(guildId);
    }

    // Garante conexão inscrita
    const conn = getVoiceConnection(guildId);
    if (!conn || conn.state.status === VoiceConnectionStatus.Destroyed) {
        console.error('[music] sem conexão de voz');
        st.queue.unshift(next);
        st.playing = false;
        armIdleTimer(guildId);
        return;
    }
    conn.subscribe(st.player);

    st.playing = true;
    st.paused = false;
    st.now = next;

    try {
        const source = await getStream(next.url);

        const resource = createAudioResource(source.stream, {
            inputType: source.type || StreamType.Arbitrary,
            inlineVolume: true
        });

        if (resource.volume) {
            resource.volume.setVolume(1.0);
        }

        st.player.play(resource);

        // Aguarda começar a tocar (até 12s)
        try {
            await entersState(st.player, AudioPlayerStatus.Playing, 12_000);
            console.log(`[music] ▶ Playing: ${next.title}`);
        } catch (e) {
            console.warn('[music] não entrou em Playing:', e.message, 'status=', st.player.state.status);
            // tenta mesmo assim — às vezes Buffering demora
        }
    } catch (err) {
        console.error('[music] stream falhou:', err.message);
        st.playing = false;
        st.now = null;

        // avisa no canal de texto
        if (st.textChannelId && st.client) {
            const ch = await st.client.channels.fetch(st.textChannelId).catch(() => null);
            if (ch?.isTextBased()) {
                ch.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('❌ Falha ao tocar')
                            .setDescription(
                                `**${next.title}**\n\`${err.message.slice(0, 300)}\`\nTentando próxima…`
                            )
                    ]
                }).catch(() => {});
            }
        }

        await playNext(guildId);
    }
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

async function startSession(guild, member, textChannel, query, client, opts = {}) {
    const privateMode = !!opts.privateMode;
    const st = getState(guild.id);
    st.client = client;
    st.joining = true;
    clearIdleTimer(guild.id);
    clearEmptyTimer(guild.id);

    let voiceChannelId = null;
    let createdNew = false;

    if (st.voiceChannelId) {
        const ch = await guild.channels.fetch(st.voiceChannelId).catch(() => null);
        if (ch) voiceChannelId = ch.id;
        else {
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
            } catch (e) {
                if (!member.voice?.channelId) {
                    st.joining = false;
                    throw new Error('Não consegui criar sala privada e você não está em um VC.');
                }
                voiceChannelId = member.voice.channelId;
                st.isPrivate = false;
                st.privateChannelId = null;
            }
        } else {
            if (!member.voice?.channelId) {
                st.joining = false;
                throw new Error('Entre em um **canal de voz** e tente de novo.');
            }
            voiceChannelId = member.voice.channelId;
            st.isPrivate = false;
            st.privateChannelId = null;
        }
    }

    st.voiceChannelId = voiceChannelId;
    st.ownerId = st.ownerId || member.id;

    if (st.isPrivate && member.voice?.channelId !== voiceChannelId) {
        await member.voice.setChannel(voiceChannelId).catch(() => {});
    }

    await ensureConnection(guild, voiceChannelId);

    const track = await resolveTrack(query);
    if (!track?.url) {
        st.joining = false;
        throw new Error('Não achei um link reproduzível para essa música.');
    }

    track.requestedBy = member.id;
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

async function startPrivateSession(guild, member, textChannel, query, client) {
    return startSession(guild, member, textChannel, query, client, { privateMode: true });
}

async function onVoiceStateUpdate(oldState, newState) {
    const guildId = oldState.guild.id;
    const st = getState(guildId);
    if (!st.voiceChannelId) return;
    if (st.joining) return;

    const chId = st.voiceChannelId;

    if (oldState.channelId === chId || newState.channelId === chId) {
        const ch = await oldState.guild.channels.fetch(chId).catch(() => null);
        if (!ch?.members) return;

        const humans = ch.members.filter((m) => !m.user.bot);

        if (humans.size === 0) {
            console.log(`[music] call vazia — timer 30s ${guildId}`);
            armEmptyTimer(guildId);
        } else {
            clearEmptyTimer(guildId);
        }
    }
}

async function handleControl(interaction) {
    const cid = interaction.customId || '';

    if (cid.startsWith('minvite_')) {
        if (cid.startsWith('minvite_pick_')) {
            await interaction.reply({ content: 'Use `O.play @usuario`', ephemeral: true });
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
                    content: `Entre em um VC e clique de novo, ou vá em <#${channelId}>.`,
                    ephemeral: true
                });
            }
        } catch {
            await interaction.reply({ content: `Entre em <#${channelId}>.`, ephemeral: true });
        }
        return true;
    }

    if (cid.startsWith('mctl_cancelstop_')) {
        await interaction
            .update({ content: 'Ok.', embeds: [], components: [] })
            .catch(() => interaction.deferUpdate().catch(() => {}));
        return true;
    }

    const m = cid.match(/^mctl_(skip|prev|pause|loop|stop)_(\d+)$/);
    if (!m) return false;

    const action = m[1];
    const guildId = m[2];
    if (interaction.guildId !== guildId) {
        await interaction.reply({ content: 'Outro servidor.', ephemeral: true });
        return true;
    }

    const st = getState(guildId);
    if (st.ownerId && interaction.user.id !== st.ownerId) {
        const inCh =
            st.voiceChannelId && interaction.member?.voice?.channelId === st.voiceChannelId;
        if (!inCh) {
            await interaction.reply({
                content: 'Só quem pediu (ou está no canal) controla.',
                ephemeral: true
            });
            return true;
        }
    }

    touchActivity(guildId);
    clearIdleTimer(guildId);

    if (action === 'stop') {
        await stop(guildId, interaction.client);
        await interaction
            .update({ content: '⏹️ Saiu da call.', embeds: [], components: [] })
            .catch(async () => {
                await interaction.reply({ content: '⏹️ Encerrado.', ephemeral: true });
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
            await interaction.reply({ content: 'Sem música anterior.', ephemeral: true });
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
    clearEmptyTimer(guildId);
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
