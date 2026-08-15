const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        const [action, type, targetId] = interaction.customId.split('_');

        if (action === 'ban') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return interaction.reply({ content: '❌ Você não tem permissão para fazer isso.', ephemeral: true });
            }

            try {
                const guild = interaction.guild;
                const targetUser = await client.users.fetch(targetId).catch(() => null);

                if (!targetUser) {
                    return interaction.update({ content: '❌ Usuário não encontrado.', components: [] });
                }

                if (type === 'normal') {
                    await guild.members.ban(targetId, { reason: `Banido por ${interaction.user.tag}` });
                    await interaction.update({ content: `✅ O membro **${targetUser.tag}** foi banido com sucesso.`, components: [] });
                } else if (type === 'silent') {
                    // Bane o usuário e apaga a mensagem do painel instantaneamente de forma silenciosa
                    await guild.members.ban(targetId, { reason: `Banimento silencioso por ${interaction.user.tag}` });
                    await interaction.message.delete().catch(() => {});
                }
            } catch (error) {
                console.error(error);
                await interaction.update({ content: '❌ Ocorreu um erro ao tentar banir este membro.', components: [] }).catch(() => {});
            }
        }
    },
};
