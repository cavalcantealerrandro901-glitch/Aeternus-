const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'unmute',
    description: 'Remover silêncio',
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remover silêncio')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Mencione o membro.');
        try {
            await member.timeout(null);
            await message.reply(`🔊 **${member.user.tag}**`);
        } catch {
            await message.reply('❌ Não consegui.');
        }
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario', true);
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        try {
            await member.timeout(null);
            await i.reply(`🔊 **${user.tag}**`);
        } catch {
            await i.reply({ content: '❌ Não consegui.', ephemeral: true });
        }
    }
};
