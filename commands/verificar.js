const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings } = require('../utils/settings');

function getRole(guild, roleId) {
    return guild.roles.cache.get(String(roleId)) || null;
}

async function verify(member, guild, reply) {
    const s = getSettings(guild.id);
    const roleId = s.verifyRoleId || s.verification?.roleId;
    if (!roleId) return reply('Verificação não configurada no painel.');

    const role = getRole(guild, roleId);
    if (!role) return reply('❌ O cargo de verificação configurado não existe mais.');

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return reply('❌ Preciso da permissão **Gerenciar Cargos**.');
    }
    if (role.managed || role.id === guild.id || role.position >= me.roles.highest.position) {
        return reply('❌ O cargo de verificação não pode ser gerenciado pelo Aeternus.');
    }
    if (member.roles.cache.has(role.id)) return reply('✅ Você já está verificado.');

    try {
        await member.roles.add(role, 'Verificação Aeternus');
        return reply('✅ Verificado com sucesso.');
    } catch (_) {
        return reply('❌ Não consegui dar o cargo de verificação.');
    }
}

module.exports = {
    name: 'verificar',
    aliases: ['verify'],
    description: 'Verificação',
    data: new SlashCommandBuilder()
        .setName('verificacao')
        .setDescription('Verificar sua conta no servidor')
        .setDMPermission(false),

    async execute(message) {
        if (!message.guild) return;
        return verify(message.member, message.guild, (content) => message.reply(content));
    },

    async executeSlash(i) {
        return verify(i.member, i.guild, (content) =>
            i.reply({ content, ephemeral: true })
        );
    }
};
