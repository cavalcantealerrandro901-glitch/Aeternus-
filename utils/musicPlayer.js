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
const { EmbedBuilder } = require('discord.js');
const settings = require('./settings');

/** @type {Map<string, any>} */
const guilds = new Map();

const RANDOM_POOL = [
    'lofi hip hop radio',
    'the weeknd blinding lights',
    'coldplay yellow',
    'ed sheeran perfect',
    'imagine dragons bones',
    'harry styles as it was',
    'billie eilish birds of a feather',
    'arctic monkeys do i wanna know',
    'queen bohemian rhapsody',
    'post malone circles',
    'dua lipa levitating',
    'bruno mars locked out of heaven',
    'adele easy on me',
    'linkin park numb',
    'taylorswift shake it off'
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
            loop: false // loop da faixa atual
        });

        player.on(AudioPlayerStatus.Idle, () => {
            const st = guilds.get(guildId);
            if (!st) return;

            if (st.loop && st.now) {
                // recoloca a atual no início e toca de novo
                st.queue.unshift({ ...st.now });
            }
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

async function ensureConnection(guild, voiceChannelId) {
    const existing = getVoiceConnection(guild.id);
    if (existing && existing.joinConfig.channelId === voiceChannelId) {
        try {
            await entersState(existing, VoiceConnectionStatus.Ready, 15_000);
            return existing;
        } catch {
            existing.destroy();
        }
    } else if (existing) {
        existing.destroy();
    }

    const channel = await guild.channels.fetch(voiceChannelId).catch(() => null);
    if (!channel || channel.type !== 2) {
        throw new Error('Canal de voz inválido. Configure no painel (Música).');
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    } catch {
        connection.destroy();
        throw new Error('Não consegui conectar no canal de voz. Verifique permissões (Conectar / Falar).');
    }

    const st = getState(guild.id);
    connection.subscribe(st.player);
    return connection;
}

async function resolveTrack(query) {
    const q = (query || '').trim() || RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];

    if (play.yt_validate(q) === 'video' || /^https?:\/\//i.test(q)) {
        try {
            const info = await play.video_info(q);
            const v = info.video_details;
            return {
                title: v.title || 'Música',
                url: v.url,
                duration: v.durationInSec || 0,
                thumbnail: v.thumbnails?.[0]?.url || null,
                channel: v.channel?.name || 'YouTube'
            };
        } catch {
            /* busca */
        }
    }

    const results = await play.search(q, { limit: 1, source: { youtube: 'video' } });
    if (!results?.length) throw new Error('Nenhum resultado encontrado.');

    const v = results[0];
    return {
        title: v.title || q,
        url: v.url,
        duration: v.durationInSec || 0,
        thumbnail: v.thumbnails?.[0]?.url || null,
        channel: v.channel?.name || 'YouTube'
    };
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
                        { name: 'Na fila', value: String(st.queue.length), inline: true },
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
        throw new Error(`Fila cheia (máx. **${limit}**). Use \`O.skip\` ou \`O.clear\`.`)
    }

    const track = await resolveTrack(query);
    track.requestedBy = userId;
    track.client = client;
    track.id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
    const st = getState(guildId);
    st.player.stop(true);
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

/** Limpa só a fila (mantém a atual tocando) */
function clearQueue(guildId) {
    const st = getState(guildId);
    const removed = st.queue.length;
    st.queue = [];
    return removed;
}

/** Remove item da fila pelo índice 1-based */
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
        queue: st.queue.map((t) => ({
            title: t.title,
            url: t.url,
            duration: t.duration,
            requestedBy: t.requestedBy,
            channel: t.channel
        })),
        loop: st.loop,
        max: maxQueue(guildId)
    };
}

function buildQueueEmbed(guildId) {
    const data = getQueue(guildId);
    const lines = [];

    if (data.now) {
        lines.push(
            `**▶ Tocando**\n[${data.now.title}](${data.now.url}) · ${formatDuration(data.now.duration)}` +
                (data.now.requestedBy ? ` · <@${data.now.requestedBy}>` : '')
        );
    } else {
        lines.push('**▶ Tocando**\n_Nada no momento._');
    }

    if (data.queue.length) {
        lines.push('');
        lines.push(`**📋 Fila (${data.queue.length}/${data.max})**`);
        data.queue.slice(0, 15).forEach((t, i) => {
            lines.push(
                `**${i + 1}.** [${t.title}](${t.url}) · ${formatDuration(t.duration)}` +
                    (t.requestedBy ? ` · <@${t.requestedBy}>` : '')
            );
        });
        if (data.queue.length > 15) lines.push(`_…e mais ${data.queue.length - 15}_`);
    } else {
        lines.push('');
        lines.push('**📋 Fila**\n_Vazia — use `O.play <música>`_');
    }

    lines.push('');
    lines.push(`Loop da faixa: **${data.loop ? 'ligado' : 'desligado'}** · \`O.loop\``);

    return new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle('🎶 Fila de músicas')
        .setDescription(lines.join('\n').slice(0, 4000))
        .setFooter({ text: 'O.play · O.skip · O.remove <n> · O.clear · O.stop' });
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
    RANDOM_POOL
};
