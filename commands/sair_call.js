const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'sair',
    aliases: ['leave', 'disconnect', 'dc'],
    description: 'Sair da call',
    data: new SlashCommandBuilder().setName('sair_call').setDescription('Sair do canal de voz'),

    async execute(message) {
        try {
            await music.stop(message.guild.id);
            await message.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('👋 Sai da call.')]
            });
        } catch (e) {
            await message.reply(`❌ ${e.message}`);
        }
    },

    async executeSlash(i) {
        try {
            await music.stop(i.guild.id);
            await i.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('👋 Sai da call.')]
            });
        } catch (e) {
            await i.reply({ content: `❌ ${e.message}`, ephemeral: true });
        }
    }
};
