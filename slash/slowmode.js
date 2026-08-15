const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Define o modo lento do canal (0 para desativar)')
        .addIntegerOption(opt => opt.setName('segundos').setDescription('Tempo em segundos (0 a 21600)').setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Você não tem permissão para gerenciar canais.', ephemeral: true });
        }

        const seconds = interaction.options.getInteger('segundos');
        if (seconds < 0 || seconds > 21600) {
            return interaction.reply({ content: '⚠️ Forneça um valor entre 0 e 21600 segundos.', ephemeral: true });
        }

        try {
            await interaction.channel.setRateLimitPerUser(seconds);
            let text = `⏱️ O modo lento foi definido para **${seconds} segundos**.`;
            if (seconds === 0) {
                text = '⏱️ O modo lento foi **desativado** neste canal.';
            }
            await interaction.reply(text);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Ocorreu um erro ao alterar o modo lento.', ephemeral: true });
        }
    }
};
