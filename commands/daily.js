const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const daily = require('../utils/daily');
const flocos = require('../utils/flocos');
const shop = require('../utils/shop');

module.exports = {
    name: 'daily',
    aliases: ['diario'],
    description: 'Coleta a recompensa diária',
    async execute(message) {
        const result = daily.claim(message.author.id, message.guild.id);
        if (!result.ok) return message.reply(`❄️ ${result.error}`);

        const decorUrl = shop.decorPanelUrl(message.guild.id);
        const streakFire = result.streak >= 7 ? '🔥🔥🔥' : result.streak >= 3 ? '🔥🔥' : '🔥';

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfbbf24)
                    .setAuthor({
                        name: `${message.author.username} · Daily`,
                        iconURL: message.author.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('❄️  Daily coletado!')
                    .setDescription(
                        [
                            '```',
                            '  ╔══════════════════════════╗',
                            '  ║   RECOMPENSA DO DIA      ║',
                            '  ╚══════════════════════════╝',
                            '```',
                            `Você recebeu **${flocos.format(result.amount)}**`,
                            `${streakFire} Sequência **${result.streak}** dia(s) · multiplicador **×${result.multiplier.toFixed(2)}**`,
                            '',
                            `💼 Saldo atual: **${flocos.format(result.balance)}**`,
                            '',
                            '🎨 Personalize seu perfil com decorações exclusivas no painel.'
                        ].join('\n')
                    )
                    .setFooter({ text: 'Volte amanhã · sequência aumenta a recompensa' })
                    .setTimestamp()
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Ver decorações')
                        .setEmoji('🎨')
                        .setStyle(ButtonStyle.Link)
                        .setURL(decorUrl),
                    new ButtonBuilder()
                        .setCustomId('loja:perfil')
                        .setLabel('Meu perfil')
                        .setEmoji('🖼️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('daily:saldo')
                        .setLabel('Ver saldo')
                        .setEmoji('💎')
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });
    },

    async handleComponent(interaction) {
        if (interaction.customId !== 'daily:saldo') return;
        const flocos = require('../utils/flocos');
        const cristais = require('../utils/cristais');
        const f = flocos.get(interaction.user.id);
        const c = cristais.get(interaction.user.id);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setTitle('💎 Sua carteira')
                    .setDescription(
                        `❄️ **${flocos.formatPlain(f)}** flocos\n💠 **${cristais.formatPlain(c)}** cristais`
                    )
            ],
            ephemeral: true
        });
    }
};
