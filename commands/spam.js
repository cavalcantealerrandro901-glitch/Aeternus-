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

function resolveChannel(message, args) {
    return (
        message.mentions.channels.first() ||
        message.guild.channels.cache.get(args.find((a) => /^\d{15,25}$/.test(a))) ||
        message.channel
    );
}

async function apply(guildId, channel, action, reply) {
    const act = String(action || '').toLowerCase();

    if (act === 'ativar' || act === 'on' || act === 'ligar' || act === 'enable') {
        spamAllow.add(guildId, channel.id);
        return reply(
            `✅ Canal livre **ativado** em ${channel}.\nAnti-spam **desligado** neste chat.`
        );
    }

    if (
        act === 'desativar' ||
        act === 'off' ||
        act === 'desligar' ||
        act === 'disable'
    ) {
        spamAllow.remove(guildId, channel.id);
        return reply(
            `🛡️ Canal livre **desativado** em ${channel}.\nAnti-spam **ligado** de novo.`
        );
    }

    const on = spamAllow.toggle(guildId, channel.id);
    if (on) {
        return reply(
            `✅ Canal livre **ativado** em ${channel}.\nAnti-spam **desligado** neste chat.`
        );
    }
    return reply(
        `🛡️ Canal livre **desativado** em ${channel}.\nAnti-spam **ligado** de novo.`
    );
}

module.exports = {
    name: 'spam',
    aliases: ['permitirspam', 'canallivre'],
    description: 'Ativar ou desativar canal livre de anti-spam',
    data: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('Ativar ou desativar canal livre (sem anti-spam)')
        .addStringOption((o) =>
            o
                .setName('acao')
                .setDescription('Ativar ou desativar')
                .setRequired(true)
                .addChoices(
                    { name: 'Ativar (canal livre)', value: 'ativar' },
                    { name: 'Desativar (anti-spam de volta)', value: 'desativar' }
                )
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

        const actionArg = (args[0] || '').toLowerCase();
        const known = ['ativar', 'desativar', 'on', 'off', 'ligar', 'desligar'];
        const action = known.includes(actionArg) ? actionArg : null;
        const ch = resolveChannel(message, args);

        await apply(message.guild.id, ch, action, (t) => message.reply(t));
    },

    async executeSlash(i) {
        if (!isMod(i.member)) {
            return i.reply({
                content: 'Sem permissão (**Gerenciar Servidor**).',
                flags: 64
            });
        }

        const action = i.options.getString('acao', true);
        const ch = i.options.getChannel('canal') || i.channel;

        await apply(i.guild.id, ch, action, (t) =>
            i.reply({ content: t, flags: 64 })
        );
    }
};
