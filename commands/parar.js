const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'parar',
    aliases: ['stop'],
    description: 'Parar e limpar a fila',
    data: new SlashCommandBuilder().setName('parar').setDescription('Parar música'),

    async execute(message) {
        try {
            await music.stop(message.guild.id);
            await message.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('⏹️ Parado.')]
            });
        } catch (e) {
            await message.reply(`❌ ${e.message}`);
        }
    },

    async executeSlash(i) {
        try {
            await music.stop(i.guild.id);
            await i.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('⏹️ Parado.')]
            });
        } catch (e) {
            await i.reply({ content: `❌ ${e.message}`, ephemeral: true });
        }
    }
};
