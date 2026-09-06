const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'parar',
    aliases: ['stop'],
    description: 'Parar a música e limpar a fila',
    data: new SlashCommandBuilder().setName('parar').setDescription('Parar a música e limpar a fila'),

    async execute(message) {
        try {
            await music.stop(message.guild.id);
            await message.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('Parado. Fila limpa.')]
            });
        } catch (e) {
            await message.reply(`\u274c ${e.message}`);
        }
    },

    async executeSlash(i) {
        try {
            await music.stop(i.guild.id);
            await i.reply({
                embeds: [new EmbedBuilder().setColor(music.COLOR).setDescription('Parado. Fila limpa.')]
            });
        } catch (e) {
            await i.reply({ content: `\u274c ${e.message}`, flags: 64 });
        }
    }
};
