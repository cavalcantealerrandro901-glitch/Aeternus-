/**
 * Música Aeternus — prioriza SoundCloud (gratuito/estável) + YouTube como fallback
 * Fonte principal: SoundCloud (sem bloqueios pesados de YouTube)
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

let ytdl = null;
try {
    ytdl = require('@distube/ytdl-core');
} catch (_) {}

let YouTube = null;
try {
    YouTube = require('youtube-sr').default;
} catch (_) {}

const guilds = new Map();

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
    return /^(https?:\/\/)?(www\.|m\.)?soundcloud\.com\//i.test(String(q || ''));
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
            loop: false,
            volume: 100,
            paused: false
        });
    }
    return guilds.get(guildId);
}

/**
 * Resolve track priorizando SoundCloud (gratuito e estável para bots)
 */
async function resolveTrack(query, requestedBy) {
    const q = String(query || '').trim();
    if (!q) return null;

    // 1. Se for link direto do SoundCloud
    if (playDl && isSoundCloudUrl(q)) {
        try {
            const info = await playDl.soundcloud(q);
            if (info) {
                return {
                    title: info.name || info.title || q,
                    url: info.url || q,
                    duration: Number(info.durationInSec) || Number(info.duration) || 0,
                    thumbnail: info.thumbnail || null,
                    channel: info.user?.name || info.publisher?.name || 'SoundCloud',
                    source: 'soundcloud',
                    requestedBy: requestedBy || null
                };
            }
        } catch (e) {
            console.error('[music] soundcloud link:', e.message);
        }
    }

    // 2. Busca no SoundCloud (fonte principal gratuita)
    if (playDl) {
        try {
            const results = await playDl.search(q, {
                limit: 1,
                source: { soundcloud: 'tracks' }
            });
            if (results?.[0]) {
                const d = results[0];
                return {
                    title: d.name || d.title || q,
                    url: d.url,
                    duration: Number(d.durationInSec) || Number(d.duration) || 0,
                    thumbnail: d.thumbnail || null,
                    channel: d.user?.name || d.publisher?.name || 'SoundCloud',
                    source: 'soundcloud',
                    requestedBy: requestedBy || null
                };
            }
        } catch (e) {
            console.error('[music] soundcloud search:', e.message);
        }
    }

    // 3. Fallback: YouTube (caso SoundCloud não encontre)
    if (YouTube) {
        try {
            if (isYtUrl(q)) {
                const v = await YouTube.getVideo(q);
                if (v?.id) {
                    return {
                        title: v.title || q,
                        url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
                        duration: Number(v.duration) || 0,
                        thumbnail: v.thumbnail?.displayThumbnailURL?.('maxresdefault') || v.thumbnail?.url || null,
                        channel: v.channel?.name || 'YouTube',
                        source: 'youtube',
                        requestedBy: requestedBy || null
                    };
                }
            } else {
                const v = await YouTube.searchOne(q, 'video');
                if (v?.id) {
                    return {
                        title: v.title || q,
                        url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
                        duration: Number(v.duration) || 0,
                        thumbnail: v.thumbnail?.displayThumbnailURL?.('maxresdefault') || v.thumbnail?.url || null,
                        channel: v.channel?.name || 'YouTube',
                        source: 'youtube',
                        requestedBy: requestedBy || null
                    };
                }
            }
        } catch (e) {
            console.error('[music] youtube-sr:', e.message);
        }
    }

    if (playDl) {
        try {
            const kind = playDl.yt_validate(q);
            if (kind === 'video') {
                const vi = await playDl.video_info(q);
                const d = vi.video_details;
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
            if (kind !== 'playlist') {
                const results = await playDl.search(q, { limit: 1 });
                if (results?.[0]) {
                    const d = results[0];
                    return {
                        title: d.title || q,
                        url: d.url,
                        duration: Number(d.durationInSec) || Number(d.duration) || 0,
                        thumbnail: d.thumbnails?.[0]?.url || null,
                        channel: d.channel?.name || d.channel || 'YouTube',
                        source: 'youtube',
                        requestedBy: requestedBy || null
                    };
                }
            }
        } catch (e) {
            console.error('[music] play-dl resolve:', e.message);
        }
    }

    if (ytdl && isYtUrl(q) && ytdl.validateURL(q)) {
        try {
            const info = await ytdl.getBasicInfo(q);
            const d = info.videoDetails;
            return {
                title: d.title || q,
                url: d.video_url || q,
                duration: Number(d.lengthSeconds) || 0,
                thumbnail: d.thumbnails?.[d.thumbnails.length - 1]?.url || null,
                channel: d.author?.name || 'YouTube',
                source: 'youtube',
                requestedBy: requestedBy || null
            };
        } catch (e) {
            console.error('[music] ytdl info:', e.message);
        }
    }

    return null;
}

async function openStream(url) {
    // SoundCloud e YouTube via play-dl (melhor suporte atual)
    if (playDl) {
        try {
            const s = await playDl.stream(url, { quality: 2 });
            if (s?.stream) return { stream: s.stream, type: s.type || StreamType.Arbitrary };
        } catch (e) {
            console.error('[music] play-dl stream:', e.message);
        }
    }

    // Fallback ytdl só para YouTube
    if (ytdl && ytdl.validateURL(url)) {
        try {
            const stream = ytdl(url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
                dlChunkSize: 0
            });
            return { stream, type: StreamType.Arbitrary };
        } catch (e) {
            console.error('[music] ytdl stream:', e.message);
        }
    }

    return null;
}

function canJoin(guild, voiceChannel) {
    const me = guild.members.me;
    if (!me) return 'Bot não está no servidor.';
    const perms = voiceChannel.permissionsFor(me);
    if (!perms) return 'Sem permissões no canal de voz.';
    if (!perms.has(PermissionsBitField.Flags.Connect))
        return 'Preciso da permissão **Conectar** no canal de voz.';
    if (!perms.has(PermissionsBitField.Flags.Speak))
        return 'Preciso da permissão **Falar** no canal de voz.';
    if (voiceChannel.full) return 'Canal de voz cheio.';
    return null;
}

async function ensureConnection(guild, voiceChannel) {
    const permErr = canJoin(guild, voiceChannel);
    if (permErr) throw new Error(permErr);

    let connection = getVoiceConnection(guild.id);

    if (connection && connection.joinConfig.channelId === voiceChannel.id) {
        if (connection.state.status === VoiceConnectionStatus.Ready) return connection;
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
            return connection;
        } catch {
            try {
                connection.destroy();
            } catch (_) {}
            connection = null;
        }
    }

    if (connection) {
        try {
            connection.destroy();
        } catch (_) {}
    }

    connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch {
        try {
            connection.destroy();
        } catch (_) {}
        throw new Error(
            'Não consegui entrar no canal de voz a tempo. Verifique permissões (Conectar/Falar) e tente de novo.'
        );
    }

    connection.on('stateChange', (_oldS, newS) => {
        if (newS.status === VoiceConnectionStatus.Disconnected) {
            setTimeout(() => {
                const c = getVoiceConnection(guild.id);
                if (c && c.state.status === VoiceConnectionStatus.Disconnected) {
                    try {
                        c.destroy();
                    } catch (_) {}
                    destroyGuild(guild.id);
                }
            }, 5000);
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
        const opened = await openStream(track.url);
        if (!opened) return false;

        const resource = createAudioResource(opened.stream, {
            inputType: opened.type || StreamType.Arbitrary,
            inlineVolume: true
        });
        if (resource.volume) {
            resource.volume.setVolume(Math.max(0, Math.min(1, (state.volume || 100) / 100)));
        }
        state.paused = false;
        player.play(resource);
        return true;
    } catch (e) {
        console.error('[music] playCurrent:', e.message);
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
        setTimeout(() => {
            const s = guilds.get(guildId);
            if (s && !s.current && !s.queue.length) leave(guildId);
        }, 60_000);
    }
}

async function enqueue(guild, voiceChannel, textChannel, query, user) {
    if (!voiceChannel) return { ok: false, error: 'Entre em um canal de voz.' };

    const track = await resolveTrack(query, user);
    if (!track) {
        return {
            ok: false,
            error: 'Nenhuma música encontrada. Tente outro nome ou um link do SoundCloud.'
        };
    }

    try {
        await ensureConnection(guild, voiceChannel);
    } catch (e) {
        return { ok: false, error: e.message || 'Falha ao conectar no canal de voz.' };
    }

    const state = getState(guild.id);
    state.textChannelId = textChannel?.id || state.textChannelId;
    state.voiceChannelId = voiceChannel.id;
    ensurePlayer(guild.id);

    if (!state.current) {
        state.current = track;
        const ok = await playCurrent(guild.id);
        if (!ok) {
            state.current = null;
            return {
                ok: false,
                error: 'Achei a música, mas não consegui abrir o áudio. Tente outro link ou nome.'
            };
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
    if (mode === 'track' || mode === 'queue' || mode === false) state.loop = mode;
    else if (mode === 'cycle') {
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
