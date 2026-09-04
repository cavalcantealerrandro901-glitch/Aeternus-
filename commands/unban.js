const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'unban',
    aliases: ['desbanir'],
    description: 'Desbanir usuário',
    data: new SlashCommandBuilder()
        .setName('desbanir')
        .setDescription('Desbanir membro')
        .addStringOption((o) =>
            o.setName('id').setDescription('ID do usuário').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const id = (args[0] || '').replace(/\D/g, '');
        if (!id) return message.reply('❌ Informe o ID.');
        try {
            await message.guild.members.unban(id);
            await message.reply(`✅ Desbanido: \`${id}\``);
        } catch {
            await message.reply('❌ Não encontrei esse ban.');
        }
    },

    async executeSlash(i) {
        const id = String(i.options.getString('id', true)).replace(/\D/g, '');
        try {
            await i.guild.members.unban(id);
            await i.reply(`✅ Desbanido: \`${id}\``);
        } catch {
            await i.reply({ content: '❌ Não encontrei esse ban.', ephemeral: true });
        }
    }
};
