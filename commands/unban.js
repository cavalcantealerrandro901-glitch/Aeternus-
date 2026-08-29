const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'unban',
    aliases: ['desbanir'],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
            return message.reply('❌ Sem permissão.');
        const id = args[0]?.replace(/\D/g, '');
        if (!id) return message.reply('Uso: `O.unban <id>`');
        await message.guild.members.unban(id, `Por ${message.author.tag}`).catch(() => null);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0x34d399).setTitle('✅ Unban').setDescription(`ID \`${id}\``)] });
    }
};
