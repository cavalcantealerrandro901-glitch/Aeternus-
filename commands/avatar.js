const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    aliases: ['av', 'pfp'],
    description: 'Ver avatar',

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(user.username)
                    .setImage(user.displayAvatarURL({ size: 4096 }))
            ]
        });
    }
};
