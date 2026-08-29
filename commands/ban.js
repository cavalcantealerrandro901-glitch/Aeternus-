const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ban',
    description: 'Bane um membro',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
            return message.reply({ embeds: [e(0xef4444, 'Sem permissão.')] });
        const member = message.mentions.members.first();
        if (!member) return message.reply('Mencione um membro.');
        if (!member.bannable) return message.reply('Não consigo banir este membro.');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        await member.ban({ reason: `${message.author.tag}: ${reason}` });
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xef4444)
                    .setTitle('🔨 Banimento')
                    .setDescription(`**Usuário:** ${member.user.tag}\n**Motivo:** ${reason}\n**Staff:** ${message.author}`)
                    .setTimestamp()
            ]
        });
    }
};
function e(c, d) { return new EmbedBuilder().setColor(c).setDescription(`❌ ${d}`); }
