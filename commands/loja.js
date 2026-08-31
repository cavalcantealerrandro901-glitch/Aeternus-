const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const shop = require('../utils/shop');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function shopEmbed(user) {
    return new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setAuthor({ name: 'Aeternus Boutique' })
        .setTitle('🛒  Loja Aeternus')
        .setDescription(
            [
                `👤 ${user}`,
                `❄️ **${fmt(flocos.get(user.id))}** · 💠 **${fmt(cristais.get(user.id))}**`,
                '',
                'As compras são feitas no **painel web**:',
                '🎨 **Decorações** — imagens de fundo do perfil',
                '🎁 **Itens** — títulos, boosts, caixas e VIP',
                '',
                'Use os botões abaixo para abrir a loja no navegador.'
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'Compre no painel · sincronizado com o bot' })
        .setTimestamp();
}

function rows(guildId) {
    const decor = shop.decorPanelUrl(guildId);
    const itens = shop.itemsPanelUrl(guildId);
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Decorações')
                .setEmoji('🎨')
                .setStyle(ButtonStyle.Link)
                .setURL(decor),
            new ButtonBuilder()
                .setLabel('Itens')
                .setEmoji('🎁')
                .setStyle(ButtonStyle.Link)
                .setURL(itens),
            new ButtonBuilder()
                .setCustomId('loja:perfil_hint')
                .setLabel('Meu perfil')
                .setEmoji('🖼️')
                .setStyle(ButtonStyle.Secondary)
        )
    ];
}

module.exports = {
    name: 'loja',
    aliases: ['shop', 'store', 'buy'],
    description: 'Abre a loja (painel)',
    data: new SlashCommandBuilder().setName('loja').setDescription('Abre a loja no painel'),

    async execute(message) {
        await message.reply({
            embeds: [shopEmbed(message.author)],
            components: rows(message.guild?.id)
        });
    },

    async executeSlash(interaction) {
        await interaction.reply({
            embeds: [shopEmbed(interaction.user)],
            components: rows(interaction.guild?.id)
        });
    },

    async handleComponent(interaction) {
        if (interaction.customId === 'loja:perfil_hint') {
            return interaction.reply({
                content: 'Use `O.perfil` ou `/perfil` para ver o card. Backgrounds: loja de **Decorações** no painel.',
                ephemeral: true
            });
        }
    }
};
