const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function resolveMember(message, args) {
    const m = message.mentions.members.first();
    if (m) return m;
    const id = String(args[0] || '').replace(/\D/g, '');
    if (id) return message.guild.members.cache.get(id) || null;
    return null;
}

function reasonFrom(args, hasMention) {
    const start = hasMention || (args[0] && /^\d{15,}$/.test(args[0].replace(/\D/g, ''))) ? 1 : 1;
    const r = args.slice(start).join(' ').trim();
    return r || 'Sem motivo';
}

async function handleKickProcess(context, moderator, targetMember, reason, isSlash = false) {
    const customId = `kick_confirm_${moderator.id}_${Date.now()}`;
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(customId)
            .setLabel('Confirmar expulsão')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Danger)
    );

    const content = `👢 **AETERNUS • CONFIRMAR EXPULSÃO**\n\n**Moderador:** <@${moderator.id}>\n**Membro:** <@${targetMember.id}>\n**Motivo:** ${String(reason).slice(0, 500)}\n\nConfirme a ação no botão abaixo. O pedido expira em 6 minutos.`;

    let sentMsg;
    if (isSlash) {
        sentMsg = await context.reply({
            content,
            components: [row],
            fetchReply: true
        });
    } else {
        sentMsg = await context.reply({
            content,
            components: [row]
        });
    }

    const filter = i => i.customId === customId && i.user.id === moderator.id;
    const collector = sentMsg.createMessageComponentCollector({ filter, time: 6 * 60 * 1000, max: 1 });

    collector.on('collect', async i => {
        const originalMessage = i.message || sentMsg;
        try { await i.deferUpdate(); } catch (_) { return; }
        try {
            const currentModerator = await context.guild.members.fetch(moderator.id).catch(() => null);
            const currentTarget = await context.guild.members.fetch(targetMember.id).catch(() => null);
            const botMember = await context.guild.members.fetchMe().catch(() => null);
            if (!currentModerator || !currentTarget || !botMember) return originalMessage.reply({ content: '❌ Não consegui verificar os cargos atuais. Nenhuma ação foi executada.', allowedMentions: { parse: [], repliedUser: false } });
            if (!currentModerator.permissions.has(PermissionFlagsBits.KickMembers)) return originalMessage.reply({ content: '❌ Você não tem mais a permissão **Expulsar membros**.', allowedMentions: { parse: [], repliedUser: false } });
            if (!botMember.permissions.has(PermissionFlagsBits.KickMembers)) return originalMessage.reply({ content: '❌ Preciso da permissão **Expulsar membros** para continuar.', allowedMentions: { parse: [], repliedUser: false } });
            if (currentTarget.id === currentModerator.id || currentTarget.id === botMember.id) return originalMessage.reply({ content: '❌ Essa expulsão não é permitida.', allowedMentions: { parse: [], repliedUser: false } });
            if (context.guild.ownerId !== currentModerator.id && currentTarget.roles.highest.comparePositionTo(currentModerator.roles.highest) >= 0) return originalMessage.reply({ content: '❌ Seu cargo precisa estar acima do cargo do membro.', allowedMentions: { parse: [], repliedUser: false } });
            if (!currentTarget.kickable) return originalMessage.reply({ content: '❌ Não consigo expulsar este membro. Confira a hierarquia e minhas permissões.', allowedMentions: { parse: [], repliedUser: false } });
            await currentTarget.kick(`${reason} · por ${currentModerator.user.tag}`);
            const successText = `👢 **Expulsão concluída**\nO membro <@${currentTarget.id}> foi removido do servidor.\n**Motivo:** ${String(reason).slice(0, 500)}`;
            await originalMessage.reply({ content: successText, allowedMentions: { parse: [], repliedUser: false } });
        } catch (e) {
            await originalMessage.reply({ content: '❌ Não consegui expulsar o usuário.', allowedMentions: { parse: [], repliedUser: false } });
        }
    });

    collector.on('end', async (collected, reasonCollected) => {
        if (reasonCollected === 'time') {
            try {
                await sentMsg.reply({ content: '⏳ Tempo esgotado para confirmar a expulsão.', allowedMentions: { repliedUser: false } });
            } catch (_) {}
        }
    });
}

module.exports = {
    name: 'kick',
    aliases: ['expulsar'],
    description: 'Expulsar membro',
    data: new SlashCommandBuilder()
        .setName('expulsar-membro')
        .setDescription('Expulsar membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(message, args) {
        if (!message.member) return message.reply('❌ Não consegui verificar sua conta neste servidor.');
        const member = resolveMember(message, args);
        if (!member) return message.reply('❌ Mencione o membro ou informe o ID.');
        if (member.id === message.author.id) return message.reply('❌ Você não pode se expulsar.');
        if (member.id === message.client.user.id) return message.reply('❌ Não posso me expulsar.');
        // As permissões e a hierarquia serão verificadas novamente ao confirmar.

        const reason = reasonFrom(args, !!message.mentions.members.first());
        await handleKickProcess(message, message.author, member, reason, false);
    },

    async executeSlash(i) {
        if (!i.inGuild()) return i.reply({ content: '❌ Este comando só funciona em servidores.', ephemeral: true });
        const user = i.options.getUser('usuario', true);
        const reason = i.options.getString('motivo') || 'Sem motivo';
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        if (member.id === i.user.id) return i.reply({ content: '❌ Você não pode se expulsar.', ephemeral: true });
        if (member.id === i.client.user.id) return i.reply({ content: '❌ Não posso me expulsar.', ephemeral: true });
        if (!member.kickable) {
            return i.reply({ content: '❌ Não consigo expulsar este membro (cargo mais alto).', ephemeral: true });
        }

        await handleKickProcess(i, i.user, member, reason, true);
    }
};
