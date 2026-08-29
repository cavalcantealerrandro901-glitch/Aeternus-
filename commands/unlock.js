const { PermissionFlagsBits } = require('discord.js');
module.exports = {
    name: 'unlock',
    aliases: ['destrancar'],
    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
            return message.reply('❌ Sem permissão.');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
        await message.reply('🔓 Canal destrancado.');
    }
};
