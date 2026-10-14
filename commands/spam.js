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

        const raw = (args[0] || '').toLowerCase();
        const trueVals = ['true', '1', 'on', 'sim', 'ativar', 'yes', 's'];
        const falseVals = ['false', '0', 'off', 'nao', 'não', 'desativar', 'no', 'n'];

        if (!trueVals.includes(raw) && !falseVals.includes(raw)) {
            return message.reply(
                'Uso: `O.spam true` · `O.spam false` · `O.spam true #canal`\n' +
                    '**Sem canal** = servidor inteiro\n' +
                    '**true** = spam permitido · **false** = anti-spam ligado'
            );
        }

        const allow = trueVals.includes(raw);
        const mentioned =
            message.mentions.channels.first() ||
            (args[1] ? message.guild.channels.cache.get(args[1]) : null);

        // Sem menção de canal → servidor inteiro
        if (!mentioned) {
            if (allow) {
                spamAllow.addServerWide(message.guild.id);
                return message.reply(
                    `✅ Spam **permitido em todo o servidor** (\`true\`).\n` +
                        `Anti-spam **desligado** em todos os canais.`
                );
            }
            spamAllow.removeServerWide(message.guild.id);
            // Limpa também canais individuais para voltar ao estado padrão
            const list = spamAllow.list(message.guild.id);
            for (const id of list) {
                if (id !== '*') spamAllow.remove(message.guild.id, id);
            }
            return message.reply(
                `🛡️ Spam **bloqueado em todo o servidor** (\`false\`).\n` +
                    `Anti-spam **ligado** de novo em todos os canais.`
            );
        }

        const ch = mentioned;

        if (allow) {
            // Se estava server-wide, remove o * e adiciona só o canal
            if (spamAllow.isServerWide(message.guild.id)) {
                spamAllow.removeServerWide(message.guild.id);
            }
            spamAllow.add(message.guild.id, ch.id);
            return message.reply(
                `✅ Spam **permitido** em ${ch} (\`true\`).\nAnti-spam **desligado** neste chat.`
            );
        }
        spamAllow.remove(message.guild.id, ch.id);
        return message.reply(
            `🛡️ Spam **bloqueado** em ${ch} (\`false\`).\nAnti-spam **ligado** de novo.`
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

        // Sem canal → servidor inteiro
        if (!ch) {
            if (allow) {
                spamAllow.addServerWide(i.guild.id);
                return i.reply({
                    content:
                        `✅ Spam **permitido em todo o servidor** (\`true\`).\n` +
                        `Anti-spam **desligado** em todos os canais.`,
                    flags: 64
                });
            }
            spamAllow.removeServerWide(i.guild.id);
            const list = spamAllow.list(i.guild.id);
            for (const id of list) {
                if (id !== '*') spamAllow.remove(i.guild.id, id);
            }
            return i.reply({
                content:
                    `🛡️ Spam **bloqueado em todo o servidor** (\`false\`).\n` +
                    `Anti-spam **ligado** de novo em todos os canais.`,
                flags: 64
            });
        }

        if (allow) {
            if (spamAllow.isServerWide(i.guild.id)) {
                spamAllow.removeServerWide(i.guild.id);
            }
            spamAllow.add(i.guild.id, ch.id);
            return i.reply({
                content:
                    `✅ Spam **permitido** em ${ch} (\`true\`).\n` +
                    `Anti-spam **desligado** neste chat.`,
                flags: 64
            });
        }

        spamAllow.remove(i.guild.id, ch.id);
        return i.reply({
            content:
                `🛡️ Spam **bloqueado** em ${ch} (\`false\`).\n` +
                `Anti-spam **ligado** de novo.`,
            flags: 64
        });
    }
};
