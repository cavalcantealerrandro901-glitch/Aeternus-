const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getPrefix, setSettings } = require('../utils/settings');
module.exports = {
    name: 'prefix',
    aliases: ['setprefix', 'prefixo'],
    async execute(message, args) {
        if (!args[0]) return message.reply(`Prefixo atual: **${getPrefix(message.guild.id)}**`);
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
            return message.reply('❌ Admin apenas.');
        const p = args[0].slice(0, 5);
        setSettings(message.guild.id, { prefix: p });
        await message.reply({ embeds: [new EmbedBuilder().setColor(0x34d399).setDescription(`✅ Prefixo: **${p}**`)] });
    }
};
