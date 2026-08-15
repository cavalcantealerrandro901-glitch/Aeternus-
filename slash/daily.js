const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getRandomPhrase } = require('../utils/phrases');
const { createDailyImage } = require('../utils/imageGenerator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Resgata sua recompensa diária de almas'),
    async execute(interaction, client) {
        const guildIcon = interaction.guild.iconURL({ extension: 'png', size: 512 });
        const botAvatar = client.user.displayAvatarURL({ extension: 'png', size: 512 });
        const imageBuffer = await createDailyImage(guildIcon, botAvatar);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'daily-panel.png' });

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('💀 Painel de Recompensa Diária')
            .setDescription(`✨ *"${getRandomPhrase()}"*\n\nClique no botão abaixo para coletar suas almas diárias!`)
            .setImage('attachment://daily-panel.png')
            .setFooter({ text: 'Sistema de Recompensas Aeternus' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('daily_claim')
                .setLabel('🎁 Coletar Recompensa Diária')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            embeds: [embed],
            files: [attachment],
            components: [row]
        });
    }
};
