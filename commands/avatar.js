const { EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'avatar',
    aliases: ['av', 'pfp'],
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const url = user.displayAvatarURL({ size: 4096 });
        await message.reply({
            embeds: [new EmbedBuilder().setColor(0x8b5cf6).setTitle(user.username).setImage(url).setURL(url)]
        });
    }
};
