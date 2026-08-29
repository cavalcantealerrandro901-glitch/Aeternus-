const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'mute',
    aliases: ['silenciar', 'timeout'],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
            return message.reply('❌ Sem permissão.');
        const member = message.mentions.members.first();
        if (!member) return message.reply('Uso: `O.mute @user [min] [motivo]`');
        if (!member.moderatable) return message.reply('Não consigo silenciar.');
        const mins = Math.min(40320, Math.max(1, parseInt(args[1], 10) || 10));
        const reason = args.slice(2).join(' ') || 'Sem motivo';
        await member.timeout(mins * 60 * 1000, reason);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle('🔇 Timeout')
                    .setDescription(`**${member.user.tag}** · **${mins}** min\n${reason}`)
            ]
        });
    }
};
