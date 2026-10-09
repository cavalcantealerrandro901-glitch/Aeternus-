const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'tocando',
    aliases: ['np', 'nowplaying', 'agora'],
    description: 'Mostra a música atual',

    async execute(message) {
        const q = musicManager.getQueue(message.guild.id);
        if (!q.current) return message.reply('Nada tocando.');
        return message.reply({ embeds: [musicManager.trackEmbed(q.current)] });
    },
};
