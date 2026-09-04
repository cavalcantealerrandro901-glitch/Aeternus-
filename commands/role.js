const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'role',
    aliases: ['alternar-cargo'],
    description: 'Alternar cargo',
    data: new SlashCommandBuilder()
        .setName('alternar-cargo')
        .setDescription('Alternar cargo')
        .addUserOption((o) => o.setName('membro').setDescription('Membro').setRequired(true))
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        if (!member || !role) return message.reply('Uso: `O.role @membro @cargo`');
        const has = member.roles.cache.has(role.id);
        try {
            if (has) await member.roles.remove(role);
            else await member.roles.add(role);
            await message.reply(has ? `➖ ${role} removido de ${member}` : `➕ ${role} dado a ${member}`);
        } catch {
            await message.reply('❌ Falha na hierarquia/permissão.');
        }
    },

    async executeSlash(i) {
        const user = i.options.getUser('membro', true);
        const role = i.options.getRole('cargo', true);
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        const has = member.roles.cache.has(role.id);
        try {
            if (has) await member.roles.remove(role);
            else await member.roles.add(role);
            await i.reply(has ? `➖ ${role} removido de ${member}` : `➕ ${role} dado a ${member}`);
        } catch {
            await i.reply({ content: '❌ Falha na hierarquia/permissão.', ephemeral: true });
        }
    }
};
