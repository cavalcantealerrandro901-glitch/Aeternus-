const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Busca notícias no Google News RSS (qualquer tema do mundo).
 * Uso: O.noticias <tema>
 */
async function fetchNews(topic, limit = 5) {
    const q = encodeURIComponent(topic);
    const url =
        `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'AeternusBot/1.0 (Discord; news)',
            Accept: 'application/rss+xml, application/xml, text/xml, */*'
        }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
        const block = match[1];
        const title = decodeXml(pick(block, 'title'));
        const link = pickLink(block);
        const pubDate = pick(block, 'pubDate');
        const source = decodeXml(pick(block, 'source')) || 'Notícia';
        if (title && link) {
            items.push({
                title: title.slice(0, 240),
                link,
                pubDate,
                source: source.slice(0, 80)
            });
        }
    }
    return items;
}

function pick(block, tag) {
    const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (!m) return '';
    return (m[1] || m[2] || '').trim();
}

function pickLink(block) {
    // Google RSS: <link>url</link> ou às vezes só texto
    const m = block.match(/<link>([\s\S]*?)<\/link>/i);
    if (!m) return '';
    return m[1].replace(/<!\[CDATA\[/i, '').replace(/\]\]>/, '').trim();
}

function decodeXml(s) {
    return String(s || '')
        .replace(/<!\[CDATA\[/gi, '')
        .replace(/\]\]>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .trim();
}

function formatDate(pubDate) {
    if (!pubDate) return '';
    const d = new Date(pubDate);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

module.exports = {
    name: 'noticias',
    aliases: ['notícias', 'noticia', 'notícia', 'news'],
    description: 'Mostra notícias sobre qualquer tema do mundo',
    async execute(message, args) {
        const tema = args.join(' ').trim();
        if (!tema) {
            return message.reply(
                'Uso: `O.noticias <tema>`\n' +
                    'Exemplos: `O.noticias inteligência artificial` · `O.noticias Brasil economia` · `O.noticias futebol`'
            );
        }

        if (tema.length > 120) {
            return message.reply('Tema muito longo. Use até 120 caracteres.');
        }

        const loading = await message.reply(`📰 Buscando notícias sobre **${tema}**…`);

        try {
            const items = await fetchNews(tema, 6);

            if (!items.length) {
                return loading.edit(
                    `Não encontrei notícias recentes sobre **${tema}**. Tente outras palavras.`
                );
            }

            const embed = new EmbedBuilder()
                .setColor(0x38bdf8)
                .setTitle(`📰 Notícias: ${tema.slice(0, 80)}`)
                .setDescription(
                    items
                        .map((it, i) => {
                            const when = formatDate(it.pubDate);
                            return (
                                `**${i + 1}. [${it.title}](${it.link})**\n` +
                                `${it.source}${when ? ` · ${when}` : ''}`
                            );
                        })
                        .join('\n\n')
                )
                .setFooter({
                    text: `Pedido por ${message.author.username} · Fonte: Google News`
                })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Ver mais no Google News')
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                        `https://news.google.com/search?q=${encodeURIComponent(tema)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
                    )
                    .setEmoji('🌐')
            );

            await loading.edit({ content: null, embeds: [embed], components: [row] });
        } catch (err) {
            console.error('noticias:', err);
            await loading.edit(
                '❌ Não consegui buscar as notícias agora. Tente de novo em instantes.'
            );
        }
    }
};
