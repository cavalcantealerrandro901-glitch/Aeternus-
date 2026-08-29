const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'limpar',
    aliases: ['clear', 'purge'],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
            return message.reply('❌ Sem permissão.');
        const n = Math.min(100, Math.max(1, parseInt(args[0], 10) || 10));
        const deleted = await message.channel.bulkDelete(n + 1, true).catch(() => null);
        const msg = await message.channel.send(`🧹 **${Math.max(0, (deleted?.size || 1) - 1)}** mensagens removidas.`);
        setTimeout(() => msg.delete().catch(() => {}), 4000);
    }
};
