const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { searchList } = require('../utils/musicSearch');

module.exports = {
    name: 'buscar',
    aliases: ['search', 'pesquisa', 'find'],
    description: 'Busca músicas pela API (iTunes + YouTube)',
    async execute(message, args) {
        const q = args.join(' ').trim();
        if (!q) {
            return message.reply('Uso: `O.buscar <nome da música ou artista>`');
        }

        const loading = await message.reply(`🔎 Buscando **${q.slice(0, 80)}** na API…`);

        try {
            const list = await searchList(q, 5);
            if (!list.length) {
                return loading.edit('Nenhum resultado. Tente outro nome.');
            }

            const embed = new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle(`🔎 Resultados: ${q.slice(0, 80)}`)
                .setDescription(
                    list
                        .map((it, i) => {
                            const link = it.youtube ? `[YouTube](${it.youtube})` : '_sem link_';
                            return (
                                `**${i + 1}. ${it.title}** — ${it.artist}\n` +
                                `${link}` +
                                (it.album ? ` · ${it.album}` : '')
                            );
                        })
                        .join('\n\n')
                )
                .setFooter({ text: 'Fonte: iTunes API + YouTube · O.play <nome> para tocar' });

            if (list[0]?.artwork) embed.setThumbnail(list[0].artwork);

            // botões: tocar 1–3 se tiver youtube
            const row = new ActionRowBuilder();
            list.slice(0, 3).forEach((it, i) => {
                if (!it.youtube) return;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`playsearch_${message.author.id}_${i}`)
                        .setLabel(`Tocar ${i + 1}`)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('▶️')
                );
            });

            // guarda resultados temporários no client
            if (!message.client.musicSearchCache) message.client.musicSearchCache = new Map();
            message.client.musicSearchCache.set(message.author.id, {
                list,
                at: Date.now()
            });

            await loading.edit({
                content: null,
                embeds: [embed],
                components: row.components.length ? [row] : []
            });
        } catch (e) {
            console.error('[buscar]', e);
            await loading.edit('❌ Erro na busca. Tente de novo.');
        }
    }
};
