const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const { getRandomPhrase, generatePhrase, getRandomEmoji } = require('../utils/phrases');

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

        // 🎁 Tratamento do Botão Daily + Notificação na DM
        if (action === 'daily' && type === 'claim') {
            const userId = interaction.user.id;
            const userDaily = db.getDaily(userId);
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000; // 24 horas

            if (userDaily.lastClaimed && (now - userDaily.lastClaimed < cooldown)) {
                const timeLeft = cooldown - (now - userDaily.lastClaimed);
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                return interaction.reply({ content: `⏳ Você já coletou seu daily hoje! Volte em **${hours}h ${minutes}m**.`, ephemeral: true });
            }

            let streak = userDaily.streak || 0;
            const twoDays = 48 * 60 * 60 * 1000;
            if (userDaily.lastClaimed && (now - userDaily.lastClaimed > twoDays)) {
                streak = 1;
            } else {
                streak += 1;
            }

            const baseReward = 5000;
            const bonus = Math.floor(streak / 2) * 2000;
            const totalReward = baseReward + bonus;

            db.addBal(userId, totalReward);
            db.setDaily(userId, streak, now);

            const phrase = getRandomPhrase();
            const emoji = getRandomEmoji();

            const successEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`🎉 Recompensa Coletada com Sucesso! ${emoji}`)
                .setDescription(`✨ *"${phrase}"*`)
                .addFields(
                    { name: '🔥 Sequência (Streak)', value: `${streak} dia(s)`, inline: true },
                    { name: '💀 Recompensa', value: `+${totalReward.toLocaleString()} almas`, inline: true }
                )
                .setTimestamp();

            // 🕰️ Inicia o Timer para avisar na DM após 24 horas
            setTimeout(async () => {
                try {
                    const userToNotify = await client.users.fetch(userId);
                    const notifEmbed = new EmbedBuilder()
                        .setColor('#9B59B6')
                        .setTitle(`🎁 Seu Daily está pronto, ${userToNotify.username}!`)
                        .setDescription(`As 24 horas se passaram e suas almas aguardam.\n\n✨ *"${generatePhrase()}"*`)
                        .setFooter({ text: 'Volte ao servidor para coletar!' });

                    await userToNotify.send({ embeds: [notifEmbed] });
                } catch (err) {
                    console.log(`Não foi possível enviar DM para ${userId}.`);
                }
            }, cooldown);

            return interaction.update({
                embeds: [successEmbed],
                components: []
            });
        }

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

        // 🛑 Ban / Kick
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
