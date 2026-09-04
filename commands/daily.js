const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const daily = require('../utils/daily');
const shop = require('../utils/shop');

module.exports = {
    name: 'daily',
    aliases: ['diario'],
    description: 'Recompensa diária',
    data: new SlashCommandBuilder().setName('diario').setDescription('Recompensa diaria'),

    async execute(message) {
        const st = daily.status(message.author.id, message.guild?.id);
        const panelUrl = shop.dashboardPanelUrl?.() || shop.panelUrl?.(message.guild?.id) || 'https://aeternus.onrender.com';
        const claimed = !!st.claimed;
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(claimed ? 0xf59e0b : 0x22c55e)
                    .setTitle('Daily')
                    .setDescription(
                        claimed
                            ? 'Você já resgatou o daily de hoje.\nAbra o painel para ver detalhes.'
                            : 'Resgate disponível no painel web.'
                    )
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('Abrir daily').setStyle(ButtonStyle.Link).setURL(panelUrl)
                )
            ]
        });
    },

    async executeSlash(i) {
        const st = daily.status(i.user.id, i.guild?.id);
        const panelUrl = shop.dashboardPanelUrl?.() || shop.panelUrl?.(i.guild?.id) || 'https://aeternus.onrender.com';
        const claimed = !!st.claimed;
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(claimed ? 0xf59e0b : 0x22c55e)
                    .setTitle('Daily')
                    .setDescription(
                        claimed
                            ? 'Você já resgatou o daily de hoje.'
                            : 'Resgate disponível no painel web.'
                    )
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('Abrir daily').setStyle(ButtonStyle.Link).setURL(panelUrl)
                )
            ]
        });
    }
};
