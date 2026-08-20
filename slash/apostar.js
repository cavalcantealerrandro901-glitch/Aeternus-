const { SlashCommandBuilder } = require('discord.js');
const gameSystem = require('../src/systems/gameSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apostar')
        .setDescription('Aposte cristais virtuais do bot em linhas do tempo paralelas.')
        .addIntegerOption(opt => 
            opt.setName('cristais')
               .setDescription('Quantidade de cristais virtuais para apostar')
               .setRequired(true)
        ),
    async execute(interaction) {
        const amount = interaction.options.getInteger('cristais');
        await gameSystem.startQuantumInvest(interaction, amount);
    }
};
