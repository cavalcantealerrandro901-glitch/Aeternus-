const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'embed',
    aliases: ['anuncio'],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
            return message.reply('❌ Sem permissão.');
        const text = args.join(' ');
        if (!text.includes('|')) return message.reply('Uso: `O.embed título | descrição`');
        const [title, ...rest] = text.split('|');
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setTitle(title.trim().slice(0, 256))
                    .setDescription(rest.join('|').trim().slice(0, 4000))
                    .setTimestamp()
            ]
        });
        await message.delete().catch(() => {});
    }
};
