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

module.exports = {
    name: 'spam',
    aliases: ['permitirspam', 'canallivre'],
    description: 'Permitir ou bloquear spam no servidor ou em um canal',
    data: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('true = spam liberado · false = anti-spam ligado (servidor ou canal)')
        .addBooleanOption((o) =>
            o
                .setName('permitir')
                .setDescription('true = spam permitido · false = spam bloqueado')
                .setRequired(true)
        )
        .addChannelOption((o) =>
            o
                .setName('canal')
                .setDescription('Canal específico (opcional). Sem canal = servidor inteiro')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão (**Gerenciar Servidor**).');
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
                    '`O.spam true #canal` — libera só naquele canal',
                    '`O.spam false #canal` — bloqueia só naquele canal',
                    '',
                    'Também aceita: `sim`, `ativar`, `on`, `1` / `nao`, `off`, `0`'
                ].join('\n')
            );
        }

        const mentioned =
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
                    ].join('\n')
                );
            }
            spamAllow.removeServerWide(message.guild.id);
            const list = spamAllow.list(message.guild.id);
            for (const id of list) {
                if (id !== '*') spamAllow.remove(message.guild.id, id);
            }
            return message.reply(
                [
                    '🛡️ Spam **bloqueado em todo o servidor** (`false`).',
                    'Anti-spam **ligado** de novo em todos os canais.'
                ].join('\n')
            );
        }

        const ch = mentioned;

        if (allow) {
            if (spamAllow.isServerWide(message.guild.id)) {
                spamAllow.removeServerWide(message.guild.id);
            }
            spamAllow.add(message.guild.id, ch.id);
            return message.reply(
                [
                    `✅ Spam **permitido** em ${ch} (\\`true\\`).`,
                    'Anti-spam **desligado** neste chat.'
                ].join('\n')
            );
        }
        spamAllow.remove(message.guild.id, ch.id);
        return message.reply(
            [
                `🛡️ Spam **bloqueado** em ${ch} (\\`false\\`).`,
                'Anti-spam **ligado** de novo.'
            ].join('\n')
        );
    },

    async executeSlash(i) {
        if (!i.inGuild()) {
            return i.reply({ content: 'Este comando só funciona em servidores.', flags: 64 });
        }
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão (**Gerenciar Servidor**).',
                flags: 64
            });
        }

        const allow = i.options.getBoolean('permitir', true);
        const ch = i.options.getChannel('canal');

        if (!ch) {
            if (allow) {
                spamAllow.addServerWide(i.guild.id);
                return i.reply({
                    content: [
                        '✅ Spam **permitido em todo o servidor** (`true`).',
                        'Anti-spam **desligado** em todos os canais.'
                    ].join('\n'),
                    flags: 64
                });
            }
            spamAllow.removeServerWide(i.guild.id);
            const list = spamAllow.list(i.guild.id);
            for (const id of list) {
                if (id !== '*') spamAllow.remove(i.guild.id, id);
            }
            return i.reply({
                content: [
                    '🛡️ Spam **bloqueado em todo o servidor** (`false`).',
                    'Anti-spam **ligado** de novo em todos os canais.'
                ].join('\n'),
                flags: 64
            });
        }

        if (allow) {
            if (spamAllow.isServerWide(i.guild.id)) {
                spamAllow.removeServerWide(i.guild.id);
            }
            spamAllow.add(i.guild.id, ch.id);
            return i.reply({
                content: [
                    `✅ Spam **permitido** em ${ch} (\\`true\\`).`,
                    'Anti-spam **desligado** neste chat.'
                ].join('\n'),
                flags: 64
            });
        }

        spamAllow.remove(i.guild.id, ch.id);
        return i.reply({
            content: [
                `🛡️ Spam **bloqueado** em ${ch} (\\`false\\`).`,
                'Anti-spam **ligado** de novo.'
            ].join('\n'),
            flags: 64
        });
    }
};
