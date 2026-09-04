const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'nick',
    aliases: ['apelido', 'nickname'],
    description: 'Alterar apelido',
    data: new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Alterar apelido')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(false))
        .addStringOption((o) =>
            o.setName('apelido').setDescription('Novo apelido (vazio = reset)').setRequired(false)
        ),

    async execute(message, args) {
        const target = message.mentions.members.first() || message.member;
        const nick = message.mentions.members.first()
            ? args.slice(1).join(' ')
            : args.join(' ');
        if (
            target.id !== message.author.id &&
            !message.member.permissions.has(PermissionFlagsBits.ManageNicknames)
        ) {
            return message.reply('❌ Sem permissão para alterar nick de outros.');
        }
        try {
            await target.setNickname(nick || null);
            await message.reply(
                nick ? `✅ Nick de **${target.user.username}**: **${nick}**` : `✅ Nick resetado.`
            );
        } catch {
            await message.reply('❌ Não consegui alterar o nick.');
        }
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        const nick = i.options.getString('apelido');
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        if (
            user.id !== i.user.id &&
            !i.memberPermissions?.has(PermissionFlagsBits.ManageNicknames)
        ) {
            return i.reply({ content: '❌ Sem permissão.', ephemeral: true });
        }
        try {
            await member.setNickname(nick || null);
            await i.reply(
                nick ? `✅ Nick de **${user.username}**: **${nick}**` : '✅ Nick resetado.'
            );
        } catch {
            await i.reply({ content: '❌ Não consegui alterar o nick.', ephemeral: true });
        }
    }
};
