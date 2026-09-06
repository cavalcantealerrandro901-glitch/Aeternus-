const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'pular',
    aliases: ['skip', 's', 'next'],
    description: 'Pular a música atual',
    data: new SlashCommandBuilder().setName('pular').setDescription('Pular a música atual'),

    async execute(message) {
        try {
            await music.skip(message.guild.id);
            await message.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('Próxima música.')]
            });
        } catch (e) {
            await message.reply(`\u274c ${e.message}`);
        }
    },

    async executeSlash(i) {
        try {
            await music.skip(i.guild.id);
            await i.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('Próxima música.')]
            });
        } catch (e) {
            await i.reply({ content: `\u274c ${e.message}`, flags: 64 });
        }
    }
};
