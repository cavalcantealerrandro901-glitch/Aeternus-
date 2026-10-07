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
            .setLabel('Aceitar expulsão')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Danger)
    );

    const content = `Nossa, você <@${moderator.id}> vai expulsar <@${targetMember.id}> mesmo? Uh... Sendo assim, clique no botão ✅ aceitar expulsão, você tem 6 minutos para decidir.`;

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
        if (!targetMember.kickable) {
            return originalMessage.edit({ content: '❌ Não consigo expulsar este membro (cargo mais alto).', components: [] });
        }
        try {
            await targetMember.kick(`${reason} · por ${moderator.tag}`);
            
            const successText = `---------- 👢 O usuário <@${targetMember.id}> foi expulso do servidor, mas quem manda quebrar as regras né!!`;
            
            await originalMessage.edit({
                content: successText,
                components: []
            });
        } catch (e) {
            await i.update({ content: '❌ Não consegui expulsar o usuário.', components: [] });
        }
    });

    collector.on('end', async (collected, reasonCollected) => {
        if (reasonCollected === 'time') {
            try {
                await sentMsg.edit({ content: '⏳ Tempo esgotado para confirmar a expulsão.', components: [] });
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
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = resolveMember(message, args);
        if (!member) return message.reply('❌ Mencione o membro ou informe o ID.');
        if (member.id === message.author.id) return message.reply('❌ Você não pode se expulsar.');
        if (member.id === message.client.user.id) return message.reply('❌ Não posso me expulsar.');
        if (!member.kickable) return message.reply('❌ Não consigo expulsar este membro (cargo mais alto).');

        const reason = reasonFrom(args, !!message.mentions.members.first());
        await handleKickProcess(message, message.author, member, reason, false);
    },

    async executeSlash(i) {
        if (!i.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return i.reply({ content: '❌ Sem permissão.', ephemeral: true });
        }
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
