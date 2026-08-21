const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Temas prontos — atalhos para buscas melhores no Google News
 */
const THEMES = {
    guerras: {
        label: '⚔️ Guerras e conflitos',
        query: 'guerra OR conflito OR combates OR hostilidades -filme -game -jogo'
    },
    ucrania: {
        label: '🇺🇦 Ucrânia / Rússia',
        query: 'Ucrânia Rússia guerra OR conflito'
    },
    israel: {
        label: '🕊️ Oriente Médio',
        query: 'Israel Gaza Palestina conflito OR guerra OR cessar-fogo'
    },
    sudan: {
        label: '🇸🇩 Sudão',
        query: 'Sudão guerra OR conflito OR combates'
    },
    myanmar: {
        label: '🇲🇲 Myanmar',
        query: 'Myanmar conflito OR guerra OR junta'
    },
    yemen: {
        label: '🇾🇪 Iêmen',
        query: 'Iêmen guerra OR Houthis OR conflito'
    },
    geopolitica: {
        label: '🌍 Geopolítica',
        query: 'geopolítica OR tensão militar OR sanções internacionais'
    },
    politica: {
        label: '🏛️ Política',
        query: 'política OR governo OR eleições'
    },
    brasil: {
        label: '🇧🇷 Brasil',
        query: 'Brasil notícias'
    },
    economia: {
        label: '📈 Economia',
        query: 'economia mercado dólar inflação juros'
    },
    tecnologia: {
        label: '💻 Tecnologia',
        query: 'tecnologia inteligência artificial OR chips OR startups'
    },
    ia: {
        label: '🤖 Inteligência artificial',
        query: 'inteligência artificial OR ChatGPT OR OpenAI OR IA'
    },
    ciencia: {
        label: '🔬 Ciência',
        query: 'ciência pesquisa descoberta espaço'
    },
    saude: {
        label: '🏥 Saúde',
        query: 'saúde medicina OMS pandemia vacina'
    },
    clima: {
        label: '🌡️ Clima',
        query: 'mudança climática OR aquecimento global OR desastre climático'
    },
    esportes: {
        label: '🏅 Esportes',
        query: 'esportes futebol OR olimpíadas OR NBA'
    },
    futebol: {
        label: '⚽ Futebol',
        query: 'futebol Brasileirão OR Champions OR seleção brasileira'
    },
    games: {
        label: '🎮 Games',
        query: 'games videogame OR PlayStation OR Xbox OR Nintendo'
    },
    celebridades: {
        label: '⭐ Celebridades',
        query: 'celebridades famosos Hollywood'
    },
    espaco: {
        label: '🚀 Espaço',
        query: 'espaço NASA SpaceX astronauta foguete'
    },
    criptomoedas: {
        label: '₿ Criptomoedas',
        query: 'bitcoin criptomoedas ethereum crypto'
    },
    seguranca: {
        label: '🛡️ Segurança / ciber',
        query: 'ciberataque OR hackers OR segurança digital'
    }
};

function resolveTopic(args) {
    if (!args.length) return null;
    const key = args[0].toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    // atalho de um tema
    if (THEMES[key] && args.length === 1) {
        return { display: THEMES[key].label, query: THEMES[key].query, preset: key };
    }
    // tema livre
    const free = args.join(' ').trim();
    return { display: free, query: free, preset: null };
}

async function fetchNews(topic, limit = 6) {
    const q = encodeURIComponent(topic);
    const url = `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

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
    const cdata = block.match(
        new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')
    );
    if (cdata) return (cdata[1] || '').trim();
    const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return plain ? (plain[1] || '').trim() : '';
}

function pickLink(block) {
    const m = block.match(/<link>([\s\S]*?)<\/link>/i);
    if (!m) return '';
    return m[1].replace(/<!\[CDATA\[/i, '').replace(/\]\]>/g, '').trim();
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

function themesHelpEmbed() {
    const war = ['guerras', 'ucrania', 'israel', 'sudan', 'myanmar', 'yemen', 'geopolitica'];
    const other = Object.keys(THEMES).filter((k) => !war.includes(k));

    const line = (k) => `• \`O.noticias ${k}\` — ${THEMES[k].label}`;

    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setTitle('📰 Temas de notícias')
        .setDescription(
            'Use um **tema pronto** ou escreva qualquer assunto.\n\n' +
                '**⚔️ Guerras e conflitos**\n' +
                war.map(line).join('\n') +
                '\n\n**📌 Outros temas**\n' +
                other.map(line).join('\n') +
                '\n\n**Livre:** `O.noticias <qualquer tema>`\n' +
                'Ex.: `O.noticias mudança climática na Amazônia`'
        )
        .setFooter({ text: 'Fonte: Google News · pt-BR' });
}

module.exports = {
    name: 'noticias',
    aliases: ['notícias', 'noticia', 'notícia', 'news', 'temas'],
    description: 'Notícias por tema (guerras, política, tech…) ou busca livre',
    async execute(message, args) {
        // O.noticias / O.temas → lista de temas
        if (!args.length || ['temas', 'ajuda', 'help', 'lista'].includes(args[0].toLowerCase())) {
            return message.reply({ embeds: [themesHelpEmbed()] });
        }

        const resolved = resolveTopic(args);
        if (!resolved || !resolved.query) {
            return message.reply({ embeds: [themesHelpEmbed()] });
        }

        if (resolved.display.length > 120 && !resolved.preset) {
            return message.reply('Tema muito longo. Use até 120 caracteres.');
        }

        const loading = await message.reply(`📰 Buscando: **${resolved.display}**…`);

        try {
            const items = await fetchNews(resolved.query, 6);

            if (!items.length) {
                return loading.edit(
                    `Não encontrei notícias sobre **${resolved.display}**. Tente outro tema ou \`O.noticias temas\`.`
                );
            }

            const embed = new EmbedBuilder()
                .setColor(resolved.preset && ['guerras', 'ucrania', 'israel', 'sudan', 'myanmar', 'yemen'].includes(resolved.preset)
                    ? 0xef4444
                    : 0x38bdf8)
                .setTitle(`📰 ${resolved.display}`)
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
                    text: `Pedido por ${message.author.username} · Google News · O.noticias temas`
                })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Ver mais no Google News')
                    .setStyle(ButtonStyle.Link)
                    .setURL(
                        `https://news.google.com/search?q=${encodeURIComponent(resolved.query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
                    )
                    .setEmoji('🌐')
            );

            await loading.edit({ content: null, embeds: [embed], components: [row] });
        } catch (err) {
            console.error('noticias:', err);
            await loading.edit('❌ Não consegui buscar as notícias agora. Tente de novo.');
        }
    }
};
