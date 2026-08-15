const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Desbloqueia o canal atual para o @everyone'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Você não tem permissão para gerenciar canais.', ephemeral: true });
        }

        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
                SendMessages: null
            });
            await interaction.reply('🔓 Este canal foi **desbloqueado** com sucesso.');
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Ocorreu um erro ao tentar desbloquear o canal.', ephemeral: true });
        }
    }
};
