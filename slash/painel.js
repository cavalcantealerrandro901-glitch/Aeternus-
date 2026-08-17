const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painel')
        .setDescription('Acesse o painel de controle do Aeternus'),
    
    async execute(interaction) {
        const linkPainel = 'https://aeternus-q7gt.onrender.com'; 

        const embed = new EmbedBuilder()
            .setTitle('Aeternus - Painel de Controle')
            .setDescription('Clique no botão abaixo para acessar o seu painel de gerenciamento no navegador.')
            .setColor('#38bdf8')
            .setThumbnail(interaction.client.user.displayAvatarURL());

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Acessar Painel')
                    .setStyle(ButtonStyle.Link)
                    .setURL(linkPainel)
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [row], 
            flags: [MessageFlags.Ephemeral] 
        });
    },
};
