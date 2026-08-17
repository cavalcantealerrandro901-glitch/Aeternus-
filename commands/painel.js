const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'painel',
    description: 'Acesse o painel de controle do Aeternus',
    async execute(message, args) {
        const linkPainel = 'https://aeternus-q7gt.onrender.com'; 

        const embed = new EmbedBuilder()
            .setTitle('Aeternus - Painel de Controle')
            .setDescription('Clique no botão abaixo para acessar o seu painel de gerenciamento no navegador.')
            .setColor('#38bdf8')
            .setThumbnail(message.client.user.displayAvatarURL());

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Acessar Painel')
                    .setStyle(ButtonStyle.Link)
                    .setURL(linkPainel)
            );

        await message.reply({ embeds: [embed], components: [row] });
    },
};
