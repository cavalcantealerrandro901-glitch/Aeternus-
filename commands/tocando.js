const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'tocando',
    aliases: ['np', 'nowplaying'],
    description: 'Música atual',
    data: new SlashCommandBuilder().setName('tocando').setDescription('Música atual'),

    async execute(message) {
        const p = music.queueInfo(message.guild.id);
        if (!p.current) return message.reply('Nada tocando.');
        const t = p.current;
        const emb = new EmbedBuilder()
            .setColor(music.COLOR)
            .setTitle('🎵 Tocando agora')
            .setDescription(`[**${t.title}**](${t.uri || '#'})`)
            .addFields(
                { name: 'Duração', value: music.formatMs(t.length), inline: true },
                { name: 'Pedido por', value: t.requester || '—', inline: true },
                { name: 'Volume', value: `${p.volume}%`, inline: true }
            );
        if (t.artwork) emb.setThumbnail(t.artwork);
        await message.reply({ embeds: [emb] });
    },

    async executeSlash(i) {
        const p = music.queueInfo(i.guild.id);
        if (!p.current) return i.reply({ content: 'Nada tocando.', ephemeral: true });
        const t = p.current;
        const emb = new EmbedBuilder()
            .setColor(music.COLOR)
            .setTitle('🎵 Tocando agora')
            .setDescription(`[**${t.title}**](${t.uri || '#'})`)
            .addFields(
                { name: 'Duração', value: music.formatMs(t.length), inline: true },
                { name: 'Pedido por', value: t.requester || '—', inline: true },
                { name: 'Volume', value: `${p.volume}%`, inline: true }
            );
        if (t.artwork) emb.setThumbnail(t.artwork);
        await i.reply({ embeds: [emb] });
    }
};
