const { EmbedBuilder } = require('discord.js');
const music = require('../utils/music');

module.exports = {
    name: 'queue',
    aliases: ['fila', 'q'],
    description: 'Mostra a fila de música',

    async execute(message, args, client) {
        const queue = music.getQueue(message.guild.id);

        if (queue.length === 0) {
            return message.reply('❌ A fila está vazia.');
        }

        const queueList = queue
            .slice(0, 10)
            .map((song, index) => {
                const duration = `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`;
                return `**${index + 1}.** [${song.title}](${song.url}) \`${duration}\``;
            })
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle('🎵 Fila de Música')
            .setDescription(queueList)
            .setFooter({
                text: `Total: ${queue.length} música${queue.length !== 1 ? 's' : ''}`
            })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
