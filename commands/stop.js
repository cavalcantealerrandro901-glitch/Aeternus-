const { EmbedBuilder } = require('discord.js');
const music = require('../utils/music');

module.exports = {
    name: 'stop',
    aliases: ['parar', 'sair', 'leave', 'dc'],
    description: 'Para a música e sai do canal',

    async execute(message) {
        music.stop(message.guild.id);
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf43f5e)
                    .setTitle('⏹️  Parado')
                    .setDescription('Fila limpa e desconectado do canal de voz.')
            ]
        });
    }
};
