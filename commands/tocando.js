const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'tocando',
    aliases: ['np', 'nowplaying', 'agora'],
    description: 'Mostra a música atual',
    data: new SlashCommandBuilder().setName('tocando').setDescription('Música tocando agora'),

    async execute(message) {
        const q = musicManager.getQueue(message.guild.id);
        if (!q.current) return message.reply('Nada tocando.');
        return message.reply({ embeds: [musicManager.trackEmbed(q.current)] });
    },
    async executeSlash(i) {
        const q = musicManager.getQueue(i.guild.id);
        if (!q.current) return i.reply({ content: 'Nada tocando.', flags: 64 });
        return i.reply({ embeds: [musicManager.trackEmbed(q.current)] });
    }
};
