const { SlashCommandBuilder } = require('discord.js');
const { addSong, stopMusic, skipMusic } = require('../systems/musicSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Toca uma música no canal de voz.')
        .addStringOption(opt =>
            opt.setName('busca')
               .setDescription('Nome ou URL da música')
               .setRequired(true)
        ),
    async execute(interaction) {
        const query = interaction.options.getString('busca');
        await addSong(interaction, query);
    }
};
