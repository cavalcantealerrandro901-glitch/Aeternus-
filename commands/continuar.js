const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'continuar',
    aliases: ['resume', 'unpause'],
    description: 'Continuar',
    data: new SlashCommandBuilder().setName('continuar').setDescription('Continuar música'),

    async execute(message) {
        try {
            await music.pause(message.guild.id, false);
            await message.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('▶️ Continuando.')]
            });
        } catch (e) {
            await message.reply(`❌ ${e.message}`);
        }
    },

    async executeSlash(i) {
        try {
            await music.pause(i.guild.id, false);
            await i.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('▶️ Continuando.')]
            });
        } catch (e) {
            await i.reply({ content: `❌ ${e.message}`, ephemeral: true });
        }
    }
};
