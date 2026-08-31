const { createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play = require('play-dl');

const players = new Map();
const queues = new Map();
const currentlyPlaying = new Map();

async function getYouTubeStream(query) {
    try {
        // Validar se é URL do YouTube
        let videoUrl = query;
        let videoInfo = null;
        
        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
            // Buscar no YouTube
            const results = await play.search(query, { limit: 1 });
            if (!results || results.length === 0) return null;
            videoUrl = results[0].url;
            videoInfo = results[0];
        } else {
            // Se for URL, tentar pegar informações
            try {
                videoInfo = await play.video_info(videoUrl);
                videoInfo = videoInfo.video_details;
            } catch (e) {
                // Se falhar, deixa sem info detalhada
                videoInfo = { title: query, length_seconds: 0 };
            }
        }

        // Obter stream
        const stream = await play.stream(videoUrl);
        
        if (!stream) {
            console.error('[Music Utils] Não foi possível obter stream');
            return null;
        }

        const title = videoInfo?.title || videoInfo?.video_title || query;
        const duration = videoInfo?.length_seconds || videoInfo?.duration || 0;
        
        return {
            title: title,
            url: videoUrl,
            duration: parseInt(duration),
            stream: stream.stream,
            audioFormat: stream.type
        };
    } catch (error) {
        console.error('[Music Utils] Erro ao buscar YouTube:', error.message);
        return null;
    }
}

function getOrCreatePlayer(connection) {
    const connId = connection.joinConfig.channelId;
    if (players.has(connId)) {
        return players.get(connId);
    }
    
    const player = createAudioPlayer();
    players.set(connId, player);
    connection.subscribe(player);
    
    // Evento quando música termina
    player.on(AudioPlayerStatus.Idle, async () => {
        // Procurar qual guild tem música para tocar
        for (const [guildId, queue] of queues.entries()) {
            if (queue.length > 0) {
                await playNext(connection, guildId);
                break;
            }
        }
    });
    
    player.on('error', error => {
        console.error('[Music Utils] Erro no player:', error);
    });
    
    return player;
}

function getOrCreateQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, []);
    }
    return queues.get(guildId);
}

async function playNext(connection, guildId) {
    const queue = getOrCreateQueue(guildId);
    if (queue.length === 0) return null;
    
    const song = queue.shift();
    const player = getOrCreatePlayer(connection);
    
    try {
        const resource = createAudioResource(song.stream, {
            inputType: song.audioFormat
        });
        
        currentlyPlaying.set(guildId, song);
        player.play(resource);
        return song;
    } catch (error) {
        console.error('[Music Utils] Erro ao reproduzir:', error.message);
        return null;
    }
}

function addToQueue(guildId, song) {
    const queue = getOrCreateQueue(guildId);
    queue.push(song);
    return queue.length;
}

function skipSong(connection, guildId) {
    const player = players.get(connection.joinConfig.channelId);
    if (player) {
        player.stop();
        return true;
    }
    return false;
}

function stopPlayback(connection) {
    const player = players.get(connection.joinConfig.channelId);
    if (player) {
        player.stop();
        return true;
    }
    return false;
}

function getQueue(guildId) {
    return getOrCreateQueue(guildId) || [];
}

function getCurrentlyPlaying(guildId) {
    return currentlyPlaying.get(guildId) || null;
}

function clearQueue(guildId) {
    queues.delete(guildId);
    currentlyPlaying.delete(guildId);
}

module.exports = {
    getYouTubeStream,
    getOrCreatePlayer,
    getOrCreateQueue,
    playNext,
    addToQueue,
    skipSong,
    stopPlayback,
    getQueue,
    getCurrentlyPlaying,
    clearQueue,
    players,
    queues,
    currentlyPlaying
};
