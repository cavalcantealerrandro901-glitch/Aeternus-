const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const daily = require('../utils/daily');
const eter = require('../utils/eter');
const shop = require('../utils/shop');

module.exports = {
    name: 'daily',
    aliases: ['diario'],
    description: 'Abre a página do Daily (Novel MAX)',

    async execute(message) {
        const st = daily.status(message.author.id, message.guild?.id);
        const panelUrl = shop.dailyPanelUrl(message.guild?.id);

        const claimed = !!st.claimed;
        const streakFire = st.streak >= 7 ? '🔥🔥🔥' : st.streak >= 3 ? '🔥🔥' : '🔥';

        const emb = new EmbedBuilder()
            .setColor(claimed ? 0x9a3412 : 0xf97316)
            .setAuthor({
                name: `${message.author.username} · Daily`,
                iconURL: message.author.displayAvatarURL({ size: 64 })
            })
            .setTitle(claimed ? 'Daily já coletado' : 'Daily · Novel MAX')
            .setDescription(
                [
                    '```',
                    '  ╔═══════════════════════════╗',
                    '  ║   DAILY  ·  NOVEL MAX    ║',
                    '  ╚═══════════════════════════╝',
                    '```',
                    claimed
                        ? 'Você **já coletou** hoje. Volte amanhã.'
                        : 'A coleta é **somente na página laranja do Daily**.',
                    '',
                    `${streakFire} Sequência: **${st.streak || 0}** dia(s)`,
                    claimed ? null : `Próxima sequência: **${st.nextStreak || 1}**`,
                    `Multiplicador: **×${Number(st.multiplier || 1).toFixed(2)}**`,
                    `Saldo: **${eter.formatPlain(st.balance)}** éter`,
                    '',
                    'Clique no botão para abrir a **página Novel MAX**.'
                ]
                    .filter((x) => x != null)
                    .join('\n')
            )
            .setFooter({ text: 'Daily · Novel MAX · Aeternus' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(claimed ? 'Abrir Daily' : 'Coletar no Daily')
                .setEmoji('✨')
                .setStyle(ButtonStyle.Link)
                .setURL(panelUrl),
            new ButtonBuilder()
                .setCustomId('daily:saldo')
                .setLabel('Ver saldo')
                .setEmoji('💼')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.reply({ embeds: [emb], components: [row] });
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
                    .setTitle('Sua carteira')
                    .setDescription(
                        `**${eter.formatPlain(e)}** éter\nNível **${x.level || 0}** · XP **${eter.formatPlain(x.xp || 0)}**`
                    )
            ],
            ephemeral: true
        });
    }
};
