const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDailyCharmPhrase, getDailyTitle } = require('../utils/dailyPhrases');
const { getDailyPageUrl } = require('../utils/panelUrl');

module.exports = {
    name: 'daily',
    description: 'Abre o link da recompensa diária no painel',
    async execute(message) {
        const url = getDailyPageUrl();
        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle(getDailyTitle())
            .setDescription(getDailyCharmPhrase())
            .addFields({
                name: '🔗 Portal',
                value: `[Abrir recompensa diária](${url})\n\`${url}\``
            })
            .setFooter({ text: 'Aeternus · 5.000 a 50.000 almas · 1x por dia' })
            .setTimestamp();

        if (message.client.user) {
            embed.setThumbnail(message.client.user.displayAvatarURL({ size: 256 }));
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Pegar recompensa diária')
                .setStyle(ButtonStyle.Link)
                .setURL(url)
                .setEmoji('🎁')
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
