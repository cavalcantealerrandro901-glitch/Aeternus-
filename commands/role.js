const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
module.exports = {
    name: 'role',
    data: new SlashCommandBuilder().setName('role').setDescription('Gerenciar cargo'),
    aliases: ['addrole', 'removerole'],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
            return message.reply('❌ Sem permissão.');
        const member = message.mentions.members.first();
        const role =
            message.mentions.roles.first() ||
            message.guild.roles.cache.find((r) => r.name.toLowerCase() === args.slice(1).join(' ').toLowerCase());
        if (!member || !role) return message.reply('Uso: O.role @user @cargo');
        try {
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                await message.reply(`➖ Cargo **${role.name}** removido de **${member.user.tag}**`);
            } else {
                await member.roles.add(role);
                await message.reply(`➕ Cargo **${role.name}** dado a **${member.user.tag}**`);
            }
        } catch {
            await message.reply('❌ Não consegui alterar o cargo.');
        }
    },

    async executeSlash(interaction) {
        const args = [];
        try {
            const raw = interaction.options?.getString?.('args');
            if (raw) args.push(...String(raw).trim().split(/\s+/).filter(Boolean));
        } catch (_) {}
        const fake = {
            author: interaction.user,
            member: interaction.member,
            guild: interaction.guild,
            channel: interaction.channel,
            client: interaction.client,
            mentions: {
                users: { first: () => interaction.options?.getUser?.('usuario') || null },
                members: { first: () => null },
                roles: { first: () => null }
            },
            reply: (p) => interaction.reply(p)
        };
        return module.exports.execute(fake, args, interaction.client);
    }
};
