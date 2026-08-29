const { PermissionFlagsBits } = require('discord.js');
module.exports = {
    name: 'nick',
    aliases: ['apelido', 'setnick'],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames))
            return message.reply('❌ Sem permissão.');
        const member = message.mentions.members.first() || message.member;
        const nick = args.slice(message.mentions.members.size ? 1 : 0).join(' ').slice(0, 32);
        if (!nick) return message.reply('Uso: `O.nick @user apelido`');
        await member.setNickname(nick).catch(() => message.reply('Falha ao alterar.'));
        await message.reply(`✅ Apelido de **${member.user.username}** → **${nick}**`);
    }
};
