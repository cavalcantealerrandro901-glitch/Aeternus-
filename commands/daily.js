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

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfbbf24)
                    .setTitle('❄️ Daily coletado')
                    .setDescription(
                        [
                            `Você recebeu **${flocos.format(result.amount)}**`,
                            `🔥 Sequência **${result.streak}** · ×**${result.multiplier.toFixed(2)}**`,
                            `💼 Saldo: ${flocos.format(result.balance)}`,
                            '',
                            '🎨 Quer uma **imagem de fundo** no perfil? Abra as decorações.'
                        ].join('\n')
                    )
                    .setFooter({ text: 'Decorações · imagens reais no painel' })
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
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });
    }
};
