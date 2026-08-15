const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getRandomPhrase } = require('../utils/phrases');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Resgata sua recompensa diária de almas'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('💀 Painel de Recompensa Diária')
            .setDescription(`✨ *"${getRandomPhrase()}"*\n\nClique no botão abaixo para coletar suas almas diárias!`)
            .setFooter({ text: 'Sistema de Recompensas Aeternus' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('daily_claim')
                .setLabel('🎁 Coletar Recompensa Diária')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};
