const { EmbedBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const music = require('../utils/music');

module.exports = {
    name: 'play',
    aliases: ['p', 'tocar'],
    description: 'Toca uma música do YouTube',

    async execute(message, args, client) {
        // Verificar se o usuário está em um canal de voz
        if (!message.member.voice.channel) {
            return message.reply('❌ Você precisa estar em um canal de voz para tocar música!');
        }

        if (!args[0]) {
            return message.reply('❌ Use: `O.play <nome da música>` ou `O.play <link do YouTube>`');
        }

        const query = args.join(' ');
        const voiceChannel = message.member.voice.channel;

        try {
            // Mostrar mensagem de busca
            const searching = await message.reply('🔍 Buscando música...');

            // Buscar a música
            const songData = await music.getYouTubeStream(query);
            if (!songData) {
                return searching.edit('❌ Nenhuma música encontrada. Tente novamente!');
            }

            // Conectar ao canal de voz
            let connection = client.voice.connections.get(message.guild.id);
            if (!connection) {
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator
                });
            }

            // Adicionar à fila
            const position = music.addToQueue(message.guild.id, songData);

            // Se é a primeira música, tocar imediatamente
            if (position === 1) {
                await music.playNext(connection, message.guild.id);
            }

            // Embed de confirmação
            const embed = new EmbedBuilder()
                .setColor(0x1db954) // Cor do Spotify
                .setTitle('🎵 Adicionado à fila')
                .setDescription(`[${songData.title}](${songData.url})`)
                .addFields(
                    { name: 'Duração', value: `${Math.floor(songData.duration / 60)}:${(songData.duration % 60).toString().padStart(2, '0')}`, inline: true },
                    { name: 'Posição na fila', value: `#${position}`, inline: true }
                )
                .setFooter({ text: 'Use O.queue para ver a fila' })
                .setTimestamp();

            return searching.edit({ embeds: [embed] });
        } catch (error) {
            console.error('[Play Command]', error);
            return message.reply('❌ Erro ao tocar a música. Tente novamente!');
        }
    }
};
