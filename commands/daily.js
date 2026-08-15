const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRandomPhrase } = require('../utils/phrases');

module.exports = {
    name: 'daily',
    async execute(message) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('daily_claim')
                .setLabel('🎁 Coletar Recompensa Diária')
                .setStyle(ButtonStyle.Success)
        );

        await message.reply({
            content: `💀 **Painel de Recompensa Diária**\n✨ *"${getRandomPhrase()}"*\n\nClique no botão abaixo para coletar suas almas diárias!`,
            components: [row]
        });
    }
};
