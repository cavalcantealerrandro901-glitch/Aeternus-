const { createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play = require('play-dl');

const players = new Map();
const queues = new Map();

async function getYouTubeStream(query) {
    try {
        // Buscar no YouTube
        const yt_video = await play.youtube(query, { limit: 1 });
        if (yt_video.length === 0) return null;
        
        const video = yt_video[0];
        const stream = await play.stream(video.url);
        
        return {
            title: video.title || query,
            url: video.url,
            duration: video.durationInSec,
            stream: stream.stream,
            audioFormat: stream.type
        };
    } catch (error) {
        console.error('[Music Utils] Erro ao buscar YouTube:', error);
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
    if (queue.length === 0) return;
    
    const song = queue.shift();
    const player = getOrCreatePlayer(connection);
    
    try {
        const resource = createAudioResource(song.stream, {
            inputType: song.audioFormat
        });
        
        player.play(resource);
        return song;
    } catch (error) {
        console.error('[Music Utils] Erro ao reproduzir:', error);
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
        playNext(connection, guildId);
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

function clearQueue(guildId) {
    queues.delete(guildId);
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
    clearQueue,
    players,
    queues
};
