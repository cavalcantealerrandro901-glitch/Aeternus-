const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'pausar',
    aliases: ['pause'],
    description: 'Pausar a música',
    data: new SlashCommandBuilder().setName('pausar').setDescription('Pausar a música'),

    async execute(message) {
        try {
            await music.pause(message.guild.id, true);
            await message.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('Pausado.')]
            });
        } catch (e) {
            await message.reply(`\u274c ${e.message}`);
        }
    },

    async executeSlash(i) {
        try {
            await music.pause(i.guild.id, true);
            await i.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('Pausado.')]
            });
        } catch (e) {
            await i.reply({ content: `\u274c ${e.message}`, flags: 64 });
        }
    }
};
