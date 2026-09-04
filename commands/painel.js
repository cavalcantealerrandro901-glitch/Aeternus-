const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const shop = require('../utils/shop');

module.exports = {
    name: 'painel',
    aliases: ['panel', 'dashboard'],
    description: 'Link do painel',
    data: new SlashCommandBuilder().setName('painel').setDescription('Link do painel'),

    async execute(message) {
        const url = shop.panelUrl?.(message.guild?.id) || 'https://aeternus.onrender.com';
        await message.reply({
            content: 'Painel do servidor',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('Abrir painel').setStyle(ButtonStyle.Link).setURL(url)
                )
            ]
        });
    },

    async executeSlash(i) {
        const url = shop.panelUrl?.(i.guild?.id) || 'https://aeternus.onrender.com';
        await i.reply({
            content: 'Painel do servidor',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('Abrir painel').setStyle(ButtonStyle.Link).setURL(url)
                )
            ]
        });
    }
};
