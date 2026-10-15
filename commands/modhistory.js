const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const store = require('../utils/store');
const { SAFE_MENTIONS } = require('../utils/moderation');

function buildHistory(guildId, userId) {
    const all = store.load('moderation-history.json', {});
    const entries = Array.isArray(all[guildId]) ? all[guildId] : [];
    return entries.filter(item => !userId || item.targetId === userId).slice(-10).reverse();
}

function makeEmbed(entries, userId) {
    const title = userId ? '📋 Histórico de moderação do membro' : '📋 Histórico recente de moderação';
    const embed = new EmbedBuilder().setColor(0x8B5CF6).setTitle(title);
    if (!entries.length) return embed.setDescription('Nenhum registro de moderação foi encontrado.');
    embed.setDescription(entries.map((entry, index) => {
        const when = '<t:' + Math.floor(Number(entry.at || Date.now()) / 1000) + ':R>';
        return '**' + (index + 1) + '. ' + String(entry.action || 'ação').toUpperCase() + '** · ' + when +
            '\nMembro: <@' + entry.targetId + '> · Moderador: ' + (entry.moderatorId ? '<@' + entry.moderatorId + '>' : 'desconhecido') +
            '\nMotivo: ' + String(entry.reason || 'Sem motivo').slice(0, 180);
    }).join('\n\n').slice(0, 4000));
    embed.setFooter({ text: 'Exibindo até 10 registros mais recentes.' }).setTimestamp();
    return embed;
}

module.exports = {
    name: 'modhistory',
    aliases: ['historicomod'],
    description: 'Consultar histórico de moderação',
    rootSlash: true,
    data: new SlashCommandBuilder().setName('historico-mod').setDescription('Consultar registros recentes de moderação')
        .addUserOption(o => o.setName('usuario').setDescription('Filtrar por membro').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args) {
        if (!message.guild || !message.member) return message.reply({ content: '❌ Este comando só funciona em servidores.', allowedMentions: SAFE_MENTIONS });
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply({ content: '❌ Você precisa da permissão Moderar membros.', allowedMentions: SAFE_MENTIONS });
        const target = message.mentions.users.first() || (args[0] ? { id: args[0].replace(/[<@!>]/g, '') } : null);
        return message.reply({ embeds: [makeEmbed(buildHistory(message.guild.id, target?.id), target?.id)], allowedMentions: SAFE_MENTIONS });
    },

    async executeSlash(i) {
        if (!i.inGuild()) return i.reply({ content: '❌ Este comando só funciona em servidores.', ephemeral: true });
        if (!i.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) return i.reply({ content: '❌ Você precisa da permissão Moderar membros.', ephemeral: true });
        const user = i.options.getUser('usuario');
        return i.reply({ embeds: [makeEmbed(buildHistory(i.guild.id, user?.id), user?.id)], allowedMentions: SAFE_MENTIONS });
    }
};
