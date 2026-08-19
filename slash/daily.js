const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getDailyCharmPhrase, getDailyTitle } = require('../utils/dailyPhrases');
const { getDailyPageUrl } = require('../utils/panelUrl');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Link charmoso para a recompensa diária no painel'),
    async execute(interaction) {
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

        if (interaction.client.user) {
            embed.setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }));
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Pegar recompensa diária')
                .setStyle(ButtonStyle.Link)
                .setURL(url)
                .setEmoji('🎁')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
