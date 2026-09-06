/**
 * Musica sem Lavalink - @discordjs/voice + YouTube
 *
 * ENV:
 *   YOUTUBE_API_KEY=...   (YouTube Data API v3 - busca oficial)
 *   FFMPEG_PATH=/usr/bin/ffmpeg
 *   YTDLP_PATH=/usr/local/bin/yt-dlp
 *   Sem API key: busca via yt-dlp (ytsearch)
 */
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus,
    getVoiceConnection,
    StreamType
} = require('@discordjs/voice');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const COLOR = 0xa78bfa;
const COLOR_ERR = 0xef4444;
const COLOR_WARN = 0xf59e0b;

let clientRef = null;
const players = new Map();
let ytdlpPath = null;
let ffmpegPath = null;

function resolveBins() {
    const envFfmpeg = String(process.env.FFMPEG_PATH || '').trim();
    const envYtdlp = String(process.env.YTDLP_PATH || '').trim();

    if (envFfmpeg && fs.existsSync(envFfmpeg)) {
        ffmpegPath = envFfmpeg;
    } else {
        try {
            ffmpegPath = require('ffmpeg-static');
        } catch {
            ffmpegPath = 'ffmpeg';
        }
    }

    if (envYtdlp && fs.existsSync(envYtdlp)) {
        ytdlpPath = envYtdlp;
        resolveBins._ytdlp = null;
        return;
    }

    const systemYtdlp = ['/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp'].find((p) => fs.existsSync(p));
    if (systemYtdlp) {
        ytdlpPath = systemYtdlp;
        resolveBins._ytdlp = null;
        return;
    }

    try {
        const ytdlp = require('yt-dlp-exec');
        const cand = path.join(
            process.cwd(),
            'node_modules',
            'yt-dlp-exec',
            'bin',
            process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
        );
        ytdlpPath = fs.existsSync(cand) ? cand : 'yt-dlp';
        resolveBins._ytdlp = ytdlp;
    } catch {
        ytdlpPath = 'yt-dlp';
        resolveBins._ytdlp = null;
    }
}

function formatMs(ms) {
    if (!ms || ms < 0) return '-';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const ss = String(s % 60).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return h > 0 ? h + ':' + mm + ':' + ss : m + ':' + ss;
}

function getPlayer(guildId) {
    if (!players.has(guildId)) {
        players.set(guildId, {
            guildId,
            queue: [],
            current: null,
            textChannelId: null,
            voiceChannelId: null,
            volume: 80,
            paused: false,
            player: null,
            connection: null
        });
    }
    return players.get(guildId);
}

async function searchYoutubeApi(query, max) {
    max = max || 5;
    const key = String(process.env.YOUTUBE_API_KEY || '').trim();
    if (!key) return null;

    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
            part: 'snippet',
            type: 'video',
            maxResults: max,
            q: query,
            key: key
        },
        timeout: 12000
    });

    return (data.items || [])
        .map(function (it) {
            const id = it.id && it.id.videoId;
            if (!id) return null;
            const sn = it.snippet || {};
            const thumbs = sn.thumbnails || {};
            return {
                title: sn.title || 'YouTube',
                uri: 'https://www.youtube.com/watch?v=' + id,
                url: 'https://www.youtube.com/watch?v=' + id,
                length: 0,
                artwork: (thumbs.high && thumbs.high.url) || (thumbs.default && thumbs.default.url) || null,
                author: sn.channelTitle || '',
                id: id
            };
        })
        .filter(Boolean);
}

async function searchYtdlp(query, max) {
    max = max || 5;
    const ytdlp = resolveBins._ytdlp;
    const input = /^https?:\/\//i.test(query) ? query : 'ytsearch' + max + ':' + query;

    if (ytdlp) {
        const raw = await ytdlp(input, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            skipDownload: true,
            flatPlaylist: true
        });
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const entries = data.entries || (data.id ? [data] : []);
        return entries.slice(0, max).map(function (e) {
            return {
                title: e.title || e.fulltitle || 'YouTube',
                uri: e.webpage_url || e.url || (e.id ? 'https://www.youtube.com/watch?v=' + e.id : ''),
                url: e.webpage_url || e.url || (e.id ? 'https://www.youtube.com/watch?v=' + e.id : ''),
                length: Math.floor((e.duration || 0) * 1000),
                artwork: e.thumbnail || null,
                author: e.uploader || e.channel || '',
                id: e.id
            };
        });
    }

    return new Promise(function (resolve, reject) {
        const args = [input, '--dump-single-json', '--no-warnings', '--skip-download', '--flat-playlist', '--no-check-certificates'];
        const proc = spawn(ytdlpPath || 'yt-dlp', args, { windowsHide: true });
        let out = '';
        let err = '';
        proc.stdout.on('data', function (d) { out += d; });
        proc.stderr.on('data', function (d) { err += d; });
        proc.on('close', function (code) {
            if (code !== 0 && !out) return reject(new Error(err.slice(0, 200) || 'yt-dlp search fail'));
            try {
                const data = JSON.parse(out);
                const entries = data.entries || (data.id ? [data] : []);
                resolve(
                    entries.slice(0, max).map(function (e) {
                        return {
                            title: e.title || 'YouTube',
                            uri: e.webpage_url || e.url || (e.id ? 'https://www.youtube.com/watch?v=' + e.id : ''),
                            url: e.webpage_url || e.url || (e.id ? 'https://www.youtube.com/watch?v=' + e.id : ''),
                            length: Math.floor((e.duration || 0) * 1000),
                            artwork: e.thumbnail || null,
                            author: e.uploader || '',
                            id: e.id
                        };
                    })
                );
            } catch (e) {
                reject(e);
            }
        });
    });
}

async function resolveQuery(query) {
    const q = String(query || '').trim();
    if (!q) throw new Error('Busca vazia');

    if (/^https?:\/\//i.test(q)) {
        return [{ title: q, uri: q, url: q, length: 0, artwork: null, author: '', id: null }];
    }

    try {
        const api = await searchYoutubeApi(q, 5);
        if (api && api.length) {
            console.log('[music] busca YouTube API: ' + api.length + ' resultado(s)');
            return api;
        }
    } catch (e) {
        console.warn('[music] YouTube API:', (e.response && e.response.data && e.response.data.error && e.response.data.error.message) || e.message);
    }

    console.log('[music] busca via yt-dlp...');
    const list = await searchYtdlp(q, 5);
    if (!list.length) throw new Error('Nada encontrado no YouTube.');
    return list;
}

function createYtdlpStream(url) {
    const args = [
        url,
        '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
        '-o', '-',
        '--no-playlist',
        '--no-warnings',
        '--quiet',
        '--no-check-certificates'
    ];
    const proc = spawn(ytdlpPath || 'yt-dlp', args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    proc.stderr.on('data', function () {});
    return proc;
}

function ensurePlayer(guildId) {
    const st = getPlayer(guildId);
    if (st.player) return st.player;

    const player = createAudioPlayer();
    st.player = player;

    player.on(AudioPlayerStatus.Idle, function () {
        playNext(guildId).catch(function (e) {
            console.error('[music] next:', e.message);
        });
    });
    player.on('error', function (err) {
        console.error('[music] player error:', err.message);
        playNext(guildId).catch(function () {});
    });

    return player;
}

function connectVoice(guild, channel) {
    const st = getPlayer(guild.id);
    let connection = getVoiceConnection(guild.id);

    if (!connection || st.voiceChannelId !== channel.id) {
        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true
        });
        st.voiceChannelId = channel.id;
        st.connection = connection;
        connection.on('error', function (e) {
            console.error('[music] voice:', e.message);
        });
    }

    const player = ensurePlayer(guild.id);
    connection.subscribe(player);
    return connection;
}

async function playTrack(guildId, track) {
    const st = getPlayer(guildId);
    const player = ensurePlayer(guildId);
    st.current = track;
    st.paused = false;

    const url = track.uri || track.url;
    if (!url) throw new Error('URL invalida');

    const proc = createYtdlpStream(url);
    const resource = createAudioResource(proc.stdout, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
    });
    if (resource.volume) {
        resource.volume.setVolume((st.volume || 80) / 100);
    }

    player.play(resource);

    try {
        const ch = st.textChannelId
            ? await clientRef.channels.fetch(st.textChannelId).catch(function () { return null; })
            : null;
        if (ch) {
            const emb = new EmbedBuilder()
                .setColor(COLOR)
                .setTitle('Tocando')
                .setDescription('[**' + track.title + '**](' + (track.uri || track.url || '#') + ')')
                .addFields(
                    { name: 'Duracao', value: formatMs(track.length), inline: true },
                    { name: 'Pedido por', value: track.requester || '-', inline: true },
                    { name: 'Fila', value: String(st.queue.length), inline: true }
                );
            if (track.artwork) emb.setThumbnail(track.artwork);
            ch.send({ embeds: [emb] }).catch(function () {});
        }
    } catch (_) {}
}

async function playNext(guildId) {
    const st = getPlayer(guildId);
    if (!st.queue.length) {
        st.current = null;
        try {
            const ch = st.textChannelId
                ? await clientRef.channels.fetch(st.textChannelId).catch(function () { return null; })
                : null;
            if (ch) {
                ch.send({
                    embeds: [new EmbedBuilder().setColor(COLOR).setDescription('Fila terminou.')]
                }).catch(function () {});
            }
        } catch (_) {}
        return;
    }
    const next = st.queue.shift();
    await playTrack(guildId, next);
}

async function play(ctx, query) {
    const guild = ctx.guild;
    const member = ctx.member;
    const channel = ctx.channel;
    const user = ctx.user || ctx.author;
    if (!guild || !member) throw new Error('So em servidor');

    const voice = member.voice && member.voice.channel;
    if (!voice) throw new Error('Entre em um canal de voz primeiro.');

    const me = guild.members.me;
    if (me) {
        const perms = voice.permissionsFor(me);
        if (perms && !perms.has(PermissionsBitField.Flags.Connect))
            throw new Error('Sem permissao de Conectar.');
        if (perms && !perms.has(PermissionsBitField.Flags.Speak))
            throw new Error('Sem permissao de Falar.');
    }

    resolveBins();

    const results = await resolveQuery(query);
    const first = results[0];
    if (!first) throw new Error('Nada encontrado.');

    const track = Object.assign({}, first, { requester: String(user) });

    const st = getPlayer(guild.id);
    st.textChannelId = channel.id;
    st.voiceChannelId = voice.id;

    connectVoice(guild, voice);

    try {
        const conn = getVoiceConnection(guild.id);
        if (conn) {
            await entersState(conn, VoiceConnectionStatus.Ready, 20000);
        }
    } catch (e) {
        throw new Error('Nao consegui conectar na call a tempo (20s).');
    }

    const wasEmpty = !st.current;

    if (wasEmpty) {
        await playTrack(guild.id, track);
        return { started: true, track: track, added: 0 };
    }

    st.queue.push(track);
    return { started: false, track: track, added: 1 };
}

async function skip(guildId) {
    const st = getPlayer(guildId);
    if (!st.current) throw new Error('Nada tocando.');
    if (st.player) st.player.stop(true);
}

async function stop(guildId) {
    const st = getPlayer(guildId);
    st.queue = [];
    st.current = null;
    try {
        if (st.player) st.player.stop(true);
    } catch (_) {}
    const conn = getVoiceConnection(guildId);
    try {
        if (conn) conn.destroy();
    } catch (_) {}
    st.connection = null;
    st.player = null;
    players.delete(guildId);
}

async function pause(guildId, paused) {
    const st = getPlayer(guildId);
    if (!st.current || !st.player) throw new Error('Nada tocando.');
    st.paused = !!paused;
    if (paused) st.player.pause();
    else st.player.unpause();
}

async function setVolume(guildId, vol) {
    const st = getPlayer(guildId);
    st.volume = Math.max(0, Math.min(100, vol));
    return st.volume;
}

function queueInfo(guildId) {
    return getPlayer(guildId);
}

function status() {
    return {
        engine: 'discord.js-voice + yt-dlp',
        youtubeApi: !!String(process.env.YOUTUBE_API_KEY || '').trim(),
        guilds: players.size
    };
}

function setup(client) {
    clientRef = client;
    resolveBins();
    console.log(
        '[music] voice ativo · YouTube API=' +
            (status().youtubeApi ? 'sim' : 'nao (yt-dlp)') +
            ' · ffmpeg=' +
            (ffmpegPath || '?') +
            ' · yt-dlp=' +
            (ytdlpPath || '?')
    );

    client.on('voiceStateUpdate', function (oldS, newS) {
        try {
            if (!client.user) return;
            const guild = newS.guild || oldS.guild;
            if (!guild) return;
            const conn = getVoiceConnection(guild.id);
            if (!conn) return;
            const chanId = conn.joinConfig && conn.joinConfig.channelId;
            if (!chanId) return;
            const ch = guild.channels.cache.get(chanId);
            if (!ch || !ch.isVoiceBased()) return;
            const humans = ch.members.filter(function (m) { return !m.user.bot; });
            if (humans.size === 0) {
                stop(guild.id).catch(function () {});
            }
        } catch (_) {}
    });
}

module.exports = {
    setup: setup,
    play: play,
    skip: skip,
    stop: stop,
    pause: pause,
    setVolume: setVolume,
    queueInfo: queueInfo,
    status: status,
    formatMs: formatMs,
    COLOR: COLOR,
    COLOR_ERR: COLOR_ERR,
    COLOR_WARN: COLOR_WARN
};
