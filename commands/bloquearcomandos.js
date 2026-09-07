const { PermissionFlagsBits, SlashCommandBuilder, ChannelType } = require('discord.js');
const cmdLock = require('../utils/cmdLock');

function isMod(member) {
    if (!member) return false;
    return (
        member.permissions.has(PermissionFlagsBits.ManageChannels) ||
        member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        member.permissions.has(PermissionFlagsBits.Administrator)
    );
}

module.exports = {
    name: 'bloquearcomandos',
    aliases: ['cmdlock', 'lockcmds', 'bloquearcmds', 'blockcmds'],
    description: 'Bloqueia comandos de bots neste canal',
    data: new SlashCommandBuilder()
        .setName('bloquear-comandos')
        .setDescription('Bloqueia ou libera comandos neste canal')
        .addSubcommand((s) =>
            s.setName('toggle').setDescription('Liga/desliga o bloqueio neste canal')
        )
        .addSubcommand((s) =>
            s
                .setName('canal-comandos')
                .setDescription('Define o canal #comandos para redirecionar')
                .addChannelOption((o) =>
                    o
                        .setName('canal')
                        .setDescription('Canal permitido para comandos')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão (**Gerenciar Canais**).');
        }
        const sub = (args[0] || 'toggle').toLowerCase();

        if (sub === 'canal' || sub === 'comandos' || sub === 'canal-comandos') {
            const ch =
                message.mentions.channels.first() ||
                message.guild.channels.cache.get(args[1]);
            if (!ch) {
                return message.reply('Uso: `O.bloquearcomandos canal #comandos`');
            }
            cmdLock.setCommandsChannel(message.guild.id, ch.id);
            return message.reply(
                `📌 Canal de comandos definido: ${ch}\n` +
                    `Quem tentar comando em canal bloqueado será mandado para lá.`
            );
        }

        const locked = cmdLock.toggle(message.guild.id, message.channel.id);
        const hint = cmdLock.redirectHint(message.guild.id);
        if (locked) {
            return message.reply(
                `🔒 Comandos **bloqueados** em ${message.channel}.\n` +
                    `Mensagens de usuários e respostas de **qualquer bot** serão apagadas.\n` +
                    hint
            );
        }
        return message.reply(`🔓 Comandos **liberados** em ${message.channel}.`);
    },

    async executeSlash(i) {
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão (**Gerenciar Canais**).',
                flags: 64
            });
        }
        const sub = i.options.getSubcommand(false) || 'toggle';

        if (sub === 'canal-comandos') {
            const ch = i.options.getChannel('canal', true);
            cmdLock.setCommandsChannel(i.guild.id, ch.id);
            return i.reply({
                content: `📌 Canal de comandos definido: ${ch}`,
                flags: 64
            });
        }

        const locked = cmdLock.toggle(i.guild.id, i.channel.id);
        const hint = cmdLock.redirectHint(i.guild.id);
        if (locked) {
            return i.reply({
                content:
                    `🔒 Comandos **bloqueados** em ${i.channel}.\n` +
                    `Mensagens de usuários e de **qualquer bot** serão apagadas.\n` +
                    hint,
                flags: 64
            });
        }
        return i.reply({
            content: `🔓 Comandos **liberados** em ${i.channel}.`,
            flags: 64
        });
    }
};
