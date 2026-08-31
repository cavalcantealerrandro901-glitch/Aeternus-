const { EmbedBuilder } = require('discord.js');
const music = require('../utils/music');

module.exports = {
    name: 'stop',
    aliases: ['parar', 'sair'],
    description: 'Para a música e desconecta do canal',

    async execute(message, args, client) {
        const connection = client.voice.connections.get(message.guild.id);
        if (!connection) {
            return message.reply('❌ Não estou em um canal de voz.');
        }

        music.stopPlayback(connection);
        music.clearQueue(message.guild.id);
        connection.destroy();

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('⏹️ Parado')
            .setDescription('Música parada e desconectado do canal');

        return message.reply({ embeds: [embed] });
    }
};
