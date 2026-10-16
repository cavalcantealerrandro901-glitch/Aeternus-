const {
    EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const {
    SAFE_MENTIONS, sanitizeReason, parseDuration, durationLabel,
    resolveMember, checkAction, recordAction
} = require('../utils/moderation');

const CONFIRM_TIMEOUT = 6 * 60 * 1000;

function row(normalId, silentId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(normalId).setLabel('Confirmar silêncio').setEmoji('🔇').setStyle(ButtonStyle.Danger).setDisabled(disabled),
        new ButtonBuilder().setCustomId(silentId).setLabel('Confirmar em silêncio').setEmoji('🤫').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
    );
}

async function handle(context, moderator, target, durationMs, reason, slash) {
    const botMember = await context.guild.members.fetchMe().catch(() => null);
    const check = checkAction(context.guild, moderator, target, botMember, PermissionFlagsBits.ModerateMembers, 'moderatable');
    if (!check.ok) {
        const payload = { content: '❌ ' + check.error, allowedMentions: SAFE_MENTIONS };
        return slash ? context.reply({ ...payload, ephemeral: true }) : context.reply(payload);
    }
    const normalId = 'mute_normal_' + moderator.id + '_' + Date.now();
    const silentId = 'mute_silent_' + moderator.id + '_' + Date.now();
    const embed = new EmbedBuilder().setColor(0x7C3AED).setTitle('⚠️ Confirmar silenciamento')
        .setDescription('Revise os dados e escolha como exibir a confirmação.')
        .addFields(
            { name: 'Moderador', value: '<@' + moderator.id + '>', inline: true },
            { name: 'Membro', value: '<@' + target.id + '>', inline: true },
            { name: 'Duração', value: durationLabel(durationMs), inline: true },
            { name: 'Motivo', value: reason.slice(0, 400) }
        ).setFooter({ text: 'Esta confirmação expira em 6 minutos.' });
    const payload = { embeds: [embed], components: [row(normalId, silentId)], allowedMentions: SAFE_MENTIONS };
    const sent = slash ? await context.reply({ ...payload, fetchReply: true }) : await context.reply(payload);
    const collector = sent.createMessageComponentCollector({
        filter: i => (i.customId === normalId || i.customId === silentId) && i.user.id === moderator.id,
        time: CONFIRM_TIMEOUT, max: 1
    });

    collector.on('collect', async i => {
        await i.deferUpdate().catch(() => null);
        await sent.edit({ components: [row(normalId, silentId, true)] }).catch(() => null);
        try {
            const currentModerator = await context.guild.members.fetch(moderator.id).catch(() => null);
            const currentTarget = await context.guild.members.fetch(target.id).catch(() => null);
            const currentBot = await context.guild.members.fetchMe().catch(() => null);
            const currentCheck = checkAction(context.guild, currentModerator, currentTarget, currentBot, PermissionFlagsBits.ModerateMembers, 'moderatable');
            if (!currentCheck.ok) return sent.reply({ content: '❌ ' + currentCheck.error + ' Nenhum silenciamento foi executado.', allowedMentions: SAFE_MENTIONS });
            await currentTarget.timeout(durationMs, (reason + ' · por ' + currentModerator.user.tag).slice(0, 512));
            await recordAction(context.guild, 'mute', currentModerator.user, currentTarget, reason, { duration: durationLabel(durationMs), durationMs });
            const isSilent = i.customId === silentId;
            const result = new EmbedBuilder().setColor(0x22C55E).setTitle('✅ Silenciamento concluído')
                .setDescription(isSilent ? 'O membro foi silenciado. A confirmação foi processada sem uma mensagem pública adicional.' : 'O membro foi silenciado com sucesso.')
                .addFields(
                    { name: 'Moderador', value: '<@' + currentModerator.id + '>', inline: true },
                    { name: 'Membro', value: '<@' + currentTarget.id + '>', inline: true },
                    { name: 'Duração', value: durationLabel(durationMs), inline: true },
                    { name: 'Motivo', value: reason }
                ).setFooter({ text: 'Aeternus • Registro de moderação' }).setTimestamp();
            if (isSilent && i.isRepliable()) {
                await i.followUp({ embeds: [result], ephemeral: true, allowedMentions: SAFE_MENTIONS }).catch(() => null);
            } else {
                await sent.reply({ embeds: [result], allowedMentions: SAFE_MENTIONS });
            }
        } catch (error) {
            console.error('[mute] Falha ao silenciar:', error?.message || error);
            await sent.reply({ content: '❌ Não consegui silenciar o membro. Confira as permissões e a hierarquia.', allowedMentions: SAFE_MENTIONS }).catch(() => null);
        }
    });
    collector.on('end', async (_collected, reasonEnd) => {
        await sent.edit({ components: [row(normalId, silentId, true)] }).catch(() => null);
        if (reasonEnd === 'time') await sent.reply({ content: '⏳ A confirmação expirou. Nenhuma ação foi executada.', allowedMentions: SAFE_MENTIONS }).catch(() => null);
    });
}

module.exports = {
    name: 'mute', aliases: ['mutar', 'timeout', 'silenciar'], description: 'Silenciar membro', rootSlash: true,
    data: new SlashCommandBuilder().setName('silenciar').setDescription('Silenciar um membro do servidor')
        .addSubcommand(sc => sc.setName('membro').setDescription('Silenciar um membro')
            .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
            .addStringOption(o => o.setName('tempo').setDescription('Duração: 10m, 1h ou 1d (máximo 28 dias)').setMaxLength(20))
            .addStringOption(o => o.setName('motivo').setDescription('Motivo').setMaxLength(400)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args) {
        if (!message.guild || !message.member) return message.reply({ content: '❌ Este comando só funciona em servidores.', allowedMentions: SAFE_MENTIONS });
        const target = resolveMember(message, args);
        if (!target) return message.reply({ content: '❌ Mencione o membro ou informe um ID válido.', allowedMentions: SAFE_MENTIONS });
        const durationMs = parseDuration(args[1]);
        if (!durationMs) return message.reply({ content: '❌ Duração inválida. Use 1m, 10m, 1h ou 1d (máximo 28 dias).', allowedMentions: SAFE_MENTIONS });
        return handle(message, message.member, target, durationMs, sanitizeReason(args.slice(2).join(' ')), false);
    },

    async executeSlash(i) {
        if (!i.inGuild()) return i.reply({ content: '❌ Este comando só funciona em servidores.', ephemeral: true });
        if (i.options.getSubcommand(false) !== 'membro') return i.reply({ content: 'Use /silenciar membro.', ephemeral: true });
        const moderator = await i.guild.members.fetch(i.user.id).catch(() => null);
        const user = i.options.getUser('usuario', true);
        const target = await i.guild.members.fetch(user.id).catch(() => null);
        if (!moderator || !target) return i.reply({ content: '❌ Não consegui localizar o moderador ou o membro no servidor.', ephemeral: true });
        const durationMs = parseDuration(i.options.getString('tempo'));
        if (!durationMs) return i.reply({ content: '❌ Duração inválida. Use 1m, 10m, 1h ou 1d (máximo 28 dias).', ephemeral: true });
        return handle(i, moderator, target, durationMs, sanitizeReason(i.options.getString('motivo')), true);
    }
};
