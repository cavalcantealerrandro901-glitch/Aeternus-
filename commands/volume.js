const { EmbedBuilder } = require('discord.js');
const music = require('../utils/music');

module.exports = {
    name: 'volume',
    aliases: ['vol', 'som'],
    description: 'Define o volume (0-150)',
    async execute(message, args) {
        if (!args[0]) {
            const v = music.getQueueView(message.guild.id);
            return message.reply(`🔊 Volume atual: **${v.volume}%**`);
        }
        const n = parseInt(args[0], 10);
        if (!Number.isFinite(n) || n < 0 || n > 150) {
            return message.reply('Use um número de **0** a **150**.');
        }
        const vol = music.setVolume(message.guild.id, n);
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setDescription(`🔊 Volume definido para **${vol}%**\n_Vale na próxima faixa se a atual já estiver tocando._`)
            ]
        });
    }
};
