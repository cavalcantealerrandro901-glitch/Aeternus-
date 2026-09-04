const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'say',
    aliases: ['falar', 'dizer'],
    description: 'Fazer o bot falar',
    data: new SlashCommandBuilder()
        .setName('enviar-mensagem')
        .setDescription('Enviar mensagem')
        .addStringOption((o) =>
            o.setName('mensagem').setDescription('Texto').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ Sem permissão.');
        }
        const text = args.join(' ');
        if (!text) return message.reply('❌ Escreva a mensagem.');
        await message.delete().catch(() => {});
        await message.channel.send(text.slice(0, 2000));
    },

    async executeSlash(i) {
        const text = i.options.getString('mensagem', true).slice(0, 2000);
        await i.reply({ content: '✅', ephemeral: true });
        await i.channel.send(text);
    }
};
