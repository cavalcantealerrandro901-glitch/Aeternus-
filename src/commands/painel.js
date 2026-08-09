const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://aeternus-q7gt.onrender.com';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Envia o link direto para o painel web de controle do servidor.'),

    async execute(interaction) {
        const guildDashboardUrl = `${DASHBOARD_URL}/dashboard/${interaction.guild.id}`;

        const embed = new EmbedBuilder()
            .setTitle('🌐 Painel de Controle - Aeternus')
            .setDescription(`Olá **${interaction.user.username}**! Clique no botão abaixo para gerenciar o servidor **${interaction.guild.name}**.`)
            .setColor('#38bdf8')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter({ text: 'Aeternus Manager', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Acessar Painel do Servidor')
                .setStyle(ButtonStyle.Link)
                .setURL(guildDashboardUrl)
                .setEmoji('🔗')
        );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};
