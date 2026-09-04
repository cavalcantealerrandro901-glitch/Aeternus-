const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'pular',
    aliases: ['skip', 's'],
    description: 'Pular música',
    data: new SlashCommandBuilder().setName('pular').setDescription('Pular música'),

    async execute(message) {
        try {
            await music.skip(message.guild.id);
            await message.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('⏭️ Pulou.')]
            });
        } catch (e) {
            await message.reply(`❌ ${e.message}`);
        }
    },

    async executeSlash(i) {
        try {
            await music.skip(i.guild.id);
            await i.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('⏭️ Pulou.')]
            });
        } catch (e) {
            await i.reply({ content: `❌ ${e.message}`, ephemeral: true });
        }
    }
};
