const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'embed',
    aliases: ['criar-embed'],
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
        const title = i.options.getString('titulo', true);
        const desc = i.options.getString('descricao', true);
        await i.reply({ content: '✅', ephemeral: true });
        await i.channel.send({
            embeds: [new EmbedBuilder().setColor(0xa78bfa).setTitle(title).setDescription(desc)]
        });
    }
};
