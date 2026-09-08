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
    description: 'Bloqueia ou libera comandos em um canal',
    data: new SlashCommandBuilder()
        .setName('bloquear-comandos')
        .setDescription('true = bloqueia comandos · false = libera · canal opcional')
        .addBooleanOption((o) =>
            o
                .setName('bloquear')
                .setDescription('true = bloquear comandos · false = liberar')
                .setRequired(true)
        )
        .addChannelOption((o) =>
            o
                .setName('canal')
                .setDescription('Canal (opcional: usa o atual)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        )
        .addChannelOption((o) =>
            o
                .setName('canal_comandos')
                .setDescription('Opcional: define o #comandos para redirecionar')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão (**Gerenciar Canais**).');
        }

        if (['canal', 'comandos', 'canal-comandos'].includes((args[0] || '').toLowerCase())) {
            const ch =
                message.mentions.channels.first() ||
                message.guild.channels.cache.get(args[1]);
            if (!ch) return message.reply('Uso: `O.bloquearcomandos canal #comandos`');
            cmdLock.setCommandsChannel(message.guild.id, ch.id);
            return message.reply(`📌 Canal de comandos definido: ${ch}`);
        }

        const raw = (args[0] || '').toLowerCase();
        const trueVals = ['true', '1', 'on', 'sim', 'bloquear', 'yes', 's'];
        const falseVals = ['false', '0', 'off', 'nao', 'não', 'liberar', 'no', 'n'];

        if (!trueVals.includes(raw) && !falseVals.includes(raw)) {
            return message.reply(
                'Uso: `O.bloquearcomandos true [#canal]` · `O.bloquearcomandos false [#canal]`\n' +
                    '**true** = bloqueia comandos · **false** = libera\n' +
                    'Canal de redirecionamento: `O.bloquearcomandos canal #comandos`'
            );
        }

        const lock = trueVals.includes(raw);
        const ch =
            message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[1]) ||
            message.channel;

        cmdLock.setLocked(message.guild.id, ch.id, lock);
        const hint = cmdLock.redirectHint(message.guild.id);

        if (lock) {
            return message.reply(
                `🔒 Comandos **bloqueados** em ${ch} (\`true\`).\n` +
                    `Mensagens de usuários e de **qualquer bot** serão apagadas.\n` +
                    hint
            );
        }
        return message.reply(`🔓 Comandos **liberados** em ${ch} (\`false\`).`);
    },

    async executeSlash(i) {
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão (**Gerenciar Canais**).',
                flags: 64
            });
        }

        const lock = i.options.getBoolean('bloquear', true);
        const ch = i.options.getChannel('canal') || i.channel;
        const redirect = i.options.getChannel('canal_comandos');

        if (redirect) {
            cmdLock.setCommandsChannel(i.guild.id, redirect.id);
        }

        cmdLock.setLocked(i.guild.id, ch.id, lock);
        const hint = cmdLock.redirectHint(i.guild.id);

        if (lock) {
            return i.reply({
                content:
                    `🔒 Comandos **bloqueados** em ${ch} (\`true\`).\n` +
                    `Mensagens de usuários e de **qualquer bot** serão apagadas.\n` +
                    hint +
                    (redirect ? `\n📌 Redirecionamento: ${redirect}` : ''),
                flags: 64
            });
        }
        return i.reply({
            content:
                `🔓 Comandos **liberados** em ${ch} (\`false\`).` +
                (redirect ? `\n📌 Redirecionamento: ${redirect}` : ''),
            flags: 64
        });
    }
};
