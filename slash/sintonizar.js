const { SlashCommandBuilder } = require('discord.js');
const gameSystem = require('../src/systems/gameSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sintonizar')
        .setDescription('Sintonizador de Ondas Temporais em tempo real.'),
    async execute(interaction) {
        await gameSystem.startWaveGame(interaction);
    }
};
