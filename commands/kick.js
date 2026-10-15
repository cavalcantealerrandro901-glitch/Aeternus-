const {
    EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const {
    SAFE_MENTIONS, sanitizeReason, resolveMember, checkAction, recordAction
} = require('../utils/moderation');

const CONFIRM_TIMEOUT = 6 * 60 * 1000;

function row(id, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(id).setLabel('Confirmar expulsão')
            .setEmoji('👢').setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

async function handle(context, moderator, target, reason, slash) {
    const botMember = await context.guild.members.fetchMe().catch(() => null);
    const check = checkAction(context.guild, moderator, target, botMember, PermissionFlagsBits.KickMembers, 'kickable');
    if (!check.ok) {
        const payload = { content: '❌ ' + check.error, allowedMentions: SAFE_MENTIONS };
        return slash ? context.reply({ ...payload, ephemeral: true }) : context.reply(payload);
    }
    const customId = 'kick_confirm_' + moderator.id + '_' + Date.now();
    const embed = new EmbedBuilder().setColor(0xEA580C).setTitle('⚠️ Confirmar expulsão')
        .setDescription('Revise os dados antes de confirmar.')
        .addFields(
            { name: 'Moderador', value: '<@' + moderator.id + '>', inline: true },
            { name: 'Membro', value: '<@' + target.id + '>', inline: true },
            { name: 'Motivo', value: reason.slice(0, 400) }
        ).setFooter({ text: 'Esta confirmação expira em 6 minutos.' });
    const payload = { embeds: [embed], components: [row(customId)], allowedMentions: SAFE_MENTIONS };
    const sent = slash ? await context.reply({ ...payload, fetchReply: true }) : await context.reply(payload);
    const collector = sent.createMessageComponentCollector({
        filter: i => i.customId === customId && i.user.id === moderator.id,
        time: CONFIRM_TIMEOUT, max: 1
    });

    collector.on('collect', async i => {
        await i.deferUpdate().catch(() => null);
        await sent.edit({ components: [row(customId, true)] }).catch(() => null);
        try {
            const currentModerator = await context.guild.members.fetch(moderator.id).catch(() => null);
            const currentTarget = await context.guild.members.fetch(target.id).catch(() => null);
            const currentBot = await context.guild.members.fetchMe().catch(() => null);
            const currentCheck = checkAction(context.guild, currentModerator, currentTarget, currentBot, PermissionFlagsBits.KickMembers, 'kickable');
            if (!currentCheck.ok) return sent.reply({ content: '❌ ' + currentCheck.error + ' Nenhuma expulsão foi executada.', allowedMentions: SAFE_MENTIONS });
            await currentTarget.kick((reason + ' · por ' + currentModerator.user.tag).slice(0, 512));
            await recordAction(context.guild, 'kick', currentModerator.user, currentTarget, reason);
            const result = new EmbedBuilder().setColor(0x22C55E).setTitle('✅ Expulsão concluída')
                .setDescription('O membro foi removido do servidor.')
                .addFields(
                    { name: 'Moderador', value: '<@' + currentModerator.id + '>', inline: true },
                    { name: 'Membro', value: '<@' + currentTarget.id + '>', inline: true },
                    { name: 'Motivo', value: reason }
                ).setFooter({ text: 'Aeternus • Registro de moderação' }).setTimestamp();
            await sent.reply({ embeds: [result], allowedMentions: SAFE_MENTIONS });
        } catch (error) {
            console.error('[kick] Falha ao expulsar:', error?.message || error);
            await sent.reply({ content: '❌ Não consegui expulsar o membro. Confira as permissões e a hierarquia.', allowedMentions: SAFE_MENTIONS }).catch(() => null);
        }
    });
    collector.on('end', async (_collected, reasonEnd) => {
        await sent.edit({ components: [row(customId, true)] }).catch(() => null);
        if (reasonEnd === 'time') await sent.reply({ content: '⏳ A confirmação expirou. Nenhuma ação foi executada.', allowedMentions: SAFE_MENTIONS }).catch(() => null);
    });
}

module.exports = {
    name: 'kick', aliases: ['expulsar'], description: 'Expulsar membro', rootSlash: true,
    data: new SlashCommandBuilder().setName('expulsar').setDescription('Expulsar um membro do servidor')
        .addSubcommand(sc => sc.setName('server').setDescription('Expulsar um membro do servidor')
            .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
            .addStringOption(o => o.setName('motivo').setDescription('Motivo').setMaxLength(400)))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(message, args) {
        if (!message.guild || !message.member) return message.reply({ content: '❌ Este comando só funciona em servidores.', allowedMentions: SAFE_MENTIONS });
        const target = resolveMember(message, args);
        if (!target) return message.reply({ content: '❌ Mencione o membro ou informe um ID válido.', allowedMentions: SAFE_MENTIONS });
        return handle(message, message.member, target, sanitizeReason(args.slice(1).join(' ')), false);
    },

    async executeSlash(i) {
        if (!i.inGuild()) return i.reply({ content: '❌ Este comando só funciona em servidores.', ephemeral: true });
        if (i.options.getSubcommand(false) !== 'server') return i.reply({ content: 'Use /expulsar server.', ephemeral: true });
        const moderator = await i.guild.members.fetch(i.user.id).catch(() => null);
        const user = i.options.getUser('usuario', true);
        const target = await i.guild.members.fetch(user.id).catch(() => null);
        if (!moderator || !target) return i.reply({ content: '❌ Não consegui localizar o moderador ou o membro no servidor.', ephemeral: true });
        return handle(i, moderator, target, sanitizeReason(i.options.getString('motivo')), true);
    }
};
