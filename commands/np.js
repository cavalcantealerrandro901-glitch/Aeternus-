const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const music = require('../utils/musicPlayer');

module.exports = {
    name: 'np',
    aliases: ['nowplaying', 'tocando', 'agora'],
    description: 'Mostra o que está tocando',
    async execute(message) {
        if (!message.guild) return;
        const data = music.getQueue(message.guild.id);
        if (!data.now) {
            return message.reply('Nada tocando. Use `O.play <música>`.');
        }

        const embed = music.nowEmbed(message.guild.id);
        const controls = music.controlRow(message.guild.id);

        const extra = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mctl_stop_${message.guild.id}`)
                .setLabel('Parar')
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger)
        );

        await message.reply({
            embeds: [embed],
            components: [controls, extra]
        });
    }
};
