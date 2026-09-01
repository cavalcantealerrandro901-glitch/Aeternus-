const { EmbedBuilder } = require('discord.js');
const music = require('../utils/music');

module.exports = {
    name: 'skip',
    aliases: ['próximo', 'proximo', 'pular', 's'],
    description: 'Pula a música atual',

    async execute(message) {
        if (!message.member?.voice?.channel) {
            return message.reply('❌ Entre em um canal de voz.');
        }
        const view = music.getQueueView(message.guild.id);
        if (!view.current && !view.queue.length) {
            return message.reply('❌ Nada tocando.');
        }
        const prev = view.current?.title;
        music.skip(message.guild.id);
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('⏭️  Pulado')
                    .setDescription(prev ? `**${prev}**` : 'Próxima faixa…')
            ]
        });
    }
};
