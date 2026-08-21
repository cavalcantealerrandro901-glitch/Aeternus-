const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const play = require('play-dl');
const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const queues = new Map();

async function getAudioStream(url) {
    // 1. Obtém o link direto da faixa via yt-dlp
    const { stdout } = await execPromise(`yt-dlp -g -f "ba/ba*" "${url}"`);
    const directUrl = stdout.trim().split('\n')[0];

    if (!directUrl || !directUrl.startsWith('http')) {
        throw new Error('Não foi possível obter a URL do fluxo de áudio.');
    }

    // 2. Converte o áudio em tempo real para PCM 48kHz (StreamType.Raw) via FFmpeg nativo
    const ffmpegProcess = spawn('ffmpeg', [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', directUrl,
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    return ffmpegProcess.stdout;
}

async function playMusic(guildId, song) {
    const serverQueue = queues.get(guildId);
    
    if (!song || typeof song.url !== 'string' || !song.url.startsWith('http')) {
        if (serverQueue) {
            serverQueue.textChannel.send('❌ URL inválida. Pulando...');
            serverQueue.songs.shift();
            if (serverQueue.songs.length > 0) {
                return playMusic(guildId, serverQueue.songs[0]);
            }
            serverQueue.connection.destroy();
            queues.delete(guildId);
        }
        return;
    }

    try {
        const stream = await getAudioStream(song.url);
        const resource = createAudioResource(stream, {
            inputType: StreamType.Raw
        });

        serverQueue.player.play(resource);
        serverQueue.textChannel.send(`🎶 Tocando agora: **${song.title}** (\`${song.duration}\`)`);
    } catch (error) {
        console.error('Erro ao processar áudio:', error.message || error);
        serverQueue.textChannel.send('❌ Não foi possível reproduzir esta música.');
        serverQueue.songs.shift();
        if (serverQueue.songs.length > 0) {
            playMusic(guildId, serverQueue.songs[0]);
        } else {
            serverQueue.connection.destroy();
            queues.delete(guildId);
        }
    }
}

async function addSong(ctx, query) {
    const isInteraction = !ctx.author;
    const user = isInteraction ? ctx.user : ctx.author;
    const member = ctx.member;
    const channel = ctx.channel;

    if (isInteraction && !ctx.deferred && !ctx.replied) {
        await ctx.deferReply().catch(() => {});
    }

    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) {
        const text = '❌ Você precisa estar em um canal de voz!';
        return isInteraction ? ctx.editReply(text) : ctx.reply(text);
    }

    let songInfo = null;

    try {
        const searchResults = await play.search(query, { limit: 1, source: { youtube: 'video' } });
        if (searchResults && searchResults.length > 0 && searchResults[0].url) {
            songInfo = {
                title: searchResults[0].title,
                url: searchResults[0].url,
                duration: searchResults[0].durationRaw
            };
        }
    } catch (e) {
        console.error('Erro na pesquisa do play-dl:', e);
    }

    if (!songInfo || !songInfo.url) {
        const notFound = '🔍 Nenhuma música encontrada ou link inválido.';
        return isInteraction ? ctx.editReply(notFound) : ctx.reply(notFound);
    }

    const song = {
        ...songInfo,
        requestedBy: user.username
    };

    let serverQueue = queues.get(ctx.guild.id);

    if (!serverQueue) {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: ctx.guild.id,
            adapterCreator: ctx.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        connection.subscribe(player);

        player.on('error', err => {
            console.error('Erro de reprodução no Player:', err.message);
        });

        serverQueue = {
            textChannel: channel,
            voiceChannel: voiceChannel,
            connection: connection,
            player: player,
            songs: []
        };

        queues.set(ctx.guild.id, serverQueue);
        serverQueue.songs.push(song);

        player.on(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            if (serverQueue.songs.length > 0) {
                playMusic(ctx.guild.id, serverQueue.songs[0]);
            } else {
                serverQueue.connection.destroy();
                queues.delete(ctx.guild.id);
            }
        });

        playMusic(ctx.guild.id, serverQueue.songs[0]);

        const startMsg = `✅ Conectado em **${voiceChannel.name}**! Adicionado à fila: **${song.title}**`;
        return isInteraction ? ctx.editReply(startMsg) : ctx.reply(startMsg);
    } else {
        serverQueue.songs.push(song);
        const addMsg = `➕ **${song.title}** adicionado à fila por **${song.requestedBy}**!`;
        return isInteraction ? ctx.editReply(addMsg) : ctx.reply(addMsg);
    }
}

function stopMusic(guildId) {
    const serverQueue = queues.get(guildId);
    if (!serverQueue) return false;
    serverQueue.songs = [];
    serverQueue.player.stop();
    serverQueue.connection.destroy();
    queues.delete(guildId);
    return true;
}

function skipMusic(guildId) {
    const serverQueue = queues.get(guildId);
    if (!serverQueue || serverQueue.songs.length === 0) return false;
    serverQueue.player.stop();
    return true;
}

module.exports = { addSong, stopMusic, skipMusic };
