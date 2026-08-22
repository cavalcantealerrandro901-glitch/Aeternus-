const { EmbedBuilder } = require('discord.js');
const music = require('../utils/musicPlayer');

module.exports = {
    name: 'pular',
    aliases: ['skip', 'next', 'passar'],
    description: 'Pula a música atual',
    async execute(message) {
        if (!message.guild) return;
        const data = music.getQueue(message.guild.id);
        if (!data.now && !data.queue.length) {
            return message.reply('Não há nada tocando.');
        }
        const title = data.now?.title || 'música';
        music.skip(message.guild.id);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x38bdf8)
                    .setDescription(`⏭️ Pulou **${title}**`)
            ]
        });
    }
};
