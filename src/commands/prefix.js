const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefixo')
        .setDescription('Consulte ou altere o prefixo de comandos de texto do bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('novo_prefixo')
                .setDescription('O novo prefixo desejado (Ex: !, ., ?, a!)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const guildConfig = db.getGuildConfig(interaction.guild.id);
        const currentPrefix = guildConfig.prefix || '!';
        const newPrefix = interaction.options.getString('novo_prefixo');

        // Se o usuário não enviou um novo prefixo, apenas exibe o atual
        if (!newPrefix) {
            return await interaction.reply({
                content: `📌 O prefixo atual neste servidor é \`${currentPrefix}\`.`,
                ephemeral: true
            });
        }

        const cleanPrefix = newPrefix.trim();
        if (cleanPrefix.length > 5) {
            return await interaction.reply({
                content: '❌ O prefixo não pode ter mais de 5 caracteres.',
                ephemeral: true
            });
        }

        db.setGuildConfig(interaction.guild.id, { prefix: cleanPrefix });

        await interaction.reply({
            content: `✅ Prefixo alterado com sucesso de \`${currentPrefix}\` para \`${cleanPrefix}\`!`,
            ephemeral: true
        });
    }
};
