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
            history: [], // faixas já tocadas (para Voltar)
            textChannelId: null,
            now: null,
            playing: false,
            paused: false,
            loop: false,
            privateChannelId: null,
            ownerId: null,
            controlMessageId: null
        });

        player.on(AudioPlayerStatus.Idle, () => {
            const st = guilds.get(guildId);
            if (!st) return;
            if (st.paused) return; // pause não é idle real do fim da faixa em alguns casos

            if (st.loop && st.now) {
                st.queue.unshift({ ...st.now });
            } else if (st.now) {
                st.history.push(st.now);
                if (st.history.length > 30) st.history.shift();
            }
            st.now = null;
            st.playing = false;
            st.paused = false;
            playNext(guildId).catch(() => {});
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
        .setDescription(t ? `**[${t.title}](${t.url})**` : '_Nada_')
        .addFields(
            {
                name: 'Fila',
                value: String(st.queue.length),
                inline: true
            },
            {
                name: 'Loop',
                value: st.loop ? 'Ligado' : 'Desligado',
                inline: true
            },
            {
                name: 'Canal privado',
                value: st.privateChannelId ? `<#${st.privateChannelId}>` : '—',
                inline: true
            }
        )
        .setFooter({ text: '⏮️ Voltar · ⏸️ Pausa · ⏭️ Passar · 🔁 Repetir' });
    if (t?.thumbnail) embed.setThumbnail(t.thumbnail);
    return embed;
}

/**
 * Cria canal de voz privado (só o membro + bot veem/entram) e move o membro.
 */
async function createPrivateVoice(guild, member) {
    const me = guild.members.me || (await guild.members.fetchMe());
    const everyone = guild.roles.everyone;

    const channel = await guild.channels.create({
        name: `🎵 · ${member.displayName || member.user.username}`.slice(0, 90),
        type: ChannelType.GuildVoice,
        reason: `Sala privada de música para ${member.user.tag}`,
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

    // Move o membro para a sala
    try {
        if (member.voice?.channelId) {
            await member.voice.setChannel(channel.id);
        } else {
            // não está em VC — tenta mesmo assim (falha se não estiver em voz)
            await member.voice.setChannel(channel.id).catch(() => {});
        }
    } catch (e) {
        console.warn('[music] move member:', e.message);
    }

    return channel;
}

async function deletePrivateChannel(guildId, client) {
    const st = getState(guildId);
    if (!st.privateChannelId) return;
    try {
        const ch = await client.channels.fetch(st.privateChannelId).catch(() => null);
        if (ch) await ch.delete('Sessão de música encerrada').catch(() => {});
    } catch (_) {}
    st.privateChannelId = null;
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
        throw new Error(
            'Não consegui conectar na voz (UDP). No Termux costuma falhar — use Render/VPS.'
        );
    }

    const st = getState(guild.id);
    connection.subscribe(st.player);
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
    if (st.playing && !st.paused) return;

    const next = st.queue.shift();
    if (!next) {
        st.now = null;
        st.playing = false;
        st.paused = false;
        // sem fila: encerra sala privada depois de um tempo curto
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

/**
 * Sessão completa: cria VC privada, conecta, enfileira e toca.
 */
async function startPrivateSession(guild, member, textChannel, query, client) {
    const st = getState(guild.id);

    // Se já tem sala privada do mesmo dono, reutiliza
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
        // garante membro na sala
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

async function handleControl(interaction) {
    const id = interaction.customId;
    // mctl_skip_GUILDID
    const m = id.match(/^mctl_(skip|prev|pause|loop)_(\d+)$/);
    if (!m) return false;

    const action = m[1];
    const guildId = m[2];
    if (interaction.guildId !== guildId) {
        await interaction.reply({ content: 'Sessão de outro servidor.', ephemeral: true });
        return true;
    }

    const st = getState(guildId);
    if (st.ownerId && interaction.user.id !== st.ownerId) {
        // permite quem está no mesmo canal privado
        const member = interaction.member;
        const inPriv =
            st.privateChannelId && member?.voice?.channelId === st.privateChannelId;
        if (!inPriv) {
            await interaction.reply({
                content: 'Só quem pediu a música (ou está na sala) controla.',
                ephemeral: true
            });
            return true;
        }
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
        } else {
            st.player.pause();
            st.paused = true;
        }
    } else if (action === 'loop') {
        st.loop = !st.loop;
    }

    await interaction.update({
        embeds: [nowEmbed(guildId)],
        components: [controlRow(guildId)]
    }).catch(async () => {
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
    st.queue = [];
    st.history = [];
    st.now = null;
    st.playing = false;
    st.paused = false;
    st.loop = false;
    try {
        st.player.stop(true);
    } catch (_) {}
    safeDestroy(getVoiceConnection(guildId));
    if (client) await deletePrivateChannel(guildId, client);
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
    if (data.queue.length) {
        lines.push('', `**Fila**`);
        data.queue.slice(0, 10).forEach((t, i) => lines.push(`**${i + 1}.** ${t.title}`));
    }
    return new EmbedBuilder().setColor(0x1db954).setTitle('🎶 Fila').setDescription(lines.join('\n'));
}

// compat enqueue antigo
async function enqueue(guild, voiceChannelId, textChannelId, query, userId, client) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) throw new Error('Membro não encontrado.');
    const textChannel = await client.channels.fetch(textChannelId);
    return startPrivateSession(guild, member, textChannel, query, client);
}

module.exports = {
    startPrivateSession,
    handleControl,
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
