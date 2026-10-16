const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const {
    SAFE_MENTIONS, sanitizeReason, resolveMember, checkAction, recordAction
} = require('../utils/moderation');

async function run(context, moderator, target, reason, slash) {
    const botMember = await context.guild.members.fetchMe().catch(() => null);
    const check = checkAction(context.guild, moderator, target, botMember, PermissionFlagsBits.ModerateMembers, 'moderatable');
    if (!check.ok) {
        const payload = { content: '❌ ' + check.error, allowedMentions: SAFE_MENTIONS };
        return slash ? context.reply({ ...payload, ephemeral: true }) : context.reply(payload);
    }
    if (!target.isCommunicationDisabled?.()) {
        const payload = { content: 'ℹ️ Este membro não está silenciado no momento.', allowedMentions: SAFE_MENTIONS };
        return slash ? context.reply({ ...payload, ephemeral: true }) : context.reply(payload);
    }
    try {
        await target.timeout(null, (reason + ' · por ' + moderator.user.tag).slice(0, 512));
        await recordAction(context.guild, 'unmute', moderator.user, target, reason);
        const embed = new EmbedBuilder().setColor(0x22C55E).setTitle('🔊 Silêncio removido')
            .setDescription('O timeout do membro foi removido com sucesso.')
            .addFields(
                { name: 'Moderador', value: '<@' + moderator.id + '>', inline: true },
                { name: 'Membro', value: '<@' + target.id + '>', inline: true },
                { name: 'Motivo', value: reason }
            ).setFooter({ text: 'Aeternus • Registro de moderação' }).setTimestamp();
        return context.reply({ embeds: [embed], allowedMentions: SAFE_MENTIONS });
    } catch (error) {
        console.error('[unmute] Falha ao remover timeout:', error?.message || error);
        const payload = { content: '❌ Não consegui remover o silêncio. Confira as permissões e a hierarquia.', allowedMentions: SAFE_MENTIONS };
        return slash ? context.reply({ ...payload, ephemeral: true }) : context.reply(payload);
    }
}

module.exports = {
    name: 'unmute', aliases: ['desilenciar'], description: 'Remover silêncio',
    data: new SlashCommandBuilder().setName('dessilenciar').setDescription('Remover silêncio')
        .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo').setMaxLength(400))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args) {
        if (!message.guild || !message.member) return message.reply({ content: '❌ Este comando só funciona em servidores.', allowedMentions: SAFE_MENTIONS });
        const target = resolveMember(message, args);
        if (!target) return message.reply({ content: '❌ Mencione o membro ou informe um ID válido.', allowedMentions: SAFE_MENTIONS });
        const reason = sanitizeReason(args.slice(1).join(' '));
        return run(message, message.member, target, reason, false);
    },

    async executeSlash(i) {
        if (!i.inGuild()) return i.reply({ content: '❌ Este comando só funciona em servidores.', ephemeral: true });
        const moderator = await i.guild.members.fetch(i.user.id).catch(() => null);
        const user = i.options.getUser('usuario', true);
        const target = await i.guild.members.fetch(user.id).catch(() => null);
        if (!moderator || !target) return i.reply({ content: '❌ Não consegui localizar o moderador ou o membro no servidor.', ephemeral: true });
        return run(i, moderator, target, sanitizeReason(i.options.getString('motivo')), true);
    }
};
