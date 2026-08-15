const { SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Avisa um membro do servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('O membro').setRequired(true))
        .addStringOption(opt => opt.setName('motivo').setDescription('O motivo do aviso').setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para avisar membros.', ephemeral: true });
        }

        const target = interaction.options.getMember('usuario');
        const reason = interaction.options.getString('motivo');

        const totalWarns = db.addWarn(target.id, reason, interaction.user.tag);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`viewwarns_${target.id}`)
                .setLabel(`📋 Ver Avisos (${totalWarns})`)
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
            content: `⚠️ O membro **${target.user.tag}** recebeu um aviso.\n📝 **Motivo:** ${reason}\n📊 **Total de avisos:** ${totalWarns}`,
            components: [row]
        });
    }
};
