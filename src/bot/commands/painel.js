const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');

function panelBaseUrl() {
    return (
        process.env.PANEL_URL ||
        (process.env.REDIRECT_URI
            ? process.env.REDIRECT_URI.replace(/\/auth\/discord\/callback\/?$/, '')
            : null) ||
        'https://aeternus-q7gt.onrender.com'
    ).replace(/\/$/, '');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Link do painel web do Aeternus (use o prefixo)'),

    aliases: ['panel', 'dashboard', 'site'],

    async execute(interaction) {
        await interaction.reply({
            content: 'Use o prefixo: `!painel`',
            ephemeral: true
        });
    },

    async executePrefix(message) {
        const base = panelBaseUrl();
        const bot = message.client.user;
        const avatar = bot.displayAvatarURL({ size: 256, extension: 'png' });

        let canEditor = false;
        try {
            canEditor = await db.canAccessEditor(message.author.id);
        } catch {}

        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setAuthor({ name: bot.username, iconURL: avatar })
            .setThumbnail(avatar)
            .setTitle('🌐 Painel Web — Aeternus')
            .setDescription(
                'Acesse o painel para configurar servidores, logs, tickets, economia e mais.\n\n' +
                `🔗 **URL:** ${base}\n` +
                (canEditor
                    ? `🛠️ Você tem acesso ao **Editor**: ${base}/editor`
                    : '🛠️ Editor: apenas dono ou quem recebeu `!editorperm`.')
            )
            .setFooter({ text: 'Faça login com Discord no painel' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Abrir Painel')
                .setStyle(ButtonStyle.Link)
                .setURL(base),
            new ButtonBuilder()
                .setLabel('Login Discord')
                .setStyle(ButtonStyle.Link)
                .setURL(`${base}/login`)
        );

        if (canEditor) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Editor')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`${base}/editor`)
            );
        }

        await message.reply({ embeds: [embed], components: [row] });
    }
};
