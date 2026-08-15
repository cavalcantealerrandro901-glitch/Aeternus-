const { PermissionsBitField } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Ocorreu um erro ao executar este comando.', ephemeral: true });
            }
            return;
        }

        if (!interaction.isButton()) return;

        const parts = interaction.customId.split('_');
        const action = parts[0];
        const type = parts[1];
        const targetId = parts[2];

        // ⏱️ Tratamento de Timeout via Botão
        if (action === 'timeout') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return interaction.reply({ content: '❌ Você não tem permissão para fazer isso.', ephemeral: true });
            }

            try {
                const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);

                if (type === 'cancel') {
                    return interaction.update({ content: '❌ Ação de castigo cancelada.', components: [] });
                }

                if (type === 'apply') {
                    const duration = parseInt(parts[3]);
                    if (!targetMember) {
                        return interaction.update({ content: '❌ Usuário não encontrado no servidor.', components: [] });
                    }

                    await targetMember.timeout(duration, `Aplicado por ${interaction.user.tag}`);
                    await interaction.update({ content: `✅ O membro **${targetMember.user.tag}** foi colocado de castigo com sucesso!`, components: [] });
                }
            } catch (error) {
                console.error(error);
                await interaction.update({ content: '❌ Ocorreu um erro ao tentar aplicar o castigo.', components: [] }).catch(() => {});
            }
        }

        // 📋 Visualizar Histórico de Avisos via Botão
        if (action === 'viewwarns') {
            const warns = db.getWarns(targetId);
            if (warns.length === 0) {
                return interaction.reply({ content: '📂 Este usuário não possui nenhum aviso registrado.', ephemeral: true });
            }

            const list = warns.map((w, i) => `**#${i+1}** - Motivo: *${w.reason}* (Por: ${w.moderator} em ${w.date})`).join('\n');
            await interaction.reply({ content: `📋 **Histórico de Avisos:**\n${list}`, ephemeral: true });
        }

        // 🛑 Ban / Kick (Mantidos dos comandos anteriores)
        if (action === 'ban' || action === 'kick') {
            const flag = action === 'ban' ? PermissionsBitField.Flags.BanMembers : PermissionsBitField.Flags.KickMembers;
            if (!interaction.member.permissions.has(flag)) {
                return interaction.reply({ content: '❌ Você não tem permissão para fazer isso.', ephemeral: true });
            }

            try {
                const guild = interaction.guild;
                const targetUser = await client.users.fetch(targetId).catch(() => null);

                if (!targetUser) {
                    return interaction.update({ content: '❌ Usuário não encontrado.', components: [] });
                }

                if (action === 'ban') {
                    if (type === 'normal') {
                        await guild.members.ban(targetId, { reason: `Banido por ${interaction.user.tag}` });
                        await interaction.update({ content: `✅ O membro **${targetUser.tag}** foi banido com sucesso.`, components: [] });
                    } else if (type === 'silent') {
                        await guild.members.ban(targetId, { reason: `Banimento silencioso por ${interaction.user.tag}` });
                        await interaction.message.delete().catch(() => {});
                    }
                } else if (action === 'kick') {
                    if (type === 'normal') {
                        await guild.members.kick(targetId, `Expulso por ${interaction.user.tag}`);
                        await interaction.update({ content: `✅ O membro **${targetUser.tag}** foi expulso com sucesso.`, components: [] });
                    } else if (type === 'silent') {
                        await guild.members.kick(targetId, `Expulsão silenciosa por ${interaction.user.tag}`);
                        await interaction.message.delete().catch(() => {});
                    }
                }
            } catch (error) {
                console.error(error);
                await interaction.update({ content: '❌ Ocorreu um erro ao processar a punição.', components: [] }).catch(() => {});
            }
        }
    },
};
