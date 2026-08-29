const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'role',
    aliases: ['cargo'],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
            return message.reply('❌ Sem permissão.');
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!member || !role) return message.reply('Uso: `O.role @user @cargo`');
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            return message.reply({ embeds: [new EmbedBuilder().setColor(0xf97316).setDescription(`➖ **${role.name}** removido de ${member}`)] });
        }
        await member.roles.add(role);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0x34d399).setDescription(`➕ **${role.name}** adicionado a ${member}`)] });
    }
};
