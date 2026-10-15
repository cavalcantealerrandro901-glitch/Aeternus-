const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function resolveMember(message, args) {
    const m = message.mentions.members.first();
    if (m) return m;
    const id = String(args[0] || '').replace(/\D/g, '');
    if (id) return message.guild.members.cache.get(id) || null;
    return null;
}

function parseDuration(str) {
    if (!str) return 10 * 60 * 1000;
    const num = parseInt(str);
    if (isNaN(num)) return 10 * 60 * 1000;
    if (str.includes('h')) return num * 60 * 60 * 1000;
    if (str.includes('d')) return num * 24 * 60 * 60 * 1000;
    return num * 60 * 1000;
}

async function handleMuteProcess(context, moderator, targetMember, durationMs, reason, isSlash = false) {
    const normalBtnId = `mute_normal_${moderator.id}_${Date.now()}`;
    const silentBtnId = `mute_silent_${moderator.id}_${Date.now()}`;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(normalBtnId)
            .setLabel('Confirmar silêncio')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(silentBtnId)
            .setLabel('Confirmar em silêncio')
            .setEmoji('🤫')
            .setStyle(ButtonStyle.Secondary)
    );

    const content = `🔇 **AETERNUS • CONFIRMAR SILENCIAMENTO**\n\n**Moderador:** <@${moderator.id}>\n**Membro:** <@${targetMember.id}>\n**Duração:** ${Math.max(1, Math.round(durationMs / 60000))} minuto(s)\n**Motivo:** ${String(reason || 'Sem motivo').slice(0, 300)}\n\nEscolha uma opção abaixo. A confirmação expira em 6 minutos.`;

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

    const filter = i => (i.customId === normalBtnId || i.customId === silentBtnId) && i.user.id === moderator.id;
    const collector = sentMsg.createMessageComponentCollector({ filter, time: 6 * 60 * 1000, max: 1 });

    collector.on('collect', async i => {
        const originalMessage = i.message || sentMsg;
        try {
            await i.deferUpdate();
            await sentMsg.edit({ components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(normalBtnId).setLabel('Confirmar silêncio').setEmoji('✅').setStyle(ButtonStyle.Danger).setDisabled(true),
                new ButtonBuilder().setCustomId(silentBtnId).setLabel('Confirmar em silêncio').setEmoji('🤫').setStyle(ButtonStyle.Secondary).setDisabled(true)
            )] }).catch(() => {});
            const currentModerator = await context.guild.members.fetch(moderator.id).catch(() => null);
            const currentTarget = await context.guild.members.fetch(targetMember.id).catch(() => null);
            const botMember = await context.guild.members.fetchMe().catch(() => null);
            const safeMentions = { parse: [], repliedUser: false };
            if (!currentModerator || !currentTarget || !botMember) return originalMessage.reply({ content: '❌ Não consegui verificar os cargos atuais. Nenhuma ação foi executada.', allowedMentions: safeMentions });
            if (!currentModerator.permissions.has(PermissionFlagsBits.ModerateMembers)) return originalMessage.reply({ content: '❌ Você não tem mais a permissão **Moderar membros**.', allowedMentions: safeMentions });
            if (!botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) return originalMessage.reply({ content: '❌ Preciso da permissão **Moderar membros** para continuar.', allowedMentions: safeMentions });
            if (currentTarget.id === currentModerator.id || currentTarget.id === botMember.id) return originalMessage.reply({ content: '❌ Não é permitido silenciar esse usuário.', allowedMentions: safeMentions });
            if (context.guild.ownerId !== currentModerator.id && currentTarget.roles.highest.comparePositionTo(currentModerator.roles.highest) >= 0) return originalMessage.reply({ content: '❌ Seu cargo precisa estar acima do cargo do membro.', allowedMentions: safeMentions });
            if (!currentTarget.moderatable) return originalMessage.reply({ content: '❌ Não consigo silenciar esse membro. Confira a hierarquia e minhas permissões.', allowedMentions: safeMentions });
            await currentTarget.timeout(durationMs, String(reason || 'Sem motivo') + ' · por ' + currentModerator.user.tag);
            const isSilent = i.customId === silentBtnId;
            const successText = isSilent ? '🤫 <@' + currentTarget.id + '> foi silenciado. A confirmação foi processada em silêncio.' : '🔇 <@' + currentTarget.id + '> foi silenciado com sucesso.';
            await originalMessage.reply({ content: successText + '\n📝 **Motivo:** ' + String(reason || 'Sem motivo').slice(0, 300), allowedMentions: safeMentions });
        } catch (e) {
            console.error('[mute] Erro ao processar confirmação:', e);
            await originalMessage.reply({ content: '❌ Não consegui silenciar o usuário. Confira as permissões e a hierarquia.', allowedMentions: { parse: [], repliedUser: false } }).catch(() => null);
        }
    });
    collector.on('end', async (collected, reasonCollected) => {
        if (reasonCollected === 'time') {
            try {
                await sentMsg.reply({ content: '⏳ Tempo esgotado para confirmar o silenciamento.', allowedMentions: { repliedUser: false } });
            } catch (_) {}
        }
    });
}

module.exports = {
    name: 'mute',
    aliases: ['mutar', 'timeout', 'silenciar'],
    description: 'Silenciar membro',
    data: new SlashCommandBuilder()
        .setName('mutar-membro')
        .setDescription('Silenciar membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        .addStringOption((o) => o.setName('tempo').setDescription('Duração (ex: 10m, 1h)').setRequired(false))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args) {
        if (!message.member) return message.reply('❌ Não consegui verificar sua conta neste servidor.');
        const member = resolveMember(message, args);
        if (!member) return message.reply('❌ Mencione o membro ou informe o ID.');
        if (member.id === message.author.id) return message.reply('❌ Você não pode se mutar.');
        if (member.id === message.client.user.id) return message.reply('❌ Não posso me mutar.');
        // As permissões e a hierarquia serão verificadas novamente ao confirmar.

        const hasMention = !!message.mentions.members.first();
        const timeArg = args[hasMention ? 1 : 1];
        const durationMs = parseDuration(timeArg);
        const reason = args.slice(hasMention ? 2 : 2).join(' ').trim() || 'Sem motivo';

        await handleMuteProcess(message, message.author, member, durationMs, reason, false);
    },

    async executeSlash(i) {
        if (!i.inGuild()) return i.reply({ content: '❌ Este comando só funciona em servidores.', ephemeral: true });
        const user = i.options.getUser('usuario', true);
        const timeStr = i.options.getString('tempo');
        const reason = i.options.getString('motivo') || 'Sem motivo';
        
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        if (member.id === i.user.id) return i.reply({ content: '❌ Você não pode se mutar.', ephemeral: true });
        if (member.id === i.client.user.id) return i.reply({ content: '❌ Não posso me mutar.', ephemeral: true });
        // As permissões e a hierarquia serão verificadas novamente ao confirmar.

        const durationMs = parseDuration(timeStr);
        await handleMuteProcess(i, i.user, member, durationMs, reason, true);
    }
};
