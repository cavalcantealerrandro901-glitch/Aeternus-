const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Marca você como ausente')
        .addStringOption((option) =>
            option.setName('motivo').setDescription('Motivo da ausência').setRequired(false)
        ),
    async execute(interaction) {
        if (!interaction.client.afk) interaction.client.afk = new Map();

        const reason = (interaction.options.getString('motivo') || 'Ausente').slice(0, 200);

        interaction.client.afk.set(interaction.user.id, {
            reason,
            timestamp: Date.now(),
            skipOnce: false
        });

        const embed = new EmbedBuilder()
            .setColor(0x64748b)
            .setTitle('💤 AFK ativado')
            .setDescription(
                `**${interaction.user.username}**, você está ausente.\n` +
                    `**Motivo:** ${reason}\n\n` +
                    `Quando mandar qualquer mensagem, o AFK é removido.\n` +
                    `Se alguém te mencionar, o bot avisa o motivo.`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
