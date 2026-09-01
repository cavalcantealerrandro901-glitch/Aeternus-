const { EmbedBuilder } = require('discord.js');
const music = require('../utils/music');

module.exports = {
    name: 'queue',
    aliases: ['fila', 'q'],
    description: 'Mostra a fila de músicas',

    async execute(message) {
        const view = music.getQueueView(message.guild.id);
        if (!view.current && !view.queue.length) {
            return message.reply('❌ A fila está vazia.');
        }

        const lines = [];
        if (view.current) {
            lines.push(
                `**▶ Agora:** [${view.current.title}](${view.current.url}) \`${music.fmtDuration(view.current.duration)}\``
            );
            lines.push('');
        }
        view.queue.slice(0, 12).forEach((song, i) => {
            lines.push(
                `**${i + 1}.** [${song.title}](${song.url}) \`${music.fmtDuration(song.duration)}\``
            );
        });
        if (view.queue.length > 12) {
            lines.push(`_…e mais ${view.queue.length - 12}_`);
        }

        const loopLabel =
            view.loop === 'track' ? 'faixa' : view.loop === 'queue' ? 'fila' : 'off';

        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('🎵  Fila de músicas')
                    .setDescription(lines.join('\n'))
                    .setFooter({
                        text: `${view.queue.length} na fila · loop ${loopLabel} · vol ${view.volume}%`
                    })
                    .setTimestamp()
            ]
        });
    }
};
