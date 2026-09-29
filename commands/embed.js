const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'embed',
    aliases: ['criar-embed', 'criarembed'],
    description: 'Criar embed',
    data: new SlashCommandBuilder()
        .setName('criar-embed')
        .setDescription('Criar embed')
        .addStringOption((o) => o.setName('titulo').setDescription('Título').setRequired(true))
        .addStringOption((o) => o.setName('descricao').setDescription('Descrição').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ Sem permissão.');
        }
        const text = args.join(' ');
        if (!text.includes('|')) {
            return message.reply('Uso: `O.embed título | descrição`');
        }
        const [title, ...rest] = text.split('|');
        await message.delete().catch(() => {});
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(title.trim().slice(0, 256))
                    .setDescription(rest.join('|').trim().slice(0, 4000))
            ]
        });
    },

    async executeSlash(i) {
        if (!i.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            const payload = {
                content: '❌ Sem permissão (Gerenciar Mensagens).',
                flags: MessageFlags.Ephemeral
            };
            if (i.deferred || i.replied) return i.editReply(payload).catch(() => {});
            return i.reply(payload).catch(() => {});
        }

        const title = i.options.getString('titulo', true);
        const desc = i.options.getString('descricao', true);

        const embed = new EmbedBuilder()
            .setColor(0xa78bfa)
            .setTitle(String(title).slice(0, 256))
            .setDescription(String(desc).slice(0, 4000));

        await i.channel.send({ embeds: [embed] }).catch(() => {});

        const ok = { content: '✅ Embed enviada.' };
        if (i.deferred || i.replied) {
            return i.editReply(ok).catch(() => {});
        }
        return i.reply({ ...ok, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
};
