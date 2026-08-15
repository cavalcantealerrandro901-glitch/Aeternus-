const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('limpar')
        .setDescription('Limpa mensagens recentes do canal (ignora mensagens com mais de 14 dias)')
        .addIntegerOption(opt => opt.setName('quantidade').setDescription('Número de mensagens (1 a 100)').setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
        }

        const amount = interaction.options.getInteger('quantidade');
        if (amount <= 0 || amount > 100) {
            return interaction.reply({ content: '⚠️ Forneça um número entre 1 e 100.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const fetched = await interaction.channel.messages.fetch({ limit: amount });
            const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            const validMessages = fetched.filter(msg => msg.createdTimestamp > fourteenDaysAgo);

            if (validMessages.size === 0) {
                return interaction.editReply('⚠️ Nenhuma mensagem recente (com menos de 14 dias) foi encontrada.');
            }

            await interaction.channel.bulkDelete(validMessages, true);
            await interaction.editReply(`🧹 **${validMessages.size}** mensagens foram apagadas com sucesso!`);
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Ocorreu um erro ao tentar limpar as mensagens.');
        }
    }
};
