const { SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bane um membro do servidor com opções de confirmação')
        .addUserOption(opt => opt.setName('usuario').setDescription('O membro a ser banido').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('O motivo do banimento').setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
        }

        const target = interaction.options.getMember('usuario');
        const reason = interaction.options.getString('motivo') || 'Nenhum motivo fornecido';

        if (!target) {
            return interaction.reply({ content: '⚠️ Usuário não encontrado no servidor.', ephemeral: true });
        }

        if (!target.bannable) {
            return interaction.reply({ content: '❌ Eu não consigo banir este membro (verifique a hierarquia de cargos).', ephemeral: true });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ban_normal_${target.id}`)
                .setLabel('Confirmar')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`ban_silent_${target.id}`)
                .setLabel('Banimento Silencioso')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            content: `⚠️ Deseja realmente banir **${target.user.tag}**?\n📝 **Motivo:** ${reason}`,
            components: [row]
        });
    }
};
