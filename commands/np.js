const { EmbedBuilder } = require('discord.js');
const music = require('../utils/music');

module.exports = {
    name: 'np',
    aliases: ['now', 'tocando', 'agora'],
    description: 'Mostra a música que está tocando',

    async execute(message, args, client) {
        const connection = client.voice.connections.get(message.guild.id);
        if (!connection) {
            return message.reply('❌ Não há nada tocando no momento.');
        }

        const queue = music.getQueue(message.guild.id);
        if (queue.length === 0) {
            return message.reply('❌ Nenhuma música na fila.');
        }

        const currentSong = queue[0];
        const duration = `${Math.floor(currentSong.duration / 60)}:${(currentSong.duration % 60).toString().padStart(2, '0')}`;

        const embed = new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle('🎵 Tocando agora')
            .setDescription(`[${currentSong.title}](${currentSong.url})`)
            .addFields(
                { name: 'Duração', value: duration, inline: true },
                { name: 'Próximas na fila', value: queue.length > 1 ? queue.length - 1 : 0, inline: true }
            )
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
