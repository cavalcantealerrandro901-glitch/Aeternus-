const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'continuar',
    aliases: ['resume', 'unpause'],
    description: 'Continuar a música pausada',
    data: new SlashCommandBuilder().setName('continuar').setDescription('Continuar a música'),

    async execute(message) {
        try {
            await music.pause(message.guild.id, false);
            await message.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('Continuando.')]
            });
        } catch (e) {
            await message.reply(`\u274c ${e.message}`);
        }
    },

    async executeSlash(i) {
        try {
            await music.pause(i.guild.id, false);
            await i.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('Continuando.')]
            });
        } catch (e) {
            await i.reply({ content: `\u274c ${e.message}`, flags: 64 });
        }
    }
};
