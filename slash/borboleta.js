const { SlashCommandBuilder } = require('discord.js');
const gameSystem = require('../src/systems/gameSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('borboleta')
        .setDescription('Simulador de Causa e Efeito Temporal.'),
    async execute(interaction) {
        await gameSystem.startButterflyGame(interaction);
    }
};
