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
    aliases: ['permitirspam'],
    description: 'Ativar ou desativar canal livre de anti-spam',
    data: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('Ativar ou desativar canal livre (sem anti-spam)')
        .addSubcommand((s) =>
            s
                .setName('ativar')
                .setDescription('Ativa canal livre — anti-spam desligado neste canal')
                .addChannelOption((o) =>
                    o
                        .setName('canal')
                        .setDescription('Canal (opcional: usa o atual)')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(false)
                )
        )
        .addSubcommand((s) =>
            s
                .setName('desativar')
                .setDescription('Desativa canal livre — anti-spam volta a valer')
                .addChannelOption((o) =>
                    o
                        .setName('canal')
                        .setDescription('Canal (opcional: usa o atual)')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(false)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão (**Gerenciar Servidor**).');
        }
        const sub = (args[0] || '').toLowerCase();
        const ch =
            message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[1]) ||
            message.channel;

        if (sub === 'ativar' || sub === 'on' || sub === 'ligar') {
            spamAllow.add(message.guild.id, ch.id);
            return message.reply(
                `✅ Canal livre **ativado** em ${ch}.\nAnti-spam **desligado** neste chat.`
            );
        }
        if (sub === 'desativar' || sub === 'off' || sub === 'desligar') {
            spamAllow.remove(message.guild.id, ch.id);
            return message.reply(
                `🛡️ Canal livre **desativado** em ${ch}.\nAnti-spam **ligado** de novo.`
            );
        }
        return message.reply(
            'Uso: `O.spam ativar [#canal]` · `O.spam desativar [#canal]`'
        );
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

        if (sub === 'ativar') {
            spamAllow.add(i.guild.id, ch.id);
            return i.reply({
                content:
                    `✅ Canal livre **ativado** em ${ch}.\n` +
                    `Anti-spam **desligado** neste chat.`,
                flags: 64
            });
        }
        if (sub === 'desativar') {
            spamAllow.remove(i.guild.id, ch.id);
            return i.reply({
                content:
                    `🛡️ Canal livre **desativado** em ${ch}.\n` +
                    `Anti-spam **ligado** de novo.`,
                flags: 64
            });
        }
        return i.reply({ content: 'Subcomando inválido.', flags: 64 });
    }
};
