const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDailyCharmPhrase, getDailyTitle } = require('../utils/dailyPhrases');
const { getDailyPageUrl } = require('../utils/panelUrl');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Abre a página do painel para resgatar a recompensa diária'),
    async execute(interaction) {
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

        if (interaction.client.user) {
            embed.setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }));
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Resgatar no painel')
                .setStyle(ButtonStyle.Link)
                .setURL(url)
                .setEmoji('🎁')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
