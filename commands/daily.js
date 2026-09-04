const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const shop = require('../utils/shop');
const dailyUtil = require('../utils/daily');

module.exports = {
    name: 'daily',
    aliases: ['diario', 'recompensa'],
    description: 'Recompensa diária',
    data: new SlashCommandBuilder().setName('daily').setDescription('Recompensa diária'),

    async execute(message) {
        const panelUrl =
            shop.dailyPanelUrl?.(message.guild?.id) ||
            shop.panelUrl?.(message.guild?.id) ||
            'https://aeternus.onrender.com/daily';
        let claimed = false;
        try {
            claimed = !!dailyUtil?.hasClaimed?.(message.author.id);
        } catch (_) {}

        const emb = new EmbedBuilder()
            .setColor(0xf97316)
            .setTitle('Daily')
            .setDescription(
                claimed
                    ? 'Você já coletou hoje.\nAbra o painel para ver o status.'
                    : 'Colete sua recompensa no painel Daily.'
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(claimed ? 'Abrir Daily' : 'Coletar')
                .setStyle(ButtonStyle.Link)
                .setURL(panelUrl),
            new ButtonBuilder()
                .setCustomId('daily:saldo')
                .setLabel('Saldo')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.reply({ embeds: [emb], components: [row] });
    },

    async executeSlash(interaction) {
        const panelUrl =
            shop.dailyPanelUrl?.(interaction.guild?.id) ||
            shop.panelUrl?.(interaction.guild?.id) ||
            'https://aeternus.onrender.com/daily';
        let claimed = false;
        try {
            claimed = !!dailyUtil?.hasClaimed?.(interaction.user.id);
        } catch (_) {}

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf97316)
                    .setTitle('Daily')
                    .setDescription(
                        claimed
                            ? 'Você já coletou hoje.\nAbra o painel para ver o status.'
                            : 'Colete sua recompensa no painel Daily.'
                    )
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel(claimed ? 'Abrir Daily' : 'Coletar')
                        .setStyle(ButtonStyle.Link)
                        .setURL(panelUrl),
                    new ButtonBuilder()
                        .setCustomId('daily:saldo')
                        .setLabel('Saldo')
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });
    },

    async handleComponent(interaction) {
        if (interaction.customId !== 'daily:saldo') return;
        const e = eter.get(interaction.user.id);
        const xp = require('../utils/xp');
        const x = xp.get(interaction.user.id);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf97316)
                    .setTitle('Carteira')
                    .setDescription(
                        `✨ **${eter.formatPlain(e)}** éter\nNível **${x.level || 0}** · XP **${eter.formatPlain(x.xp || 0)}**`
                    )
            ],
            ephemeral: true
        });
    }
};
