const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

module.exports = {
    name: 'tocar',
    aliases: ['play', 'p', 'musica'],
    description: 'Tocar música (Lavalink)',
    data: new SlashCommandBuilder()
        .setName('tocar')
        .setDescription('Tocar música')
        .addStringOption((o) =>
            o.setName('busca').setDescription('Nome ou URL').setRequired(true)
        ),

    async execute(message, args) {
        const query = args.join(' ').trim();
        if (!query) return message.reply('Uso: `O.tocar <nome ou url>`');
        try {
            await message.channel.sendTyping();
            const res = await music.play(message, query);
            if (res.started) {
                const t = res.track;
                const emb = new EmbedBuilder()
                    .setColor(music.COLOR)
                    .setTitle('🎵 Tocando')
                    .setDescription(`[**${t.title}**](${t.uri || '#'})`)
                    .addFields(
                        { name: 'Duração', value: music.formatMs(t.length), inline: true },
                        { name: 'Fila', value: String(res.added), inline: true }
                    );
                if (t.artwork) emb.setThumbnail(t.artwork);
                await message.reply({ embeds: [emb] });
            } else {
                await message.reply(
                    `➕ **${res.track.title}** (+${res.added}) na fila.`
                );
            }
        } catch (e) {
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(music.COLOR_ERR)
                        .setTitle('❌ Música')
                        .setDescription(String(e.message || e).slice(0, 500))
                ]
            });
        }
    },

    async executeSlash(i) {
        const query = i.options.getString('busca', true);
        await i.deferReply();
        try {
            const res = await music.play(i, query);
            if (res.started) {
                const t = res.track;
                const emb = new EmbedBuilder()
                    .setColor(music.COLOR)
                    .setTitle('🎵 Tocando')
                    .setDescription(`[**${t.title}**](${t.uri || '#'})`)
                    .addFields(
                        { name: 'Duração', value: music.formatMs(t.length), inline: true },
                        { name: 'Fila', value: String(res.added), inline: true }
                    );
                if (t.artwork) emb.setThumbnail(t.artwork);
                await i.editReply({ embeds: [emb] });
            } else {
                await i.editReply(`➕ **${res.track.title}** (+${res.added}) na fila.`);
            }
        } catch (e) {
            await i.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(music.COLOR_ERR)
                        .setTitle('❌ Música')
                        .setDescription(String(e.message || e).slice(0, 500))
                ]
            });
        }
    }
};
