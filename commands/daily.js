const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDailyCharmPhrase, getDailyTitle } = require('../utils/dailyPhrases');
const { getDailyPageUrl } = require('../utils/panelUrl');

module.exports = {
    name: 'daily',
    aliases: ['diario', 'recompensa'],
    description: 'Abre a página do painel para resgatar a recompensa diária',
    async execute(message) {
        const url = getDailyPageUrl();

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle(getDailyTitle())
            .setDescription(getDailyCharmPhrase())
            .addFields({
                name: 'Painel',
                value: `[Abrir página do daily](${url})`
            })
            .setFooter({ text: 'Resgate apenas no painel · 5.000 a 50.000 almas · 1x por dia' })
            .setTimestamp();

        if (message.client.user) {
            embed.setThumbnail(message.client.user.displayAvatarURL({ size: 256 }));
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Resgatar no painel')
                .setStyle(ButtonStyle.Link)
                .setURL(url)
                .setEmoji('🎁')
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
