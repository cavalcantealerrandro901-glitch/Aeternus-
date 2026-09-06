const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const music = require('../systems/music');

function trackEmbed(t, res) {
    const uri = t.uri || t.url || '#';
    const emb = new EmbedBuilder()
        .setColor(music.COLOR)
        .setTitle(res?.started === false ? 'Na fila' : 'Tocando')
        .setDescription(`[**${t.title}**](${uri})`);
    const fields = [];
    if (t.length) fields.push({ name: 'Duração', value: music.formatMs(t.length), inline: true });
    if (t.author) fields.push({ name: 'Canal', value: String(t.author).slice(0, 60), inline: true });
    if (t.requester) fields.push({ name: 'Pedido por', value: String(t.requester).slice(0, 40), inline: true });
    if (res && typeof res.added === 'number') {
        fields.push({ name: 'Fila', value: String(res.added), inline: true });
    }
    if (fields.length) emb.addFields(fields);
    if (t.artwork) emb.setThumbnail(t.artwork);
    return emb;
}

module.exports = {
    name: 'tocar',
    aliases: ['play', 'p', 'musica'],
    description: 'Tocar música do YouTube',
    data: new SlashCommandBuilder()
        .setName('tocar')
        .setDescription('Tocar música do YouTube')
        .addStringOption((o) =>
            o.setName('busca').setDescription('Nome da música ou link do YouTube').setRequired(true)
        ),

    async execute(message, args) {
        const query = args.join(' ').trim();
        if (!query) return message.reply('Uso: `O.tocar <nome ou link do YouTube>`');
        try {
            await message.channel.sendTyping().catch(() => {});
            const res = await music.play(message, query);
            await message.reply({ embeds: [trackEmbed(res.track, res)] });
        } catch (e) {
            await message
                .reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(music.COLOR_ERR)
                            .setTitle('Música')
                            .setDescription(String(e.message || e).slice(0, 800))
                    ]
                })
                .catch(() => {});
        }
    },

    async executeSlash(i) {
        const query = i.options.getString('busca', true);
        try {
            if (!i.deferred && !i.replied) await i.deferReply();
        } catch (_) {}
        try {
            const res = await music.play(i, query);
            const payload = { embeds: [trackEmbed(res.track, res)] };
            if (i.deferred || i.replied) await i.editReply(payload);
            else await i.reply(payload);
        } catch (e) {
            const payload = {
                embeds: [
                    new EmbedBuilder()
                        .setColor(music.COLOR_ERR)
                        .setTitle('Música')
                        .setDescription(String(e.message || e).slice(0, 800))
                ]
            };
            try {
                if (i.deferred || i.replied) await i.editReply(payload);
                else await i.reply({ ...payload, flags: 64 });
            } catch (_) {
                await i.channel?.send(payload).catch(() => {});
            }
        }
    }
};
