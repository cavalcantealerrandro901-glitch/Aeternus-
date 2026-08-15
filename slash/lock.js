const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Bloqueia o canal atual para o @everyone'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Você não tem permissão para gerenciar canais.', ephemeral: true });
        }

        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
                SendMessages: false
            });
            await interaction.reply('🔒 Este canal foi **bloqueado** com sucesso.');
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Ocorreu um erro ao tentar bloquear o canal.', ephemeral: true });
        }
    }
};
