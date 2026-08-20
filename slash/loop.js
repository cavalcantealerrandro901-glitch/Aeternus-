const { SlashCommandBuilder } = require('discord.js');
const gameSystem = require('../src/systems/gameSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Jogo do Paradoxo Temporal com Fantasma do Passado.'),
    async execute(interaction) {
        await gameSystem.startLoopGame(interaction);
    }
};
