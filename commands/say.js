const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'say',
    aliases: ['falar', 'dizer'],
    description: 'Enviar uma mensagem como o Aeternus',
    data: new SlashCommandBuilder()
        .setName('mensagem')
        .setDescription('Ferramentas para publicar mensagens')
        .addSubcommand((sub) =>
            sub
                .setName('envia')
                .setDescription('Publica uma mensagem como o bot')
                .addStringOption((o) =>
                    o.setName('mensagem')
                        .setDescription('Texto da mensagem (menções não serão notificadas)')
                        .setRequired(true)
                        .setMaxLength(2000)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ Sem permissão.');
        }
        const text = args.join(' ').trim().slice(0, 2000);
        if (!text) return message.reply('❌ Escreva a mensagem que deseja publicar.');
        await message.delete().catch(() => {});
        await message.channel.send({ content: text, allowedMentions: { parse: [] } });
        return;
    },

    async executeSlash(i) {
        if (!i.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            return i.reply({ content: '❌ Sem permissão (Gerenciar Mensagens).', ephemeral: true });
        }
        const text = i.options.getString('mensagem', true).trim().slice(0, 2000);
        if (!text) return i.reply({ content: '❌ A mensagem não pode estar vazia.', ephemeral: true });
        await i.channel.send({ content: text, allowedMentions: { parse: [] } });
        await i.reply({ content: '✅ Mensagem publicada. Menções foram desativadas para evitar notificações acidentais.', ephemeral: true });
    }
};
