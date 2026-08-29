const { PermissionFlagsBits } = require('discord.js');
module.exports = {
    name: 'say',
    aliases: ['falar', 'echo'],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
            return message.reply('❌ Sem permissão.');
        const text = args.join(' ');
        if (!text) return message.reply('Escreva a mensagem.');
        await message.delete().catch(() => {});
        await message.channel.send({ content: text.slice(0, 2000), allowedMentions: { parse: [] } });
    }
};
