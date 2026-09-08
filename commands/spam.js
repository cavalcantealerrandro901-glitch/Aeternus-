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
    description: 'Permitir ou bloquear spam em um canal',
    data: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('true = canal livre (spam ok) · false = anti-spam ligado')
        .addBooleanOption((o) =>
            o
                .setName('permitir')
                .setDescription('true = spam permitido · false = spam bloqueado')
                .setRequired(true)
        )
        .addChannelOption((o) =>
            o
                .setName('canal')
                .setDescription('Canal (opcional: usa o atual)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(message, args) {
        if (!isMod(message.member)) {
            return message.reply('Sem permissão (**Gerenciar Servidor**).');
        }

        const raw = (args[0] || '').toLowerCase();
        const trueVals = ['true', '1', 'on', 'sim', 'ativar', 'yes', 's'];
        const falseVals = ['false', '0', 'off', 'nao', 'não', 'desativar', 'no', 'n'];

        if (!trueVals.includes(raw) && !falseVals.includes(raw)) {
            return message.reply(
                'Uso: `O.spam true [#canal]` · `O.spam false [#canal]`\n' +
                    '**true** = spam permitido · **false** = anti-spam ligado'
            );
        }

        const allow = trueVals.includes(raw);
        const ch =
            message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[1]) ||
            message.channel;

        if (allow) {
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
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão (**Gerenciar Servidor**).',
                flags: 64
            });
        }

        const allow = i.options.getBoolean('permitir', true);
        const ch = i.options.getChannel('canal') || i.channel;

        if (allow) {
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
