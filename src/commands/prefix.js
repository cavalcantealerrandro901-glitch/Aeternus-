const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefixo')
        .setDescription('Altera o prefixo de comandos de texto do bot para este servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('novo_prefixo')
                .setDescription('O novo prefixo desejado (Ex: !, ., ?, a!)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const newPrefix = interaction.options.getString('novo_prefixo').trim();

        if (newPrefix.length > 5) {
            return await interaction.reply({
                content: '❌ O prefixo não pode ter mais de 5 caracteres.',
                ephemeral: true
            });
        }

        db.setGuildConfig(interaction.guild.id, { prefix: newPrefix });

        await interaction.reply({
            content: `✅ Prefixo alterado com sucesso para \`${newPrefix}\`!`,
            ephemeral: true
        });
    }
};
