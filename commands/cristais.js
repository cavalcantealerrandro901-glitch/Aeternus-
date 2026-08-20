const { EmbedBuilder } = require('discord.js');
const cristais = require('../utils/cristais');

module.exports = {
    name: 'cristais',
    aliases: ['cristal', 'gelo', 'ice'],
    description: 'Mostra seus cristais de gelo 🧊',
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const bal = cristais.get(target.id);

        const embed = new EmbedBuilder()
            .setColor(0x67e8f9)
            .setTitle(`${cristais.EMOJI} Cristais de gelo`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription(
                `Cofre de **${target.username}**\n\n${cristais.format(bal)}`
            )
            .setFooter({ text: 'Moeda especial do Aeternus' });

        await message.reply({ embeds: [embed] });
    }
};
