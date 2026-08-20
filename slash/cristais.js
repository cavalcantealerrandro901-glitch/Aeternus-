const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const cristais = require('../utils/cristais');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cristais')
        .setDescription('Mostra cristais de gelo 🧊')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const bal = cristais.get(target.id);

        const embed = new EmbedBuilder()
            .setColor(0x67e8f9)
            .setTitle(`${cristais.EMOJI} Cristais de gelo`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription(`Cofre de **${target.username}**\n\n${cristais.format(bal)}`);

        await interaction.reply({ embeds: [embed] });
    }
};
