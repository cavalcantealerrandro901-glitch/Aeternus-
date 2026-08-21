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
const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
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

function getState(guildId) {
    if (!guilds.has(guildId)) {
        const player = createAudioPlayer();
        guilds.set(guildId, {
            player,
            queue: [],
            textChannelId: null,
            now: null,
            playing: false,
            loop: false
        });

        player.on(AudioPlayerStatus.Idle, () => {
            const st = guilds.get(guildId);
            if (!st) return;
            if (st.loop && st.now) st.queue.unshift({ ...st.now });
            st.now = null;
            st.playing = false;
            playNext(guildId).catch(() => {});
        });

        player.on('error', (err) => {
            console.error('[music] player', guildId, err.message);
            const st = guilds.get(guildId);
            if (st) {
                st.now = null;
                st.playing = false;
            }
            playNext(guildId).catch(() => {});
        });
    }
    return guilds.get(guildId);
}

function isVoiceChannel(channel) {
    if (!channel) return false;
    return (
        channel.type === ChannelType.GuildVoice ||
        channel.type === ChannelType.GuildStageVoice ||
        channel.type === 2 ||
        channel.type === 13
    );
}

async function ensureConnection(guild, voiceChannelId) {
    const existing = getVoiceConnection(guild.id);
    if (existing && existing.joinConfig.channelId === voiceChannelId) {
        if (existing.state.status === VoiceConnectionStatus.Ready) return existing;
        try {
            await entersState(existing, VoiceConnectionStatus.Ready, 20_000);
            return existing;
        } catch {
            existing.destroy();
        }
    } else if (existing) {
        existing.destroy();
    }

    const channel = await guild.channels.fetch(voiceChannelId).catch(() => null);
    if (!isVoiceChannel(channel)) {
        throw new Error('Canal de voz inválido. Configure no painel (🎵 Música) ou entre em um canal.');
    }

    const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (me) {
        const perms = channel.permissionsFor(me);
        if (perms) {
            if (!perms.has(PermissionFlagsBits.Connect)) {
                throw new Error(`Sem permissão **Conectar** em <#${channel.id}>.`);
            }
            if (!perms.has(PermissionFlagsBits.Speak)) {
                throw new Error(`Sem permissão **Falar** em <#${channel.id}>.`);
            }
        }
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
    });

    connection.on('stateChange', (oldState, newState) => {
        if (oldState.status !== newState.status) {
            console.log(`[voice ${guild.id}] ${oldState.status} → ${newState.status}`);
        }
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch (err) {
        try {
            connection.destroy();
        } catch (_) {}
        throw new Error(
            'Não consegui conectar na **voz** (UDP).\n' +
                'No **Termux/Android** isso costuma falhar.\n' +
                'Hospede o bot no **Render/VPS** para tocar áudio.\n' +
                'A **busca** por API continua funcionando com `O.buscar`.'
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
    if (st.playing) return;
    const next = st.queue.shift();
    if (!next) {
        st.now = null;
        return;
    }

    st.playing = true;
    st.now = next;

    try {
        const stream = await play.stream(next.url, { discordPlayerCompatibility: true });
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        st.player.play(resource);

        if (next.client && st.textChannelId) {
            const ch = await next.client.channels.fetch(st.textChannelId).catch(() => null);
            if (ch?.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setColor(0x1db954)
                    .setTitle('🎶 Tocando agora')
                    .setDescription(`**[${next.title}](${next.url})**`)
                    .addFields(
                        { name: 'Duração', value: formatDuration(next.duration), inline: true },
                        { name: 'Fonte', value: next.source || 'API', inline: true },
                        {
                            name: 'Pedido por',
                            value: next.requestedBy ? `<@${next.requestedBy}>` : 'Bot',
                            inline: true
                        }
                    );
                if (next.thumbnail) embed.setThumbnail(next.thumbnail);
                await ch.send({ embeds: [embed] }).catch(() => {});
            }
        }
    } catch (err) {
        console.error('[music] stream', err.message);
        st.playing = false;
        st.now = null;
        await playNext(guildId);
    }
}

async function enqueue(guild, voiceChannelId, textChannelId, query, userId, client) {
    const limit = maxQueue(guild.id);
    const st = getState(guild.id);
    const total = (st.now ? 1 : 0) + st.queue.length;
    if (total >= limit) {
        throw new Error(`Fila cheia (máx. **${limit}**).`);
    }

    const track = await resolveTrack(query);
    track.requestedBy = userId;
    track.client = client;

    await ensureConnection(guild, voiceChannelId);
    st.textChannelId = textChannelId;

    const wasIdle = !st.playing && !st.now && st.queue.length === 0;
    st.queue.push(track);

    if (wasIdle || !st.playing) {
        await playNext(guild.id);
        return { track, position: 0, started: true, queueSize: st.queue.length };
    }

    return { track, position: st.queue.length, started: false, queueSize: st.queue.length };
}

function skip(guildId) {
    getState(guildId).player.stop(true);
    return true;
}

function stop(guildId) {
    const st = getState(guildId);
    st.queue = [];
    st.now = null;
    st.playing = false;
    st.loop = false;
    st.player.stop(true);
    const conn = getVoiceConnection(guildId);
    if (conn) conn.destroy();
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
        max: maxQueue(guildId)
    };
}

function buildQueueEmbed(guildId) {
    const data = getQueue(guildId);
    const lines = [];
    if (data.now) {
        lines.push(`**▶** [${data.now.title}](${data.now.url})`);
    } else lines.push('**▶** _Nada tocando_');
    if (data.queue.length) {
        lines.push('', `**Fila (${data.queue.length})**`);
        data.queue.slice(0, 12).forEach((t, i) => {
            lines.push(`**${i + 1}.** [${t.title}](${t.url})`);
        });
    }
    return new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle('🎶 Fila')
        .setDescription(lines.join('\n').slice(0, 4000));
}

module.exports = {
    enqueue,
    skip,
    stop,
    clearQueue,
    removeAt,
    toggleLoop,
    getQueue,
    buildQueueEmbed,
    formatDuration,
    resolveTrack,
    RANDOM_POOL
};
