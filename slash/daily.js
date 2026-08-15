const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRandomPhrase } = require('../utils/phrases');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Resgata sua recompensa diária de almas'),
    async execute(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('daily_claim')
                .setLabel('🎁 Coletar Recompensa Diária')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            content: `💀 **Painel de Recompensa Diária**\n✨ *"${getRandomPhrase()}"*\n\nClique no botão abaixo para coletar suas almas diárias!`,
            components: [row]
        });
    }
};
