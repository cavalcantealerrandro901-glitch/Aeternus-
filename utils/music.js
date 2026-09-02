/**
 * Música Aeternus — multi-fonte
 * SoundCloud via API pública (client_id) — não depende do play-dl.search SC
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

let audioAPI = null;
try {
    audioAPI = require('./audioAPI');
} catch (_) {}

const guilds = new Map();

/** client_id SoundCloud (cache) */
let scClientId = process.env.SOUNDCLOUD_CLIENT_ID || 'a3e059563d7fd3372b49b37f4ef3e9a9';
let scClientFetchedAt = 0;

async function refreshSoundCloudClientId() {
    // só tenta a cada 6h
    if (Date.now() - scClientFetchedAt < 6 * 60 * 60 * 1000 && scClientId) {
        return scClientId;
    }
    try {
        const { data: html } = await axios.get('https://soundcloud.com', {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const scriptUrls = [...String(html).matchAll(/src="(https:\/\/[^"]+sndcdn\.com\/assets\/[^"]+\.js)"/g)].map(
            (m) => m[1]
        );
        for (const url of scriptUrls.slice(0, 8)) {
            try {
                const { data: js } = await axios.get(url, { timeout: 8000 });
                const m = String(js).match(/client_id\s*[:=]\s*["']([a-zA-Z0-9]{32})["']/);
                if (m?.[1]) {
                    scClientId = m[1];
                    scClientFetchedAt = Date.now();
                    console.log('[music] SoundCloud client_id atualizado');
                    return scClientId;
                }
            } catch (_) {}
        }
    } catch (e) {
        console.error('[music] refresh SC client_id:', e.message);
    }
    scClientFetchedAt = Date.now();
    return scClientId;
}

async function searchSoundCloudPublic(query) {
    const client_id = await refreshSoundCloudClientId();
    if (!client_id) return null;

    try {
        const { data } = await axios.get('https://api-v2.soundcloud.com/search/tracks', {
            params: { q: query, client_id, limit: 5, app_locale: 'pt' },
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
        });
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
        // client_id pode ter expirado — força refresh uma vez
        if (e.response?.status === 401 || e.response?.status === 403) {
            scClientFetchedAt = 0;
            try {
                const client_id2 = await refreshSoundCloudClientId();
                const { data } = await axios.get('https://api-v2.soundcloud.com/search/tracks', {
                    params: { q: query, client_id: client_id2, limit: 5 },
                    timeout: 10000
                });
                const track = data?.collection?.[0];
                if (!track) return null;
                return {
                    title: track.title || query,
                    url: track.permalink_url,
                    duration: Math.floor((track.duration || 0) / 1000),
                    thumbnail: (track.artwork_url || '').replace('-large', '-t500x500') || null,
                    channel: track.user?.username || 'SoundCloud',
                    source: 'soundcloud'
                };
            } catch (e2) {
                console.error('[music] SC API retry:', e2.message);
            }
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
    return /^(https?:\/\/)?(open\.)?spotify\.com\/(track|album|playlist|artist)\//i.test(
        String(q || '')
    );
}

function isDeezerUrl(q) {
    return /^(https?:\/\/)?(www\.)?deezer\.com\//i.test(String(q || ''));
}

function isBandcampUrl(q) {
    return /bandcamp\.com\//i.test(String(q || ''));
}

function isVimeoUrl(q) {
    return /vimeo\.com\//i.test(String(q || ''));
}

function isDirectAudioUrl(q) {
    return /^https?:\/\/.+\.(mp3|ogg|wav|flac|m4a|aac|opus|webm)(\?.*)?$/i.test(String(q || ''));
}

function isRadioOrStreamUrl(q) {
    return (
        /^https?:\/\/.+(\/stream|\/live|\/radio|icecast|shoutcast|\.m3u8?|\.pls)(\?.*)?$/i.test(
            String(q || '')
        ) || /\.(m3u8?|pls)(\?.*)?$/i.test(String(q || ''))
    );
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
 * SoundCloud — SEM playDl.search (quebra com client_id undefined)
 */
async function resolveSoundCloud(q, requestedBy) {
    // Link direto
    if (isSoundCloudUrl(q)) {
        // tenta play-dl só no link (pode funcionar mesmo sem search)
        if (playDl) {
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
                console.error('[music] soundcloud link play-dl:', e.message);
            }
        }
        return {
            title: 'SoundCloud',
            url: q,
            duration: 0,
            thumbnail: null,
            channel: 'SoundCloud',
            source: 'soundcloud',
            requestedBy: requestedBy || null
        };
    }

    // Busca por texto → API pública
    try {
        if (audioAPI?.searchSoundCloudAPI) {
            const api = await audioAPI.searchSoundCloudAPI(q);
            if (api?.url) {
                return {
                    title: api.title || q,
                    url: api.url,
                    duration: Number(api.duration) || 0,
                    thumbnail: api.thumbnail || null,
                    channel: api.artist || 'SoundCloud',
                    source: 'soundcloud',
                    requestedBy: requestedBy || null
                };
            }
        }
    } catch (e) {
        console.error('[music] audioAPI SC:', e.message);
    }

    try {
        const pub = await searchSoundCloudPublic(q);
        if (pub) {
            return { ...pub, requestedBy: requestedBy || null };
        }
    } catch (e) {
        console.error('[music] soundcloud public:', e.message);
    }

    // NÃO usa playDl.search com source soundcloud — causa client_id undefined
    return null;
}

async function resolveJioSaavn(q, requestedBy) {
    if (!audioAPI?.searchJioSaavnAPI) return null;

    try {
        const result = await audioAPI.searchJioSaavnAPI(q);
        if (result) {
            const searchQ = `${result.title} ${result.artist || ''}`.trim();

            const sc = await resolveSoundCloud(searchQ, requestedBy);
            if (sc) {
                sc.title = result.title || sc.title;
                sc.channel = result.artist || sc.channel;
                sc.thumbnail = result.thumbnail || sc.thumbnail;
                sc.source = 'jiosaavn';
                return sc;
            }

            const yt = await resolveYouTube(searchQ, requestedBy);
            if (yt) {
                yt.title = result.title || yt.title;
                yt.channel = result.artist || yt.channel;
                yt.thumbnail = result.thumbnail || yt.thumbnail;
                yt.source = 'jiosaavn';
                return yt;
            }
        }
    } catch (e) {
        console.error('[music] jiosaavn:', e.message);
    }

    return null;
}

async function resolveSpotifyOrDeezer(q, requestedBy) {
    if (!playDl) return null;

    try {
        let searchQuery = q;
        let metaTitle = null;
        let metaArtist = null;
        let metaThumb = null;
        let sourceLabel = 'spotify';

        if (isSpotifyUrl(q)) {
            try {
                const sp = await playDl.spotify(q);
                if (sp) {
                    if (sp.type === 'track' || sp.name) {
                        metaTitle = sp.name || sp.title;
                        metaArtist =
                            sp.artists?.map?.((a) => a.name).join(', ') || sp.artist || '';
                        metaThumb = sp.thumbnail || sp.thumbnails?.[0]?.url || null;
                        searchQuery = `${metaTitle} ${metaArtist}`.trim();
                        sourceLabel = 'spotify';
                    }
                }
            } catch (e) {
                console.error('[music] spotify parse:', e.message);
            }
        } else if (isDeezerUrl(q)) {
            sourceLabel = 'deezer';
            searchQuery = q;
        }

        if (searchQuery && searchQuery !== q) {
            const sc = await resolveSoundCloud(searchQuery, requestedBy);
            if (sc) {
                sc.channel = metaArtist || sc.channel;
                sc.source = sourceLabel;
                if (metaThumb) sc.thumbnail = metaThumb;
                if (metaTitle) sc.title = metaTitle;
                return sc;
            }
        }

        const yt = await resolveYouTube(searchQuery || q, requestedBy);
        if (yt) {
            yt.source = sourceLabel;
            if (metaThumb) yt.thumbnail = metaThumb;
            if (metaTitle) yt.title = metaTitle;
            if (metaArtist) yt.channel = metaArtist;
            return yt;
        }
    } catch (e) {
        console.error('[music] spotify/deezer:', e.message);
    }

    return null;
}

async function resolveYouTube(q, requestedBy) {
    if (YouTube) {
        try {
            if (isYtUrl(q)) {
                const v = await YouTube.getVideo(q);
                if (v?.id) {
                    return {
                        title: v.title || q,
                        url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
                        duration: Number(v.duration) || 0,
                        thumbnail:
                            v.thumbnail?.displayThumbnailURL?.('maxresdefault') ||
                            v.thumbnail?.url ||
                            null,
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
                        thumbnail:
                            v.thumbnail?.displayThumbnailURL?.('maxresdefault') ||
                            v.thumbnail?.url ||
                            null,
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
                // busca YT padrão (sem source soundcloud)
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
            console.error('[music] play-dl yt:', e.message);
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

async function resolveDirectOrOther(q, requestedBy) {
    if (isDirectAudioUrl(q)) {
        return {
            title: decodeURIComponent(q.split('/').pop().split('?')[0]) || 'Áudio',
            url: q,
            duration: 0,
            thumbnail: null,
            channel: 'Link direto',
            source: 'direct',
            requestedBy: requestedBy || null
        };
    }

    if (isRadioOrStreamUrl(q)) {
        return {
            title: 'Rádio / Stream',
            url: q,
            duration: 0,
            thumbnail: null,
            channel: 'Live Stream',
            source: 'radio',
            requestedBy: requestedBy || null
        };
    }

    if (isBandcampUrl(q)) {
        return {
            title: 'Bandcamp',
            url: q,
            duration: 0,
            thumbnail: null,
            channel: 'Bandcamp',
            source: 'bandcamp',
            requestedBy: requestedBy || null
        };
    }

    if (isVimeoUrl(q)) {
        return {
            title: 'Vimeo',
            url: q,
            duration: 0,
            thumbnail: null,
            channel: 'Vimeo',
            source: 'vimeo',
            requestedBy: requestedBy || null
        };
    }

    return null;
}

async function resolveTrack(query, requestedBy) {
    const q = String(query || '').trim();
    if (!q) return null;

    let track = await resolveDirectOrOther(q, requestedBy);
    if (track) return track;

    // SoundCloud (API pública — não quebra)
    track = await resolveSoundCloud(q, requestedBy);
    if (track) return track;

    track = await resolveJioSaavn(q, requestedBy);
    if (track) return track;

    if (isSpotifyUrl(q) || isDeezerUrl(q)) {
        track = await resolveSpotifyOrDeezer(q, requestedBy);
        if (track) return track;
    }

    track = await resolveYouTube(q, requestedBy);
    if (track) return track;

    // busca genérica YT via play-dl (sem soundcloud source)
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
                    channel: d.channel?.name || d.user?.name || d.channel || 'Unknown',
                    source: d.url?.includes('soundcloud') ? 'soundcloud' : 'youtube',
                    requestedBy: requestedBy || null
                };
            }
        } catch (e) {
            console.error('[music] generic search:', e.message);
        }
    }

    return null;
}

async function openStream(url) {
    if (isDirectAudioUrl(url) || isRadioOrStreamUrl(url) || isBandcampUrl(url) || isVimeoUrl(url)) {
        return { stream: url, type: StreamType.Arbitrary };
    }

    if (playDl) {
        try {
            const s = await playDl.stream(url, { quality: 2 });
            if (s?.stream) return { stream: s.stream, type: s.type || StreamType.Arbitrary };
        } catch (e) {
            console.error('[music] play-dl stream:', e.message);
        }
    }

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
            error: 'Nenhuma música encontrada. Tente outro nome, link do YouTube ou SoundCloud.'
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
