const { PermissionFlagsBits } = require('discord.js');
module.exports = {
    name: 'slowmode',
    aliases: ['slow'],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
            return message.reply('❌ Sem permissão.');
        const sec = Math.min(21600, Math.max(0, parseInt(args[0], 10) || 0));
        await message.channel.setRateLimitPerUser(sec);
        await message.reply(sec ? `🐢 Slowmode: **${sec}s**` : '🐢 Slowmode desativado.');
    }
};
