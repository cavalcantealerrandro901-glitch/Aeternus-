const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

const queues = new Map();

async function playMusic(guildId, song) {
    const serverQueue = queues.get(guildId);
    if (!song) {
        if (serverQueue) {
            serverQueue.connection.destroy();
            queues.delete(guildId);
        }
        return;
    }

    try {
        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        
        serverQueue.player.play(resource);
        serverQueue.textChannel.send(`🎶 Tocando agora: **${song.title}** (\`${song.duration}\`)`);
    } catch (error) {
        console.error('Erro no stream de áudio:', error);
        serverQueue.textChannel.send('❌ Ocorreu um erro ao tentar reproduzir esta música.');
        serverQueue.songs.shift();
        playMusic(guildId, serverQueue.songs[0]);
    }
}

async function addSong(messageOrInteraction, query) {
    const isInteraction = !messageOrInteraction.author;
    const user = isInteraction ? messageOrInteraction.user : messageOrInteraction.author;
    const member = messageOrInteraction.member;
    const channel = messageOrInteraction.channel;

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
        const text = '❌ Você precisa estar em um canal de voz para tocar música!';
        return isInteraction ? messageOrInteraction.reply({ content: text, flags: 64 }) : messageOrInteraction.reply(text);
    }

    if (isInteraction) await messageOrInteraction.deferReply();

    let searchResult;
    try {
        searchResult = await play.search(query, { limit: 1 });
    } catch (e) {
        const errText = '❌ Erro ao pesquisar a música.';
        return isInteraction ? messageOrInteraction.editReply(errText) : messageOrInteraction.reply(errText);
    }

    if (!searchResult || searchResult.length === 0) {
        const notFound = '🔍 Nenhuma música encontrada com esse nome/link.';
        return isInteraction ? messageOrInteraction.editReply(notFound) : messageOrInteraction.reply(notFound);
    }

    const song = {
        title: searchResult[0].title,
        url: searchResult[0].url,
        duration: searchResult[0].durationRaw,
        requestedBy: user.username
    };

    let serverQueue = queues.get(messageOrInteraction.guild.id);

    if (!serverQueue) {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: messageOrInteraction.guild.id,
            adapterCreator: messageOrInteraction.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        connection.subscribe(player);

        serverQueue = {
            textChannel: channel,
            voiceChannel: voiceChannel,
            connection: connection,
            player: player,
            songs: []
        };

        queues.set(messageOrInteraction.guild.id, serverQueue);
        serverQueue.songs.push(song);

        player.on(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            playMusic(messageOrInteraction.guild.id, serverQueue.songs[0]);
        });

        playMusic(messageOrInteraction.guild.id, serverQueue.songs[0]);

        const startMsg = `✅ Conectado em **${voiceChannel.name}**! Adicionado à fila: **${song.title}**`;
        return isInteraction ? messageOrInteraction.editReply(startMsg) : messageOrInteraction.reply(startMsg);
    } else {
        serverQueue.songs.push(song);
        const addMsg = `➕ **${song.title}** foi adicionado à fila por **${song.requestedBy}**!`;
        return isInteraction ? messageOrInteraction.editReply(addMsg) : messageOrInteraction.reply(addMsg);
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
