const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const antiRob = require('../utils/antiRob');

module.exports = {
    name: 'config-antiroubo',
    aliases: ['antiroubo', 'anti-roubo', 'setantiroubo'],
    description: 'Configura cargo anti-roubo e proteção global de usuários',
    category: 'economia',
    data: new SlashCommandBuilder()
        .setName('config-antiroubo')
        .setDescription('Anti-roubo: cargo do servidor e proteção global')
        .addSubcommand((s) =>
            s.setName('definir').setDescription('Define o cargo que grava proteção no DB do user')
                .addRoleOption((o) => o.setName('cargo').setDescription('Cargo').setRequired(true))
        )
        .addSubcommand((s) => s.setName('ver').setDescription('Cargo local e sua proteção no DB'))
        .addSubcommand((s) =>
            s.setName('revogar').setDescription('Remove proteção global de um usuário')
                .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(true))
        )
        .addSubcommand((s) =>
            s.setName('conceder').setDescription('Salva proteção global no DB sem cargo')
                .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(true))
        )
        .addSubcommand((s) => s.setName('remover-cargo').setDescription('Remove config de cargo deste servidor'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Precisa de **Gerenciar Servidor**.');
        }
        const sub = (args[0] || 'ver').toLowerCase();
        if (sub === 'definir' || sub === 'set') {
            const role = message.mentions.roles.first();
            if (!role) return message.reply('Uso: `O.config-antiroubo definir @cargo`');
            const r = antiRob.setAntiRobRole(message.guild.id, role.id);
            if (!r.ok) return message.reply('❌ ' + r.error);
            return message.reply('✅ Cargo local: ' + role + '\nQuem receber este cargo terá proteção **salva no banco** (vale em todos os servidores).');
        }
        if (sub === 'revogar') {
            const u = message.mentions.users.first();
            if (!u) return message.reply('Uso: `O.config-antiroubo revogar @user`');
            const r = antiRob.revokeProtection(u.id);
            return message.reply(r.ok ? '🗑️ Proteção de ' + u + ' removida do DB.' : '❌ ' + r.error);
        }
        if (sub === 'conceder') {
            const u = message.mentions.users.first();
            if (!u) return message.reply('Uso: `O.config-antiroubo conceder @user`');
            antiRob.grantProtection(u.id, { guildId: message.guild.id });
            return message.reply('✅ ' + u + ' agora tem proteção **global** salva no banco.');
        }
        if (sub === 'remover' || sub === 'remover-cargo') {
            antiRob.setAntiRobRole(message.guild.id, null);
            return message.reply('🗑️ Config de cargo deste servidor removida.');
        }
        const id = antiRob.resolveRoleId(message.guild);
        const me = antiRob.isSavedProtected(message.author.id);
        return message.reply(
            (id ? '🔐 Cargo neste servidor: <@&' + id + '>\n' : '⚠️ Nenhum cargo local.\n') +
            (me ? '✅ Sua proteção global: **ATIVA** (salva no DB)' : '❌ Sua proteção global: **inativa**')
        );
    },

    async executeSlash(i) {
        if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return i.reply({ content: '❌ Precisa de **Gerenciar Servidor**.', ephemeral: true });
        }
        const sub = i.options.getSubcommand();
        if (sub === 'definir') {
            const role = i.options.getRole('cargo', true);
            const r = antiRob.setAntiRobRole(i.guild.id, role.id);
            if (!r.ok) return i.reply({ content: '❌ ' + r.error, ephemeral: true });
            return i.reply({
                embeds: [new EmbedBuilder().setColor(0x22c55e).setTitle('🔐 Cargo anti-roubo definido')
                    .setDescription(role + ' ativa a proteção.\nAo receber o cargo, o usuário é **salvo no banco** e fica protegido em **todos** os servidores.')]
            });
        }
        if (sub === 'revogar') {
            const u = i.options.getUser('usuario', true);
            const r = antiRob.revokeProtection(u.id);
            return i.reply({ content: r.ok ? '🗑️ Proteção de ' + u + ' removida do DB.' : '❌ ' + r.error, ephemeral: true });
        }
        if (sub === 'conceder') {
            const u = i.options.getUser('usuario', true);
            antiRob.grantProtection(u.id, { guildId: i.guild.id });
            return i.reply({ content: '✅ ' + u + ' com proteção **global** no banco de usuários.', ephemeral: true });
        }
        if (sub === 'remover-cargo') {
            antiRob.setAntiRobRole(i.guild.id, null);
            return i.reply({ content: '🗑️ Config de cargo removida.', ephemeral: true });
        }
        const id = antiRob.resolveRoleId(i.guild);
        const me = antiRob.isSavedProtected(i.user.id);
        return i.reply({
            content: (id ? '🔐 Cargo local: <@&' + id + '>\n' : '⚠️ Nenhum cargo local.\n') +
                (me ? '✅ Você: proteção global **ATIVA**' : '❌ Você: proteção global **inativa**'),
            ephemeral: true
        });
    }
};
