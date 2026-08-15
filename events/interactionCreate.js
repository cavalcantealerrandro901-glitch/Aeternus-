const { PermissionsBitField, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../utils/database');
const { getRandomPhrase, generatePhrase, getRandomEmoji } = require('../utils/phrases');
const { createDailyImage } = require('../utils/imageGenerator');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // ... (manter o restante do código igual, apenas substitua o bloco do daily)

        if (interaction.customId === 'daily_claim') {
            const userId = interaction.user.id;
            const now = Date.now();
            const cooldown = 6 * 60 * 1000;
            
            // ... (lógica de database de daily igual a anterior)

            // Gerar imagem
            const guildIcon = interaction.guild.iconURL({ extension: 'png', size: 512 });
            const botAvatar = client.user.displayAvatarURL({ extension: 'png', size: 512 });
            const imageBuffer = await createDailyImage(guildIcon, botAvatar);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'daily-reward.png' });

            const successEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`🎉 Recompensa Coletada! ${getRandomEmoji()}`)
                .setImage('attachment://daily-reward.png')
                .setDescription(`✨ *"${getRandomPhrase()}"*`);

            return interaction.update({
                embeds: [successEmbed],
                files: [attachment],
                components: []
            });
        }
        // ...
    }
};
