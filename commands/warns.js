const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');

module.exports = {
    name: 'warns',
    aliases: ['avisos'],
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const list = store.load('warns.json', {})[`${message.guild.id}:${user.id}`] || [];
        if (!list.length) return message.reply(`${user.username} não possui avisos.`);
        const lines = list.slice(-10).map((w, i) => `**${i + 1}.** ${w.reason} — <t:${Math.floor(w.at / 1000)}:R>`);
        await message.reply({
            embeds: [new EmbedBuilder().setColor(0xeab308).setTitle(`⚠️ Avisos — ${user.username}`).setDescription(lines.join('\n'))]
        });
    }
};
