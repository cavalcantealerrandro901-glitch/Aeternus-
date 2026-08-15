const { SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa um membro do servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('O membro a ser expulso').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('O motivo da expulsão').setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
        }

        const target = interaction.options.getMember('usuario');
        const reason = interaction.options.getString('motivo') || 'Nenhum motivo fornecido';

        if (!target) {
            return interaction.reply({ content: '⚠️ Usuário não encontrado no servidor.', ephemeral: true });
        }

        if (!target.kickable) {
            return interaction.reply({ content: '❌ Eu não consigo expulsar este membro (verifique a hierarquia de cargos).', ephemeral: true });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`kick_normal_${target.id}`)
                .setLabel('Confirmar')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`kick_silent_${target.id}`)
                .setLabel('Kick Silencioso')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            content: `⚠️ Deseja realmente expulsar **${target.user.tag}**?\n📝 **Motivo:** ${reason}`,
            components: [row]
        });
    }
};
