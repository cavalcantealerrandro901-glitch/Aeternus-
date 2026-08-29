const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'unmute',
    aliases: ['dessilenciar'],
    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
            return message.reply('❌ Sem permissão.');
        const member = message.mentions.members.first();
        if (!member) return message.reply('Mencione um membro.');
        await member.timeout(null);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0x34d399).setDescription(`🔊 ${member} liberado.`)] });
    }
};
