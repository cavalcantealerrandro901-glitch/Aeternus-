const {
    PermissionFlagsBits,
    SlashCommandBuilder,
    ChannelType
} = require('discord.js');
const spamAllow = require('../utils/spamAllow');

function isMod(member) {
    if (!member) return false;
    return (
        member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        member.permissions.has(PermissionFlagsBits.ManageChannels) ||
        member.permissions.has(PermissionFlagsBits.Administrator)
    );
}

function clean(s) {
    return String(s || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

const TRUE_VALS = new Set([
    'true', '1', 'on', 'sim', 'ativar', 'yes', 's', 'ligar', 'permitir', 'liberar'
]);
const FALSE_VALS = new Set([
    'false', '0', 'off', 'nao', 'desativar', 'no', 'n', 'desligar', 'bloquear'
]);

function parseAllow(args) {
    const list = Array.isArray(args) ? args : [args];
    for (const a of list) {
        const c = clean(a);
        if (TRUE_VALS.has(c)) return true;
        if (FALSE_VALS.has(c)) return false;
    }
    const joined = clean(list.join(' '));
    if (TRUE_VALS.has(joined)) return true;
    if (FALSE_VALS.has(joined)) return false;
    return null;
}

function nl() {
    return String.fromCharCode(10);
}

module.exports = {
    name: 'spam',
    aliases: ['permitirspam', 'canallivre'],
    description: 'Permitir ou bloquear spam no servidor ou em um canal',
    data: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('true = spam liberado · false = anti-spam ligado (servidor ou canal)')
        .addBooleanOption(function (o) {
            return o
                .setName('permitir')
                .setDescription('true = spam permitido · false = spam bloqueado')
                .setRequired(true);
        })
        .addChannelOption(function (o) {
            return o
                .setName('canal')
                .setDescription('Canal especifico (opcional). Sem canal = servidor inteiro')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false);
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissao (**Gerenciar Servidor**).');
        }

        const allow = parseAllow(args);

        if (allow === null) {
            console.log('[spam] args recebidos:', JSON.stringify(args), '| content:', message.content);
            return message.reply(
                [
                    '**Uso do comando spam:**',
                    '',
                    '`O.spam true` — libera spam em **todo o servidor**',
                    '`O.spam false` — liga anti-spam em **todo o servidor**',
                    '`O.spam true #canal` — libera so naquele canal',
                    '`O.spam false #canal` — bloqueia so naquele canal',
                    '',
                    'Tambem aceita: `sim`, `ativar`, `on`, `1` / `nao`, `off`, `0`'
                ].join(nl())
            );
        }

        var mentioned =
            message.mentions.channels.first() ||
            (Array.isArray(args) && args[1]
                ? message.guild.channels.cache.get(String(args[1]).replace(/[<#>]/g, ''))
                : null);

        if (!mentioned) {
            if (allow) {
                spamAllow.addServerWide(message.guild.id);
                return message.reply(
                    [
                        '✅ Spam **permitido em todo o servidor** (`true`).',
                        'Anti-spam **desligado** em todos os canais.'
                    ].join(nl())
                );
            }
            spamAllow.removeServerWide(message.guild.id);
            var list = spamAllow.list(message.guild.id);
            for (var i = 0; i < list.length; i++) {
                if (list[i] !== '*') spamAllow.remove(message.guild.id, list[i]);
            }
            return message.reply(
                [
                    '🛡️ Spam **bloqueado em todo o servidor** (`false`).',
                    'Anti-spam **ligado** de novo em todos os canais.'
                ].join(nl())
            );
        }

        var ch = mentioned;

        if (allow) {
            if (spamAllow.isServerWide(message.guild.id)) {
                spamAllow.removeServerWide(message.guild.id);
            }
            spamAllow.add(message.guild.id, ch.id);
            return message.reply(
                [
                    '✅ Spam **permitido** em ' + ch.toString() + ' (`true`).',
                    'Anti-spam **desligado** neste chat.'
                ].join(nl())
            );
        }
        spamAllow.remove(message.guild.id, ch.id);
        return message.reply(
            [
                '🛡️ Spam **bloqueado** em ' + ch.toString() + ' (`false`).',
                'Anti-spam **ligado** de novo.'
            ].join(nl())
        );
    },

    async executeSlash(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: 'Este comando so funciona em servidores.', flags: 64 });
        }
        if (!isMod(interaction.member)) {
            return interaction.reply({
                content: 'Sem permissao (**Gerenciar Servidor**).',
                flags: 64
            });
        }

        var allow = interaction.options.getBoolean('permitir', true);
        var ch = interaction.options.getChannel('canal');

        if (!ch) {
            if (allow) {
                spamAllow.addServerWide(interaction.guild.id);
                return interaction.reply({
                    content: [
                        '✅ Spam **permitido em todo o servidor** (`true`).',
                        'Anti-spam **desligado** em todos os canais.'
                    ].join(nl()),
                    flags: 64
                });
            }
            spamAllow.removeServerWide(interaction.guild.id);
            var list2 = spamAllow.list(interaction.guild.id);
            for (var j = 0; j < list2.length; j++) {
                if (list2[j] !== '*') spamAllow.remove(interaction.guild.id, list2[j]);
            }
            return interaction.reply({
                content: [
                    '🛡️ Spam **bloqueado em todo o servidor** (`false`).',
                    'Anti-spam **ligado** de novo em todos os canais.'
                ].join(nl()),
                flags: 64
            });
        }

        if (allow) {
            if (spamAllow.isServerWide(interaction.guild.id)) {
                spamAllow.removeServerWide(interaction.guild.id);
            }
            spamAllow.add(interaction.guild.id, ch.id);
            return interaction.reply({
                content: [
                    '✅ Spam **permitido** em ' + ch.toString() + ' (`true`).',
                    'Anti-spam **desligado** neste chat.'
                ].join(nl()),
                flags: 64
            });
        }

        spamAllow.remove(interaction.guild.id, ch.id);
        return interaction.reply({
            content: [
                '🛡️ Spam **bloqueado** em ' + ch.toString() + ' (`false`).',
                'Anti-spam **ligado** de novo.'
            ].join(nl()),
            flags: 64
        });
    }
};
