const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'kick',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
            return message.reply('❌ Sem permissão.');
        const member = message.mentions.members.first();
        if (!member) return message.reply('Mencione um membro.');
        if (!member.kickable) return message.reply('Não consigo expulsar.');
        const reason = args.slice(1).join(' ') || 'Sem motivo';
        await member.kick(`${message.author.tag}: ${reason}`);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf97316)
                    .setTitle('👢 Expulsão')
                    .setDescription(`**${member.user.tag}**\nMotivo: ${reason}`)
            ]
        });
    }
};
