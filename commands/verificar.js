const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');
const { getSettings } = require('../utils/settings');

module.exports = {
    name: 'verificar',
    aliases: ['verificacao', 'verify'],
    description: 'Publica o painel de verificação no canal configurado',
    async execute(message) {
        if (
            !message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('❌ Precisa de **Gerenciar servidor**.');
        }

        const s = getSettings(message.guild.id).verification;
        if (!s?.enabled || !s.roleId) {
            return message.reply(
                '❌ Ative a **Verificação** no painel e defina o cargo liberado.'
            );
        }

        const channel =
            (s.channelId && (await message.guild.channels.fetch(s.channelId).catch(() => null))) ||
            message.channel;

        if (!channel?.isTextBased()) {
            return message.reply('❌ Canal inválido.');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('verify:btn')
                .setLabel(s.buttonLabel || 'Verificar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
        );

        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x34d399)
                    .setTitle('✅ Verificação')
                    .setDescription(
                        s.message ||
                            'Clique no botão abaixo para se verificar e acessar o servidor.'
                    )
                    .setFooter({ text: message.guild.name })
            ],
            components: [row]
        });

        if (channel.id !== message.channel.id) {
            await message.reply(`✅ Painel enviado em ${channel}.`);
        } else {
            await message.reply({ content: '✅ Painel publicado.', allowedMentions: { repliedUser: false } });
        }
    }
};
