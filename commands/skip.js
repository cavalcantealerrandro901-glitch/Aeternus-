const { EmbedBuilder } = require('discord.js');
const music = require('../utils/music');

module.exports = {
    name: 'skip',
    aliases: ['próximo', 'pular'],
    description: 'Pula a música atual',

    async execute(message, args, client) {
        const connection = client.voice.connections.get(message.guild.id);
        if (!connection) {
            return message.reply('❌ Não há nada tocando no momento.');
        }

        const result = music.skipSong(connection, message.guild.id);
        if (result) {
            const queue = music.getQueue(message.guild.id);
            let nextSong = queue[0];

            const embed = new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle('⏭️ Música pulada')
                .setDescription(nextSong ? `Tocando: [${nextSong.title}](${nextSong.url})` : 'Fila vazia');

            return message.reply({ embeds: [embed] });
        }

        return message.reply('❌ Erro ao pular a música.');
    }
};
