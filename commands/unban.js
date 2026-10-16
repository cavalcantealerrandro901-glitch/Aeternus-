const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const {
    SAFE_MENTIONS, sanitizeReason, recordAction
} = require('../utils/moderation');

async function run(context, moderator, id, reason, slash) {
    if (!context.guild || !moderator) {
        const payload = { content: '❌ Este comando só funciona em servidores.', allowedMentions: SAFE_MENTIONS };
        return slash ? context.reply({ ...payload, ephemeral: true }) : context.reply(payload);
    }
    const botMember = await context.guild.members.fetchMe().catch(() => null);
    if (!moderator.permissions.has(PermissionFlagsBits.BanMembers)) {
        const payload = { content: '❌ Você precisa da permissão Banir membros.', allowedMentions: SAFE_MENTIONS };
        return slash ? context.reply({ ...payload, ephemeral: true }) : context.reply(payload);
    }
    if (!botMember?.permissions.has(PermissionFlagsBits.BanMembers)) {
        const payload = { content: '❌ O Aeternus precisa da permissão Banir membros.', allowedMentions: SAFE_MENTIONS };
        return slash ? context.reply({ ...payload, ephemeral: true }) : context.reply(payload);
    }
    try {
        const ban = await context.guild.bans.fetch(id).catch(() => null);
        if (!ban) {
            const payload = { content: '❌ Não encontrei um banimento ativo para esse ID.', allowedMentions: SAFE_MENTIONS };
            return slash ? context.reply({ ...payload, ephemeral: true }) : context.reply(payload);
        }
        await context.guild.members.unban(id, (reason + ' · por ' + moderator.user.tag).slice(0, 512));
        await recordAction(context.guild, 'unban', moderator.user, { id, user: ban.user }, reason);
        const embed = new EmbedBuilder().setColor(0x22C55E).setTitle('🔓 Desbanimento concluído')
            .setDescription('O usuário foi desbanido com sucesso.')
            .addFields(
                { name: 'Moderador', value: '<@' + moderator.id + '>', inline: true },
                { name: 'Usuário', value: '<@' + id + '> (' + id + ')', inline: true },
                { name: 'Motivo', value: reason }
            ).setFooter({ text: 'Aeternus • Registro de moderação' }).setTimestamp();
        return context.reply({ embeds: [embed], allowedMentions: SAFE_MENTIONS });
    } catch (error) {
        console.error('[unban] Falha ao desbanir:', error?.message || error);
        const payload = { content: '❌ Não consegui concluir o desbanimento. Confira as permissões do Aeternus.', allowedMentions: SAFE_MENTIONS };
        return slash ? context.reply({ ...payload, ephemeral: true }) : context.reply(payload);
    }
}

module.exports = {
    name: 'unban', aliases: ['desbanir'], description: 'Desbanir usuário por ID',
    data: new SlashCommandBuilder().setName('desbanir').setDescription('Desbanir usuário')
        .addStringOption(o => o.setName('id').setDescription('ID do usuário').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo').setMaxLength(400))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args) {
        if (!message.guild || !message.member) return message.reply({ content: '❌ Este comando só funciona em servidores.', allowedMentions: SAFE_MENTIONS });
        const id = String(args[0] || '').trim();
        if (!/^\d{15,25}$/.test(id)) return message.reply({ content: '❌ Informe um ID válido do Discord.', allowedMentions: SAFE_MENTIONS });
        return run(message, message.member, id, sanitizeReason(args.slice(1).join(' ')), false);
    },

    async executeSlash(i) {
        if (!i.inGuild()) return i.reply({ content: '❌ Este comando só funciona em servidores.', ephemeral: true });
        const moderator = await i.guild.members.fetch(i.user.id).catch(() => null);
        const id = String(i.options.getString('id', true)).trim();
        if (!moderator) return i.reply({ content: '❌ Não consegui verificar suas permissões.', ephemeral: true });
        if (!/^\d{15,25}$/.test(id)) return i.reply({ content: '❌ Informe um ID válido do Discord.', ephemeral: true });
        return run(i, moderator, id, sanitizeReason(i.options.getString('motivo')), true);
    }
};
