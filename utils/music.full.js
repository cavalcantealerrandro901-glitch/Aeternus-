/**
 * Música Aeternus — multi-fonte
 * SoundCloud via client_id dinâmico + YouTube prioritário
 */
const {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    joinVoiceChannel,
    getVoiceConnection,
    NoSubscriberBehavior,
    StreamType
} = require('@discordjs/voice');
const { PermissionsBitField } = require('discord.js');
const axios = require('axios');
const scClient = require('./soundcloudClient');

try {
    process.env.FFMPEG_PATH = require('ffmpeg-static');
} catch (_) {}

let playDl = null;
try {
    playDl = require('play-dl');
    if (process.env.YT_COOKIE) {
        playDl.setToken({ youtube: { cookie: process.env.YT_COOKIE } }).catch(() => {});
    }
} catch (_) {}

const guilds = new Map();

async function refreshSoundCloudClientId(force = false) {
    return scClient.getSoundCloudClientId({ force: !!force });
}

async function searchSoundCloudPublic(query) {
    try {
        const data = await scClient.searchTracks(query, 5);
        const track = data?.collection?.find((t) => t?.permalink_url) || data?.collection?.[0];
        if (!track) return null;
        return {
            title: track.title || query,
            url: track.permalink_url,
            duration: Math.floor((track.duration || 0) / 1000),
            thumbnail: (track.artwork_url || '').replace('-large', '-t500x500') || null,
            channel: track.user?.username || 'SoundCloud',
            source: 'soundcloud'
        };
    } catch (e) {
        if (e.response?.status === 401 || /401/.test(e.message || '')) {
            console.warn('[music] SC 401 — tentando outras fontes');
        } else {
            console.error('[music] SC API:', e.message);
        }
        return null;
    }
}

function fmtDuration(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
    return `${m}:${String(r).padStart(2, '0')}`;
}

function isYtUrl(q) {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(String(q || ''));
}
function isSoundCloudUrl(q) {
    return /^(https?:\/\/)?(www\.|m\.|on\.)?soundcloud\.com\//i.test(String(q || ''));
}
function isSpotifyUrl(q) {
    return /^(https?:\/\/)?(open\.)?spotify\.com\/(track|album|playlist|artist)\//i.test(String(q || ''));
}
function isDeezerUrl(q) {
    return /^(https?:\/\/)?(www\.)?deezer\.com\//i.test(String(q || ''));
}

async function resolveYouTube(q, requestedBy) {
    if (!playDl) return null;
    try {
        if (isYtUrl(q)) {
            const info = await playDl.video_info(q).catch(() => null);
            const d = info?.video_details;
            if (!d) return null;
            return {
                title: d.title || q,
                url: d.url || q,
                duration: Number(d.durationInSec) || 0,
                thumbnail: d.thumbnails?.[0]?.url || null,
                channel: d.channel?.name || 'YouTube',
                source: 'youtube',
                requestedBy: requestedBy || null
            };
        }
        const results = await playDl.search(q, { limit: 1 });
        const d = results?.[0];
        if (!d) return null;
        return {
            title: d.title || d.name || q,
            url: d.url,
            duration: Number(d.durationInSec) || Number(d.duration) || 0,
            thumbnail: d.thumbnails?.[0]?.url || d.thumbnail || null,
            channel: d.channel?.name || 'YouTube',
            source: 'youtube',
            requestedBy: requestedBy || null
        };
    } catch (e) {
        console.error('[music] YouTube:', e.message);
        return null;
    }
}

async function resolveSoundCloud(q, requestedBy) {
    try {
        if (isSoundCloudUrl(q) && playDl) {
            try {
                const info = await playDl.soundcloud(q);
                if (info) {
                    return {
                        title: info.name || info.title || q,
                        url: info.url || q,
                        duration: Number(info.durationInSec) || Math.floor((info.durationMs || 0) / 1000) || 0,
                        thumbnail: info.thumbnail || null,
                        channel: info.user?.name || 'SoundCloud',
                        source: 'soundcloud',
                        requestedBy: requestedBy || null
                    };
                }
            } catch (_) {}
        }
        const pub = await searchSoundCloudPublic(q);
        if (pub) return { ...pub, requestedBy: requestedBy || null };
        return null;
    } catch (e) {
        console.error('[music] resolve SC:', e.message);
        return null;
    }
}

async function resolveJioSaavn(q, requestedBy) {
    try {
        const audioAPI = require('./audioAPI');
        const r = await audioAPI.searchJioSaavnAPI(q);
        if (!r) return null;
        // stream real via YouTube do mesmo título
        const yt = await resolveYouTube(`${r.title} ${r.artist || ''}`, requestedBy);
        if (yt) return yt;
        return {
            title: r.title,
            url: r.url,
            duration: r.duration || 0,
            thumbnail: r.thumbnail || null,
            channel: r.artist || 'JioSaavn',
            source: 'jio_saavn',
            requestedBy: requestedBy || null
        };
    } catch (_) {
        return null;
    }
}

async function resolveTrack(query, requestedBy) {
    const q = String(query || '').trim();
    if (!q) return null;

    if (isSoundCloudUrl(q)) {
        const sc = await resolveSoundCloud(q, requestedBy);
        if (sc) return sc;
    }

    let track = await resolveYouTube(q, requestedBy);
    if (track) return track;

    track = await resolveSoundCloud(q, requestedBy);
    if (track) return track;

    track = await resolveJioSaavn(q, requestedBy);
    if (track) return track;

    if (playDl) {
        try {
            const results = await playDl.search(q, { limit: 1 });
            if (results?.[0]) {
                const d = results[0];
                return {
                    title: d.title || d.name || q,
                    url: d.url,
                    duration: Number(d.durationInSec) || Number(d.duration) || 0,
                    thumbnail: d.thumbnails?.[0]?.url || d.thumbnail || null,
                    channel: d.channel?.name || 'Unknown',
                    source: 'youtube',
                    requestedBy: requestedBy || null
                };
            }
        } catch (e) {
            console.error('[music] generic search:', e.message);
        }
    }
    return null;
}

function getState(guildId) {
    if (!guilds.has(guildId)) {
        guilds.set(guildId, {
            queue: [],
            current: null,
            player: null,
            connection: null,
            volume: 100,
            paused: false,
            textChannelId: null
        });
    }
    return guilds.get(guildId);
}

async function ensureConnection(guild, voiceChannel) {
    const state = getState(guild.id);
    let conn = getVoiceConnection(guild.id);
    if (!conn) {
        conn = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true
        });
        try {
            await entersState(conn, VoiceConnectionStatus.Ready, 20000);
        } catch (e) {
            try { conn.destroy(); } catch (_) {}
            throw new Error('Não consegui entrar na call. Verifique permissões.');
        }
    }
    state.connection = conn;
    if (!state.player) {
        state.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        conn.subscribe(state.player);
        state.player.on(AudioPlayerStatus.Idle, () => {
            playNext(guild.id).catch(() => {});
        });
        state.player.on('error', (err) => {
            console.error('[music] player error:', err.message);
            playNext(guild.id).catch(() => {});
        });
    }
    return state;
}

async function openStream(url) {
    if (playDl) {
        try {
            const s = await playDl.stream(url, { discordPlayerCompatibility: true });
            return { stream: s.stream, type: s.type || StreamType.Arbitrary };
        } catch (e) {
            console.error('[music] stream:', e.message);
        }
    }
    return { stream: url, type: StreamType.Arbitrary };
}

async function playTrack(guildId, track) {
    const state = getState(guildId);
    if (!state.player || !track?.url) return false;
    const { stream, type } = await openStream(track.url);
    const resource = createAudioResource(stream, {
        inputType: type,
        inlineVolume: true
    });
    if (resource.volume) resource.volume.setVolume((state.volume || 100) / 100);
    state.current = track;
    state.paused = false;
    state.player.play(resource);
    return true;
}

async function playNext(guildId) {
    const state = getState(guildId);
    if (state.queue.length) {
        const next = state.queue.shift();
        return playTrack(guildId, next);
    }
    state.current = null;
    return false;
}

async function enqueue(guild, voiceChannel, textChannel, query, user) {
    if (!voiceChannel) return { ok: false, error: 'Entre em um canal de voz.' };
    const track = await resolveTrack(query, user);
    if (!track) return { ok: false, error: 'Não encontrei essa música.' };

    try {
        await ensureConnection(guild, voiceChannel);
    } catch (e) {
        return { ok: false, error: e.message };
    }

    const state = getState(guild.id);
    state.textChannelId = textChannel?.id || state.textChannelId;

    if (!state.current) {
        const ok = await playTrack(guild.id, track);
        if (!ok) return { ok: false, error: 'Falha ao tocar o áudio.' };
        return { ok: true, track, position: 0, playing: true };
    }
    state.queue.push(track);
    return { ok: true, track, position: state.queue.length, playing: false };
}

function skip(guildId) {
    const state = getState(guildId);
    if (!state.current && !state.queue.length) return false;
    try { state.player?.stop(true); } catch (_) {}
    return true;
}

function pause(guildId) {
    const state = getState(guildId);
    if (!state.current) return false;
    state.player?.pause();
    state.paused = true;
    return true;
}

function resume(guildId) {
    const state = getState(guildId);
    if (!state.current) return false;
    state.player?.unpause();
    state.paused = false;
    return true;
}

function stop(guildId) {
    const state = getState(guildId);
    state.queue = [];
    state.current = null;
    state.paused = false;
    try { state.player?.stop(true); } catch (_) {}
    try {
        const conn = getVoiceConnection(guildId);
        if (conn) conn.destroy();
    } catch (_) {}
    state.connection = null;
    return true;
}

function setVolume(guildId, vol) {
    const state = getState(guildId);
    state.volume = Math.max(0, Math.min(150, Math.floor(Number(vol) || 100)));
    return state.volume;
}

function getQueueView(guildId) {
    const state = getState(guildId);
    return {
        current: state.current,
        queue: [...state.queue],
        loop: false,
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
    setVolume,
    getQueueView,
    resolveTrack,
    fmtDuration,
    searchSoundCloudPublic,
    refreshSoundCloudClientId
};
