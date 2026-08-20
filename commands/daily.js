const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'daily',
    aliases: ['diario'],
    description: 'Redireciona para a coleta da recompensa diária no painel web.',
    async execute(message) {
        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000/dashboard';

        const embed = new EmbedBuilder()
            .setColor('#38bdf8')
            .setTitle('🎁 Recompensa Diária (Daily)')
            .setDescription('As recompensas diárias agora são resgatadas diretamente pelo nosso **Painel Web**!\n\nClique no botão abaixo para ir ao painel e garantir seus Cristais.')
            .setFooter({ text: 'Aeternus Economy • Painel Web' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Coletar no Painel')
                .setStyle(ButtonStyle.Link)
                .setURL(dashboardUrl)
                .setEmoji('🌐')
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
