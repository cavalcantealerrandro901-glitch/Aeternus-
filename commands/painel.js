const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shop = require('../utils/shop');

module.exports = {
    name: 'painel',
    aliases: ['dashboard', 'panel', 'site'],
    description: 'Link do painel web',
    async execute(message) {
        const url = shop.dashboardPanelUrl();
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('🌐  Painel Aeternus')
                    .setDescription(
                        [
                            'Controle o servidor, colete o **daily**, veja **Éter** e **XP**.',
                            '',
                            'Abra com o botão abaixo (login Discord).'
                        ].join('\n')
                    )
                    .setFooter({ text: 'Control Center MAX' })
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Abrir painel')
                        .setEmoji('✨')
                        .setStyle(ButtonStyle.Link)
                        .setURL(url),
                    new ButtonBuilder()
                        .setLabel('Decorações')
                        .setEmoji('🎨')
                        .setStyle(ButtonStyle.Link)
                        .setURL(shop.decorPanelUrl(message.guild?.id))
                )
            ]
        });
    }
};
