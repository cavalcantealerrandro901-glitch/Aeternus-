const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { needVoice, voiceState, COLOR } = require('../systems/music');

module.exports = {
    name: 'tocando',
    aliases: ['np', 'nowplaying', 'now'],
    description: 'Música atual',
    data: new SlashCommandBuilder().setName('tocando').setDescription('Música que está tocando'),

    async execute(message) {
        const err = needVoice(message, { queueNeed: true });
        if (err) return message.reply(err);
        const { queue } = voiceState(message);
        const song = queue.songs[0];
        if (!song) return message.reply('Nada tocando.');
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('🎵 Tocando agora')
            .setDescription(`[**${song.name}**](${song.url})`)
            .addFields(
                { name: 'Duração', value: song.formattedDuration || '—', inline: true },
                { name: 'Pedido por', value: `${song.user || '—'}`, inline: true },
                { name: 'Volume', value: `${queue.volume}%`, inline: true }
            );
        if (song.thumbnail) emb.setThumbnail(song.thumbnail);
        await message.reply({ embeds: [emb] });
    },

    async executeSlash(i) {
        const err = needVoice(i, { queueNeed: true });
        if (err) return i.reply({ content: err, ephemeral: true });
        const { queue } = voiceState(i);
        const song = queue.songs[0];
        if (!song) return i.reply({ content: 'Nada tocando.', ephemeral: true });
        const emb = new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('🎵 Tocando agora')
            .setDescription(`[**${song.name}**](${song.url})`)
            .addFields(
                { name: 'Duração', value: song.formattedDuration || '—', inline: true },
                { name: 'Pedido por', value: `${song.user || '—'}`, inline: true },
                { name: 'Volume', value: `${queue.volume}%`, inline: true }
            );
        if (song.thumbnail) emb.setThumbnail(song.thumbnail);
        await i.reply({ embeds: [emb] });
    }
};
