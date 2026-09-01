/**
 * Sistema de música Aeternus — @discordjs/voice + play-dl
 * Fila por servidor, stream sob demanda, auto-next, limpeza de conexão.
 */
const {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    joinVoiceChannel,
    getVoiceConnection,
    NoSubscriberBehavior
} = require('@discordjs/voice');
const play = require('play-dl');

/** @type {Map<string, GuildMusic>} */
const guilds = new Map();

function fmtDuration(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    return `${m}:${String(r).padStart(2, '0')}`;
}

function getState(guildId) {
    if (!guilds.has(guildId)) {
        guilds.set(guildId, {
            guildId,
            queue: [],
            current: null,
            player: null,
            textChannelId: null,
            voiceChannelId: null,
            loop: false, // false | 'track' | 'queue'
            volume: 100,
            paused: false
        });
    }
    return guilds.get(guildId);
}

async function resolveTrack(query, requestedBy) {
    let url = query;
    let info = null;

    try {
        if (play.yt_validate(query) === 'video') {
            const vi = await play.video_info(query);
            info = vi.video_details;
            url = info.url;
        } else if (play.yt_validate(query) === 'playlist') {
            // primeira faixa da playlist
            const pl = await play.playlist_info(query, { incomplete: true });
            const videos = await pl.all_videos();
            if (!videos?.length) return null;
            info = videos[0];
            url = info.url;
        } else {
            const results = await play.search(query, { limit: 1, source: { type: 'video' } });
            if (!results?.length) return null;
            info = results[0];
            url = info.url;
        }
    } catch (e) {
        console.error('[music] resolve:', e.message);
        return null;
    }

    const duration =
        Number(info.durationInSec) ||
        Number(info.durationInSec === 0 ? 0 : info.duration) ||
        0;

    return {
        title: info.title || query,
        url,
        duration,
        thumbnail: info.thumbnails?.[0]?.url || info.thumbnail?.url || null,
        channel: info.channel?.name || info.channel || 'YouTube',
        requestedBy: requestedBy || null
    };
}

async function ensureConnection(guild, voiceChannel) {
    let connection = getVoiceConnection(guild.id);
    if (connection) return connection;

    connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    } catch (e) {
        connection.destroy();
        throw new Error('Não consegui conectar no canal de voz.');
    }

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
            ]);
        } catch {
            try {
                connection.destroy();
            } catch (_) {}
            destroyGuild(guild.id);
        }
    });

    return connection;
}

function ensurePlayer(guildId) {
    const state = getState(guildId);
    if (state.player) return state.player;

    const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Play }
    });
    state.player = player;

    player.on(AudioPlayerStatus.Idle, () => {
        onTrackEnd(guildId).catch((e) => console.error('[music] idle', e.message));
    });

    player.on('error', (err) => {
        console.error('[music] player error', err.message);
        onTrackEnd(guildId).catch(() => {});
    });

    const connection = getVoiceConnection(guildId);
    if (connection) connection.subscribe(player);

    return player;
}

async function playCurrent(guildId) {
    const state = getState(guildId);
    const track = state.current;
    if (!track) return false;

    const connection = getVoiceConnection(guildId);
    if (!connection) return false;

    const player = ensurePlayer(guildId);
    connection.subscribe(player);

    try {
        const stream = await play.stream(track.url, { quality: 2 });
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
        });
        if (resource.volume) {
            resource.volume.setVolume(Math.max(0, Math.min(1, state.volume / 100)));
        }
        state.paused = false;
        player.play(resource);
        return true;
    } catch (e) {
        console.error('[music] stream', e.message);
        return false;
    }
}

async function onTrackEnd(guildId) {
    const state = getState(guildId);
    if (state.loop === 'track' && state.current) {
        await playCurrent(guildId);
        return;
    }
    if (state.loop === 'queue' && state.current) {
        state.queue.push(state.current);
    }
    state.current = null;

    if (state.queue.length) {
        state.current = state.queue.shift();
        const ok = await playCurrent(guildId);
        if (!ok) await onTrackEnd(guildId);
    } else {
        // nada na fila — desconecta após 60s
        setTimeout(() => {
            const s = guilds.get(guildId);
            if (s && !s.current && !s.queue.length) {
                leave(guildId);
            }
        }, 60_000);
    }
}

async function enqueue(guild, voiceChannel, textChannel, query, user) {
    const track = await resolveTrack(query, user);
    if (!track) return { ok: false, error: 'Nenhuma música encontrada.' };

    await ensureConnection(guild, voiceChannel);
    const state = getState(guild.id);
    state.textChannelId = textChannel?.id || state.textChannelId;
    state.voiceChannelId = voiceChannel.id;

    ensurePlayer(guild.id);

    if (!state.current) {
        state.current = track;
        const ok = await playCurrent(guild.id);
        if (!ok) {
            state.current = null;
            return { ok: false, error: 'Não consegui reproduzir esta faixa.' };
        }
        return { ok: true, track, position: 0, playing: true };
    }

    state.queue.push(track);
    return { ok: true, track, position: state.queue.length, playing: false };
}

function skip(guildId) {
    const state = getState(guildId);
    if (!state.player || (!state.current && !state.queue.length)) return false;
    state.player.stop(true);
    return true;
}

function pause(guildId) {
    const state = getState(guildId);
    if (!state.player || !state.current) return false;
    const ok = state.player.pause(true);
    if (ok) state.paused = true;
    return ok;
}

function resume(guildId) {
    const state = getState(guildId);
    if (!state.player || !state.current) return false;
    const ok = state.player.unpause();
    if (ok) state.paused = false;
    return ok;
}

function setVolume(guildId, vol) {
    const state = getState(guildId);
    state.volume = Math.max(0, Math.min(150, Math.floor(Number(vol) || 100)));
    return state.volume;
}

function setLoop(guildId, mode) {
    const state = getState(guildId);
    if (mode === 'track' || mode === 'queue' || mode === false) {
        state.loop = mode;
    } else if (mode === 'cycle') {
        state.loop = state.loop === false ? 'track' : state.loop === 'track' ? 'queue' : false;
    }
    return state.loop;
}

function stop(guildId) {
    const state = getState(guildId);
    state.queue = [];
    state.current = null;
    state.loop = false;
    if (state.player) state.player.stop(true);
    leave(guildId);
    return true;
}

function leave(guildId) {
    const connection = getVoiceConnection(guildId);
    if (connection) {
        try {
            connection.destroy();
        } catch (_) {}
    }
    destroyGuild(guildId);
}

function destroyGuild(guildId) {
    const state = guilds.get(guildId);
    if (state?.player) {
        try {
            state.player.stop(true);
        } catch (_) {}
    }
    guilds.delete(guildId);
}

function getQueueView(guildId) {
    const state = getState(guildId);
    return {
        current: state.current,
        queue: [...state.queue],
        loop: state.loop,
        volume: state.volume,
        paused: state.paused
    };
}

module.exports = {
    enqueue,
    skip,
    pause,
    resume,
    stop,
    leave,
    setVolume,
    setLoop,
    getQueueView,
    getState,
    fmtDuration,
    resolveTrack
};
