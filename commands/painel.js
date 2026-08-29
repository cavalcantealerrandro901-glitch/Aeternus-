const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

function panelBase() {
    if (process.env.PANEL_URL) return process.env.PANEL_URL.replace(/\/$/, '');
    if (process.env.REDIRECT_URI)
        return process.env.REDIRECT_URI.replace(/\/auth\/discord\/callback\/?$/, '');
    return `http://localhost:${process.env.PORT || 10000}`;
}

module.exports = {
    name: 'painel',
    aliases: ['dashboard', 'site', 'web', 'control'],
    description: 'Abre o Control Center do Aeternus',
    async execute(message, args, client) {
        const base = panelBase();
        const bot = client?.user || message.client.user;
        const avatar = bot.displayAvatarURL({ size: 256 });

        const embed = new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setAuthor({
                name: `${bot.username} · Control Center`,
                iconURL: avatar
            })
            .setTitle('🌌 Aeternus Panel')
            .setDescription(
                [
                    'O centro de comando oficial do bot.',
                    '',
                    '✦ **Daily** — colete ❄️ no painel',
                    '✦ **Drops** — requisitos e entradas extras',
                    '✦ **Anti-spam** · Welcome · Logs',
                    '✦ **Economia & XP** — configure o servidor',
                    '',
                    `_Entre com Discord e escolha um servidor onde você é admin._`
                ].join('\n')
            )
            .setThumbnail(avatar)
            .setImage(
                bot.banner
                    ? bot.bannerURL({ size: 512 })
                    : null
            )
            .setFooter({
                text: 'Aeternus · overpowered by design',
                iconURL: avatar
            })
            .setTimestamp();

        // banner null remove field
        if (!bot.banner) embed.setImage(null);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Abrir painel')
                .setStyle(ButtonStyle.Link)
                .setURL(`${base}/dashboard`)
                .setEmoji('✨'),
            new ButtonBuilder()
                .setLabel('Entrar com Discord')
                .setStyle(ButtonStyle.Link)
                .setURL(`${base}/login`)
                .setEmoji('🔐'),
            new ButtonBuilder()
                .setLabel('Página inicial')
                .setStyle(ButtonStyle.Link)
                .setURL(`${base}/`)
                .setEmoji('🏠')
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
