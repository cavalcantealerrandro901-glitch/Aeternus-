/**
 * Música — @discordjs/voice + yt-dlp + FFmpeg (sem Lavalink)
 *
 * ENV:
 *   YOUTUBE_API_KEY  (opcional)
 *   FFMPEG_PATH=/usr/bin/ffmpeg
 *   YTDLP_PATH=/usr/local/bin/yt-dlp
 */
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus,
    getVoiceConnection,
    StreamType,
    NoSubscriberBehavior
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
let depsLogged = false;

function resolveBins() {
    const envFfmpeg = String(process.env.FFMPEG_PATH || '').trim();
    const envYtdlp = String(process.env.YTDLP_PATH || '').trim();

    if (envFfmpeg && fs.existsSync(envFfmpeg)) ffmpegPath = envFfmpeg;
    else {
        try {
            ffmpegPath = require('ffmpeg-static');
        } catch {
            ffmpegPath = 'ffmpeg';
        }
    }

    if (ffmpegPath) process.env.FFMPEG_PATH = String(ffmpegPath);

    if (envYtdlp && fs.existsSync(envYtdlp)) {
        ytdlpPath = envYtdlp;
        return;
    }
    const systemYtdlp = ['/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp'].find((p) => fs.existsSync(p));
    if (systemYtdlp) {
        ytdlpPath = systemYtdlp;
        return;
    }
    ytdlpPath = 'yt-dlp';
}

function formatMs(ms) {
    if (!ms || ms < 0) return '\u2014';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const ss = String(s % 60).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
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
            connection: null,
            procs: []
        });
    }
    return players.get(guildId);
}

function killProcs(st) {
    for (const p of st.procs || []) {
        try {
            p.kill('SIGKILL');
        } catch (_) {}
    }
    st.procs = [];
}

async function searchYoutubeApi(query, max = 5) {
    const key = String(process.env.YOUTUBE_API_KEY || '').trim();
    if (!key) return null;
    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: { part: 'snippet', type: 'video', maxResults: max, q: query, key },
        timeout: 12000
    });
    return (data.items || [])
        .map((it) => {
            const id = it.id?.videoId;
            if (!id) return null;
            const sn = it.snippet || {};
            const thumbs = sn.thumbnails || {};
            return {
                title: sn.title || 'YouTube',
                uri: `https://www.youtube.com/watch?v=${id}`,
                url: `https://www.youtube.com/watch?v=${id}`,
                length: 0,
                artwork: thumbs.high?.url || thumbs.default?.url || null,
                author: sn.channelTitle || '',
                id
            };
        })
        .filter(Boolean);
}

async function searchYtdlp(query, max = 5) {
    const input = /^https?:\/\//i.test(query) ? query : `ytsearch${max}:${query}`;
    return new Promise((resolve, reject) => {
        const args = [
            input,
            '--dump-single-json',
            '--no-warnings',
            '--skip-download',
            '--flat-playlist',
            '--no-check-certificates',
            '--no-playlist'
        ];
        const proc = spawn(ytdlpPath || 'yt-dlp', args, { windowsHide: true });
        let out = '';
        let err = '';
        proc.stdout.on('data', (d) => (out += d));
        proc.stderr.on('data', (d) => (err += d));
        proc.on('error', (e) => reject(e));
        proc.on('close', (code) => {
            if (!out) return reject(new Error((err || 'yt-dlp falhou').slice(0, 300)));
            try {
                const data = JSON.parse(out);
                const entries = data.entries || (data.id ? [data] : []);
                resolve(
                    entries.slice(0, max).map((e) => ({
                        title: e.title || e.fulltitle || 'YouTube',
                        uri:
                            e.webpage_url ||
                            e.url ||
                            (e.id ? `https://www.youtube.com/watch?v=${e.id}` : ''),
                        url:
                            e.webpage_url ||
                            e.url ||
                            (e.id ? `https://www.youtube.com/watch?v=${e.id}` : ''),
                        length: Math.floor((e.duration || 0) * 1000),
                        artwork: e.thumbnail || null,
                        author: e.uploader || e.channel || '',
                        id: e.id
                    }))
                );
            } catch (e) {
                reject(new Error('Resposta yt-dlp inválida'));
            }
        });
    });
}

async function resolveQuery(query) {
    const q = String(query || '').trim();
    if (!q) throw new Error('Busca vazia');

    if (/^https?:\/\//i.test(q)) {
        try {
            const list = await searchYtdlp(q, 1);
            if (list[0]) return list;
        } catch (_) {}
        return [{ title: q, uri: q, url: q, length: 0, artwork: null, author: '', id: null }];
    }

    try {
        const api = await searchYoutubeApi(q, 5);
        if (api?.length) {
            console.log(`[music] YouTube API: ${api.length}`);
            return api;
        }
    } catch (e) {
        console.warn('[music] YouTube API:', e.response?.data?.error?.message || e.message);
    }

    console.log('[music] busca yt-dlp…');
    const list = await searchYtdlp(q, 5);
    if (!list.length) throw new Error('Nada encontrado no YouTube.');
    return list;
}

function createAudioPipeline(url) {
    const ytdlp = ytdlpPath || 'yt-dlp';
    const ffmpeg = ffmpegPath || process.env.FFMPEG_PATH || 'ffmpeg';

    const dl = spawn(
        ytdlp,
        [
            url,
            '-f',
            'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
            '-o',
            '-',
            '--no-playlist',
            '--no-warnings',
            '--quiet',
            '--no-check-certificates',
            '--force-ipv4'
        ],
        { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    const ff = spawn(
        ffmpeg,
        [
            '-hide_banner',
            '-loglevel',
            'error',
            '-i',
            'pipe:0',
            '-analyzeduration',
            '0',
            '-f',
            's16le',
            '-ar',
            '48000',
            '-ac',
            '2',
            'pipe:1'
        ],
        { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    dl.stdout.pipe(ff.stdin);

    let dlErr = '';
    let ffErr = '';
    dl.stderr.on('data', (d) => {
        dlErr += d.toString();
        if (dlErr.length > 500) dlErr = dlErr.slice(-500);
    });
    ff.stderr.on('data', (d) => {
        ffErr += d.toString();
        if (ffErr.length > 500) ffErr = ffErr.slice(-500);
    });

    dl.on('close', (code) => {
        if (code && code !== 0) {
            console.warn(`[music] yt-dlp exit ${code}: ${dlErr.slice(0, 200)}`);
            try {
                ff.stdin.end();
            } catch (_) {}
        }
    });
    ff.on('close', (code) => {
        if (code && code !== 0) console.warn(`[music] ffmpeg exit ${code}: ${ffErr.slice(0, 200)}`);
    });

    return { dl, ff, stream: ff.stdout, getError: () => dlErr || ffErr };
}

function ensurePlayer(guildId) {
    const st = getPlayer(guildId);
    if (st.player) return st.player;

    const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Play }
    });
    st.player = player;

    player.on(AudioPlayerStatus.Idle, () => {
        killProcs(st);
        playNext(guildId).catch((e) => console.error('[music] next:', e.message));
    });
    player.on(AudioPlayerStatus.Playing, () => {
        console.log(`[music] playing guild=${guildId}`);
    });
    player.on('error', (err) => {
        console.error('[music] player error:', err.message);
        killProcs(st);
        playNext(guildId).catch(() => {});
    });

    return player;
}

async function waitUntilReady(connection, ms = 30000) {
    if (!connection) throw new Error('Sem conexão de voz');

    if (connection.state.status === VoiceConnectionStatus.Ready) return connection;

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, ms);
        return connection;
    } catch (e) {
        const now = connection.state?.status;
        if (now === VoiceConnectionStatus.Ready) return connection;

        console.error(`[music] wait Ready falhou status=${now}:`, e.message);

        if (
            now === VoiceConnectionStatus.Connecting ||
            now === VoiceConnectionStatus.Signalling
        ) {
            try {
                await entersState(connection, VoiceConnectionStatus.Ready, 15000);
                return connection;
            } catch (_) {}
        }

        throw new Error(
            'Não consegui estabilizar a conexão de voz.\n' +
                'Verifique se o bot tem permissão de **Conectar** e **Falar**, e se o host libera **UDP** (voz do Discord).'
        );
    }
}

function connectVoice(guild, channel) {
    const st = getPlayer(guild.id);
    let connection = getVoiceConnection(guild.id);

    const needNew =
        !connection ||
        connection.state.status === VoiceConnectionStatus.Destroyed ||
        connection.state.status === VoiceConnectionStatus.Disconnected ||
        st.voiceChannelId !== channel.id;

    if (needNew) {
        try {
            if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
                connection.destroy();
            }
        } catch (_) {}

        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });
        st.voiceChannelId = channel.id;
        st.connection = connection;

        connection.on('stateChange', (oldS, newS) => {
            if (oldS.status !== newS.status) {
                console.log(`[music] voice ${guild.id}: ${oldS.status} → ${newS.status}`);
            }
        });
        connection.on('error', (e) => console.error('[music] voice error:', e.message));
    }

    connection.subscribe(ensurePlayer(guild.id));
    return connection;
}

async function playTrack(guildId, track, opts = {}) {
    const st = getPlayer(guildId);
    const player = ensurePlayer(guildId);
    st.current = track;
    st.paused = false;

    const url = track.uri || track.url;
    if (!url) throw new Error('URL inválida');

    killProcs(st);

    const pipe = createAudioPipeline(url);
    st.procs = [pipe.dl, pipe.ff];

    const resource = createAudioResource(pipe.stream, {
        inputType: StreamType.Raw,
        inlineVolume: true
    });
    if (resource.volume) resource.volume.setVolume(Math.max(0.01, (st.volume || 80) / 100));

    let started = false;
    const failTimer = setTimeout(() => {
        if (!started && st.current === track) {
            console.warn('[music] stream não iniciou em 12s', pipe.getError()?.slice(0, 150));
        }
    }, 12000);

    player.once(AudioPlayerStatus.Playing, () => {
        started = true;
        clearTimeout(failTimer);
    });

    player.play(resource);

    if (opts.announce === false) return;

    try {
        const ch = st.textChannelId
            ? await clientRef.channels.fetch(st.textChannelId).catch(() => null)
            : null;
        if (ch) {
            const emb = new EmbedBuilder()
                .setColor(COLOR)
                .setTitle('Tocando')
                .setDescription(`[**${track.title}**](${track.uri || track.url || '#'})`)
                .addFields(
                    { name: 'Duração', value: formatMs(track.length), inline: true },
                    { name: 'Pedido por', value: track.requester || '\u2014', inline: true },
                    { name: 'Fila', value: `${st.queue.length}`, inline: true }
                );
            if (track.artwork) emb.setThumbnail(track.artwork);
            ch.send({ embeds: [emb] }).catch(() => {});
        }
    } catch (_) {}
}

async function playNext(guildId) {
    const st = getPlayer(guildId);
    if (!st.queue.length) {
        st.current = null;
        try {
            const ch = st.textChannelId
                ? await clientRef.channels.fetch(st.textChannelId).catch(() => null)
                : null;
            ch?.send({
                embeds: [new EmbedBuilder().setColor(COLOR).setDescription('Fila terminou.')]
            }).catch(() => {});
        } catch (_) {}
        return;
    }
    await playTrack(guildId, st.queue.shift());
}

async function play(ctx, query) {
    const guild = ctx.guild;
    const member = ctx.member;
    const channel = ctx.channel;
    const user = ctx.user || ctx.author;
    if (!guild || !member) throw new Error('Só em servidor');

    const voice = member.voice?.channel;
    if (!voice) throw new Error('Entre em um canal de voz primeiro.');

    const me = guild.members.me;
    if (me) {
        const perms = voice.permissionsFor(me);
        if (perms && !perms.has(PermissionsBitField.Flags.Connect))
            throw new Error('Sem permissão de **Conectar**.');
        if (perms && !perms.has(PermissionsBitField.Flags.Speak))
            throw new Error('Sem permissão de **Falar**.');
    }

    resolveBins();

    const results = await resolveQuery(query);
    const first = results[0];
    if (!first) throw new Error('Nada encontrado.');

    const track = { ...first, requester: `${user}` };
    const st = getPlayer(guild.id);
    st.textChannelId = channel.id;
    st.voiceChannelId = voice.id;

    const connection = connectVoice(guild, voice);
    await waitUntilReady(connection, 30000);
    connection.subscribe(ensurePlayer(guild.id));

    if (!st.current) {
        await playTrack(guild.id, track, { announce: false });
        return { started: true, track, added: 0 };
    }

    st.queue.push(track);
    return { started: false, track, added: 1 };
}

async function skip(guildId) {
    const st = getPlayer(guildId);
    if (!st.current) throw new Error('Nada tocando.');
    st.player?.stop(true);
}

async function stop(guildId) {
    const st = getPlayer(guildId);
    st.queue = [];
    st.current = null;
    killProcs(st);
    try {
        st.player?.stop(true);
    } catch (_) {}
    const conn = getVoiceConnection(guildId);
    try {
        conn?.destroy();
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
        engine: 'discord.js-voice + yt-dlp + ffmpeg',
        youtubeApi: !!String(process.env.YOUTUBE_API_KEY || '').trim(),
        ffmpeg: ffmpegPath,
        ytdlp: ytdlpPath,
        guilds: players.size
    };
}

async function setup(client) {
    clientRef = client;
    resolveBins();

    try {
        const sodium = require('libsodium-wrappers');
        await sodium.ready;
        console.log('[music] libsodium OK');
    } catch (e) {
        console.warn('[music] libsodium:', e.message);
    }

    if (!depsLogged) {
        depsLogged = true;
        try {
            const { generateDependencyReport } = require('@discordjs/voice');
            console.log(generateDependencyReport());
        } catch (_) {}
    }

    console.log(
        `[music] voice ativo · API=${status().youtubeApi ? 'sim' : 'não'} · ffmpeg=${ffmpegPath} · yt-dlp=${ytdlpPath}`
    );

    client.on('voiceStateUpdate', (oldS, newS) => {
        try {
            if (!client.user) return;
            const guild = newS.guild || oldS.guild;
            if (!guild) return;
            const conn = getVoiceConnection(guild.id);
            if (!conn) return;
            const chanId = conn.joinConfig?.channelId;
            if (!chanId) return;
            const ch = guild.channels.cache.get(chanId);
            if (!ch?.isVoiceBased?.()) return;

            const humans = ch.members.filter((m) => !m.user.bot);
            if (humans.size === 0) {
                setTimeout(() => {
                    try {
                        const c = getVoiceConnection(guild.id);
                        if (!c) return;
                        const id = c.joinConfig?.channelId;
                        const channel = guild.channels.cache.get(id);
                        if (!channel?.isVoiceBased?.()) return;
                        const still = channel.members.filter((m) => !m.user.bot);
                        if (still.size === 0) stop(guild.id).catch(() => {});
                    } catch (_) {}
                }, 5000);
            }
        } catch (_) {}
    });
}

module.exports = {
    setup,
    play,
    skip,
    stop,
    pause,
    setVolume,
    queueInfo,
    status,
    formatMs,
    COLOR,
    COLOR_ERR,
    COLOR_WARN
};
