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

/** @type {Map<string, { player: import('@discordjs/voice').AudioPlayer, queue: any[], textChannelId: string, now: any }>} */
const guilds = new Map();

const RANDOM_POOL = [
    'lofi hip hop radio',
    'phaelah - home',
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
    'linkin park numb'
];

function getState(guildId) {
    if (!guilds.has(guildId)) {
        const player = createAudioPlayer();
        guilds.set(guildId, {
            player,
            queue: [],
            textChannelId: null,
            now: null,
            playing: false
        });

        player.on(AudioPlayerStatus.Idle, () => {
            const st = guilds.get(guildId);
            if (!st) return;
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
        // GuildVoice = 2
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
    } catch (e) {
        connection.destroy();
        throw new Error('Não consegui conectar no canal de voz. Verifique permissões (Conectar / Falar).');
    }

    const st = getState(guild.id);
    connection.subscribe(st.player);
    return connection;
}

async function resolveTrack(query) {
    const q = (query || '').trim() || RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];

    // URL direta
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
            /* cai na busca */
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
                        { name: 'Canal', value: next.channel || '—', inline: true },
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

/**
 * @param {import('discord.js').Guild} guild
 * @param {string} voiceChannelId
 * @param {string} textChannelId
 * @param {string} query
 * @param {string} userId
 * @param {import('discord.js').Client} client
 */
async function enqueue(guild, voiceChannelId, textChannelId, query, userId, client) {
    const track = await resolveTrack(query);
    track.requestedBy = userId;
    track.client = client;

    await ensureConnection(guild, voiceChannelId);

    const st = getState(guild.id);
    st.textChannelId = textChannelId;

    const wasIdle = !st.playing && !st.now && st.queue.length === 0;
    st.queue.push(track);

    if (wasIdle || !st.playing) {
        await playNext(guild.id);
        return { track, position: 0, started: true };
    }

    return { track, position: st.queue.length, started: false };
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
    st.player.stop(true);
    const conn = getVoiceConnection(guildId);
    if (conn) conn.destroy();
    return true;
}

function getQueue(guildId) {
    const st = getState(guildId);
    return { now: st.now, queue: [...st.queue] };
}

module.exports = {
    enqueue,
    skip,
    stop,
    getQueue,
    RANDOM_POOL
};
