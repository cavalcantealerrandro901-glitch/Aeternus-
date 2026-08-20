const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Define seu status como ausente no servidor.')
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Motivo da sua ausência')
                .setRequired(false)
        ),
    async execute(interaction) {
        const reason = interaction.options.getString('motivo') || 'Ausente';
        
        interaction.client.afk.set(interaction.user.id, {
            reason,
            timestamp: Date.now()
        });

        await interaction.reply({
            content: `💤 **${interaction.user.username}**, seu status foi definido como **AFK**: \`${reason}\``
        });
    }
};
