const { PermissionFlagsBits } = require('discord.js');
module.exports = {
    name: 'lock',
    aliases: ['trancar'],
    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
            return message.reply('❌ Sem permissão.');
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        await message.reply('🔒 Canal trancado.');
    }
};
