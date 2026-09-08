const {
    PermissionFlagsBits,
    SlashCommandBuilder,
    ChannelType,
    EmbedBuilder
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
    aliases: ['permitirspam', 'spamallow', 'antispam-canal'],
    description: 'Permite ou bloqueia spam em um canal',
    data: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('Gerenciar canais onde o spam é permitido')
        .addSubcommand((s) =>
            s
                .setName('permitir')
                .setDescription('Permite spam neste canal (anti-spam desligado aqui)')
                .addChannelOption((o) =>
                    o
                        .setName('canal')
                        .setDescription('Canal (padrão: canal atual)')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(false)
                )
        )
        .addSubcommand((s) =>
            s
                .setName('bloquear')
                .setDescription('Volta a aplicar anti-spam neste canal')
                .addChannelOption((o) =>
                    o
                        .setName('canal')
                        .setDescription('Canal (padrão: canal atual)')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(false)
                )
        )
        .addSubcommand((s) =>
            s.setName('lista').setDescription('Lista canais com spam permitido')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão (**Gerenciar Servidor**).');
        }
        const sub = (args[0] || 'lista').toLowerCase();
        const ch =
            message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[1]) ||
            message.channel;

        if (sub === 'permitir' || sub === 'on' || sub === 'allow') {
            spamAllow.add(message.guild.id, ch.id);
            return message.reply(
                `✅ Spam **permitido** em ${ch}.\nO anti-spam **não** age neste canal.`
            );
        }
        if (sub === 'bloquear' || sub === 'off' || sub === 'negar') {
            spamAllow.remove(message.guild.id, ch.id);
            return message.reply(
                `🛡️ Anti-spam **reativado** em ${ch}.\nSpam volta a ser punido aqui.`
            );
        }

        const list = spamAllow.list(message.guild.id);
        if (!list.length) {
            return message.reply(
                'Nenhum canal com spam liberado. Use `O.spam permitir #canal`.'
            );
        }
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle('Canais com spam permitido')
                    .setDescription(list.map((id) => `• <#${id}>`).join('\n'))
            ]
        });
    },

    async executeSlash(i) {
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão (**Gerenciar Servidor**).',
                flags: 64
            });
        }
        const sub = i.options.getSubcommand();
        const ch = i.options.getChannel('canal') || i.channel;

        if (sub === 'permitir') {
            spamAllow.add(i.guild.id, ch.id);
            return i.reply({
                content:
                    `✅ Spam **permitido** em ${ch}.\n` +
                    `O anti-spam **não** age neste canal.`,
                flags: 64
            });
        }
        if (sub === 'bloquear') {
            spamAllow.remove(i.guild.id, ch.id);
            return i.reply({
                content:
                    `🛡️ Anti-spam **reativado** em ${ch}.\n` +
                    `Spam volta a ser punido aqui.`,
                flags: 64
            });
        }

        const list = spamAllow.list(i.guild.id);
        if (!list.length) {
            return i.reply({
                content: 'Nenhum canal com spam liberado.',
                flags: 64
            });
        }
        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle('Canais com spam permitido')
                    .setDescription(list.map((id) => `• <#${id}>`).join('\n'))
            ],
            flags: 64
        });
    }
};
