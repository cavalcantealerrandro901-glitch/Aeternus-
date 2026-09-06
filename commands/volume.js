const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'volume',
    aliases: ['vol', 'volumar'],
    description: 'Ajustar o volume (0–100)',
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ajustar o volume (0–100)')
        .addIntegerOption((o) =>
            o.setName('nivel').setDescription('0 a 100').setRequired(true).setMinValue(0).setMaxValue(100)
        ),

    async execute(message, args) {
        const n = parseInt(args[0], 10);
        if (Number.isNaN(n) || n < 0 || n > 100) {
            return message.reply('Uso: `O.volume <0-100>`');
        }
        try {
            const v = await music.setVolume(message.guild.id, n);
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(music.COLOR)
                        .setDescription(`Volume: **${v}%** _(aplica na próxima faixa)_`)
                ]
            });
        } catch (e) {
            await message.reply(`\u274c ${e.message}`);
        }
    },

    async executeSlash(i) {
        const n = i.options.getInteger('nivel', true);
        try {
            const v = await music.setVolume(i.guild.id, n);
            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(music.COLOR)
                        .setDescription(`Volume: **${v}%** _(aplica na próxima faixa)_`)
                ]
            });
        } catch (e) {
            await i.reply({ content: `\u274c ${e.message}`, flags: 64 });
        }
    }
};
