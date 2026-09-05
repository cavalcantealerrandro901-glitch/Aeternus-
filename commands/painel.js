const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const shop = require('../utils/shop');

function panelUrl(guildId) {
    return (
        shop.dashboardPanelUrl?.() ||
        shop.panelUrl?.(guildId) ||
        process.env.PANEL_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        'https://aeternus.onrender.com'
    );
}

function build(guildId) {
    const url = panelUrl(guildId);
    const embed = new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('Painel Aeternus')
        .setDescription(
            [
                'Gerencie o servidor pelo navegador.',
                '',
                '**No painel você pode:**',
                '• Configurar módulos e canais',
                '• Ajustar a economia do servidor',
                '• Editar a loja e cargos VIP',
                '• Acompanhar o daily e o progresso'
            ].join('\n')
        )
        .setFooter({ text: 'Use o botão abaixo para abrir' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Abrir painel')
            .setStyle(ButtonStyle.Link)
            .setURL(url.startsWith('http') ? url : `https://${url}`)
    );

    return { embeds: [embed], components: [row] };
}

module.exports = {
    name: 'painel',
    aliases: ['panel', 'dashboard'],
    description: 'Link do painel web',
    data: new SlashCommandBuilder()
        .setName('painel-web')
        .setDescription('Abre o painel web do servidor'),

    async execute(message) {
        await message.reply(build(message.guild?.id));
    },

    async executeSlash(i) {
        await i.reply(build(i.guild?.id));
    }
};
