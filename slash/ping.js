const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responde com a latência e status do bot'),
    async execute(interaction) {
        await interaction.reply('🏓 Pong! O bot está online e operando.');
    }
};
