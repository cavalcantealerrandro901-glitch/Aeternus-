const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-painel')
        .setDescription('Envia o painel de atendimento/tickets configurado no canal atual.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildConfig = db.getGuildConfig(interaction.guild.id);
        const config = guildConfig.tickets || {};

        const embed = new EmbedBuilder()
            .setTitle(config.embedTitle || '🎫 Central de Atendimento')
            .setDescription(config.embedDescription || 'Clique no botão abaixo para abrir um ticket privado com a nossa equipe.')
            .setColor('#38bdf8')
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_open_ticket')
                .setLabel(config.buttonText || 'Abrir Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );

        await interaction.reply({ content: '✅ Painel de tickets publicado neste canal!', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    }
};
