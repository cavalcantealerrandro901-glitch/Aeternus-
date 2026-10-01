const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');
const antiRob = require('../utils/antiRob');

module.exports = {
    name: 'config-antiroubo',
    aliases: ['antiroubo', 'anti-roubo', 'setantiroubo'],
    description: 'Define o cargo de proteção anti-roubo deste servidor',
    category: 'economia',
    data: new SlashCommandBuilder()
        .setName('config-antiroubo')
        .setDescription('Configura o cargo anti-roubo do banco neste servidor')
        .addSubcommand((s) =>
            s
                .setName('definir')
                .setDescription('Define qual cargo protege carteira + banco')
                .addRoleOption((o) =>
                    o.setName('cargo').setDescription('Cargo de proteção').setRequired(true)
                )
        )
        .addSubcommand((s) =>
            s.setName('ver').setDescription('Mostra o cargo anti-roubo atual')
        )
        .addSubcommand((s) =>
            s.setName('remover').setDescription('Remove a configuração')
        )
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
            return message.reply('✅ Anti-roubo deste servidor: ' + role);
        }
        if (sub === 'remover' || sub === 'clear') {
            antiRob.setAntiRobRole(message.guild.id, null);
            return message.reply('🗑️ Configuração removida.');
        }
        const id = antiRob.resolveRoleId(message.guild);
        return message.reply(
            id
                ? '🔐 Cargo anti-roubo atual: <@&' + id + '> (`' + id + '`)'
                : '⚠️ Nenhum cargo. Use `O.config-antiroubo definir @cargo`.'
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
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22c55e)
                        .setTitle('🔐 Anti-roubo configurado')
                        .setDescription(
                            'Cargo ' + role + ' protege **carteira + banco** neste servidor.\n' +
                            'Membros com este cargo não podem ser roubados.'
                        )
                ]
            });
        }
        if (sub === 'remover') {
            antiRob.setAntiRobRole(i.guild.id, null);
            return i.reply({ content: '🗑️ Configuração removida.', ephemeral: true });
        }
        const id = antiRob.resolveRoleId(i.guild);
        return i.reply({
            content: id
                ? '🔐 Cargo anti-roubo: <@&' + id + '> (`' + id + '`)'
                : '⚠️ Nenhum cargo. Use `/config-antiroubo definir`.',
            ephemeral: true
        });
    }
};
