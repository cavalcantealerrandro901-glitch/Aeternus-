const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'volume',
    aliases: ['vol'],
    description: 'Volume',
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Volume 0-100')
        .addIntegerOption((o) =>
            o.setName('nivel').setDescription('0-100').setRequired(true).setMinValue(0).setMaxValue(100)
        ),

    async execute(message, args) {
        const n = parseInt(args[0], 10);
        if (Number.isNaN(n)) return message.reply('Uso: `O.volume <0-100>`');
        try {
            const v = await music.setVolume(message.guild.id, n);
            await message.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription(`🔊 **${v}%**`)]
            });
        } catch (e) {
            await message.reply(`❌ ${e.message}`);
        }
    },

    async executeSlash(i) {
        try {
            const v = await music.setVolume(i.guild.id, i.options.getInteger('nivel', true));
            await i.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription(`🔊 **${v}%**`)]
            });
        } catch (e) {
            await i.reply({ content: `❌ ${e.message}`, ephemeral: true });
        }
    }
};
