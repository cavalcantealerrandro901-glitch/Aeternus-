const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

function build(guildId) {
    const p = music.queueInfo(guildId);
    if (!p.current) return { content: 'Nada tocando no momento.' };
    const t = p.current;
    const emb = new EmbedBuilder()
        .setColor(music.COLOR)
        .setTitle('Tocando agora')
        .setDescription(`[**${t.title}**](${t.uri || t.url || '#'})`)
        .addFields(
            { name: 'Duração', value: music.formatMs(t.length), inline: true },
            { name: 'Pedido por', value: String(t.requester || '\u2014').slice(0, 40), inline: true },
            { name: 'Volume', value: `${p.volume || 80}%`, inline: true }
        );
    if (t.author) emb.addFields({ name: 'Canal', value: String(t.author).slice(0, 60), inline: true });
    if (p.paused) emb.setFooter({ text: 'Pausado' });
    if (t.artwork) emb.setThumbnail(t.artwork);
    return { embeds: [emb] };
}

module.exports = {
    name: 'tocando',
    aliases: ['np', 'nowplaying', 'agora'],
    description: 'Música que está tocando',
    data: new SlashCommandBuilder().setName('tocando').setDescription('Ver a música atual'),

    async execute(message) {
        await message.reply(build(message.guild.id));
    },

    async executeSlash(i) {
        await i.reply(build(i.guild.id));
    }
};
