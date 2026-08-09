const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-desativar')
        .setDescription('Desativa o sistema de atendimento por tickets no servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildConfig = db.getGuildConfig(interaction.guild.id);
        const currentTickets = guildConfig.tickets || {};

        db.setGuildConfig(interaction.guild.id, {
            tickets: { ...currentTickets, enabled: false }
        });

        await interaction.reply({
            content: '🚫 O sistema de tickets foi **desativado** com sucesso para este servidor!',
            ephemeral: true
        });
    }
};
