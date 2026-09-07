const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
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
    description: 'Bloqueia qualquer comando de bot neste canal',
    data: new SlashCommandBuilder()
        .setName('bloquear-comandos')
        .setDescription('Liga/desliga bloqueio de comandos neste canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão (**Gerenciar Canais**).');
        }
        const locked = cmdLock.toggle(message.guild.id, message.channel.id);
        if (locked) {
            return message.reply(
                `🔒 Comandos **bloqueados** em ${message.channel}.\n` +
                    `Qualquer comando de bot (prefixo ou slash) será apagado aqui.`
            );
        }
        return message.reply(`🔓 Comandos **liberados** de novo em ${message.channel}.`);
    },

    async executeSlash(i) {
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão (**Gerenciar Canais**).',
                flags: 64
            });
        }
        const locked = cmdLock.toggle(i.guild.id, i.channel.id);
        if (locked) {
            return i.reply({
                content:
                    `🔒 Comandos **bloqueados** em ${i.channel}.\n` +
                    `Qualquer comando de bot será apagado neste canal.`,
                flags: 64
            });
        }
        return i.reply({
            content: `🔓 Comandos **liberados** em ${i.channel}.`,
            flags: 64
        });
    }
};
