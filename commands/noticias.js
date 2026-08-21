const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const THEMES = {
    guerras: { label: '⚔️ Guerras e conflitos', query: 'guerra conflito mundial' },
    ucrania: { label: '🇺🇦 Ucrânia / Rússia', query: 'Ucrânia Rússia guerra' },
    israel: { label: '🕊️ Oriente Médio', query: 'Israel Gaza conflito' },
    sudan: { label: '🇸🇩 Sudão', query: 'Sudão guerra conflito' },
    myanmar: { label: '🇲🇲 Myanmar', query: 'Myanmar conflito' },
    yemen: { label: '🇾🇪 Iêmen', query: 'Iêmen guerra' },
    geopolitica: { label: '🌍 Geopolítica', query: 'geopolítica tensão militar' },
    politica: { label: '🏛️ Política', query: 'política governo eleições' },
    brasil: { label: '🇧🇷 Brasil', query: 'Brasil' },
    economia: { label: '📈 Economia', query: 'economia mercado dólar' },
    tecnologia: { label: '💻 Tecnologia', query: 'tecnologia inteligência artificial' },
    ia: { label: '🤖 Inteligência artificial', query: 'inteligência artificial IA' },
    ciencia: { label: '🔬 Ciência', query: 'ciência descoberta' },
    saude: { label: '🏥 Saúde', query: 'saúde medicina' },
    clima: { label: '🌡️ Clima', query: 'mudança climática' },
    esportes: { label: '🏅 Esportes', query: 'esportes' },
    futebol: { label: '⚽ Futebol', query: 'futebol' },
    games: { label: '🎮 Games', query: 'videogame games' },
    celebridades: { label: '⭐ Celebridades', query: 'celebridades' },
    espaco: { label: '🚀 Espaço', query: 'espaço NASA SpaceX' },
    criptomoedas: { label: '₿ Criptomoedas', query: 'bitcoin criptomoedas' },
    seguranca: { label: '🛡️ Segurança', query: 'ciberataque segurança digital' }
};

function normalizeKey(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function resolveTopic(args) {
    if (!args.length) return null;
    const key = normalizeKey(args[0]);
    if (THEMES[key] && args.length === 1) {
        return { display: THEMES[key].label, query: THEMES[key].query, preset: key };
    }
    return { display: args.join(' ').trim(), query: args.join(' ').trim(), preset: null };
}

function stripTags(s) {
    return String(s || '')
        .replace(/<!\[CDATA\[/gi, '')
        .replace(/\]\]>/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
}

function between(xml, tag) {
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
    const m = xml.match(re);
    return m ? stripTags(m[1]) : '';
}

async function fetchNews(topic, limit = 6) {
    const url =
        'https://news.google.com/rss/search?q=' +
        encodeURIComponent(topic) +
        '&hl=pt-BR&gl=BR&ceid=BR:pt-419';

    const res = await fetch(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (compatible; AeternusBot/2.0; +https://discord.com)',
            Accept: 'application/rss+xml, application/xml, text/xml, */*'
        }
    });

    if (!res.ok) {
        throw new Error('Falha HTTP ' + res.status + ' ao contatar o Google News');
    }

    const xml = await res.text();
    if (!xml.includes('<item>')) {
        throw new Error('Resposta sem notícias (feed vazio ou bloqueado)');
    }

    const chunks = xml.split('<item>').slice(1);
    const items = [];

    for (const chunk of chunks) {
        if (items.length >= limit) break;
        const block = chunk.split('</item>')[0] || '';
        const title = between(block, 'title');
        let link = between(block, 'link');
        // alguns feeds usam <link href="..." />
        if (!link) {
            const hm = block.match(/<link[^>]+href=["']([^"']+)["']/i);
            if (hm) link = hm[1];
        }
        const pubDate = between(block, 'pubDate');
        const source = between(block, 'source') || 'Google News';

        if (!title || !link) continue;
        if (!/^https?:\/\//i.test(link)) continue;

        items.push({
            title: title.slice(0, 220),
            link,
            pubDate,
            source: source.slice(0, 60)
        });
    }

    return items;
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
            'Use um **tema pronto** ou qualquer assunto.\n\n' +
                '**⚔️ Guerras e conflitos**\n' +
                war.map(line).join('\n') +
                '\n\n**📌 Outros**\n' +
                other.map(line).join('\n') +
                '\n\n**Livre:** `O.noticias <tema>`'
        )
        .setFooter({ text: 'Fonte: Google News' });
}

module.exports = {
    name: 'noticias',
    aliases: ['noticias', 'noticia', 'news', 'temas'],
    description: 'Notícias por tema ou busca livre',
    async execute(message, args) {
        try {
            if (
                !args.length ||
                ['temas', 'ajuda', 'help', 'lista'].includes(normalizeKey(args[0]))
            ) {
                return void (await message.reply({ embeds: [themesHelpEmbed()] }));
            }

            const resolved = resolveTopic(args);
            if (!resolved?.query) {
                return void (await message.reply({ embeds: [themesHelpEmbed()] }));
            }

            const loading = await message.reply(`📰 Buscando: **${resolved.display.slice(0, 80)}**…`);

            let items;
            try {
                items = await fetchNews(resolved.query, 6);
            } catch (err) {
                console.error('[noticias] fetch:', err);
                return void (await loading.edit(
                    `❌ Não consegui buscar notícias: ${err.message}`
                ));
            }

            if (!items.length) {
                return void (await loading.edit(
                    `Não achei resultados para **${resolved.display}**.\nTente \`O.noticias temas\` ou outras palavras.`
                ));
            }

            const desc = items
                .map((it, i) => {
                    const when = formatDate(it.pubDate);
                    return `**${i + 1}. [${it.title}](${it.link})**\n${it.source}${when ? ` · ${when}` : ''}`;
                })
                .join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(
                    resolved.preset &&
                        ['guerras', 'ucrania', 'israel', 'sudan', 'myanmar', 'yemen'].includes(
                            resolved.preset
                        )
                        ? 0xef4444
                        : 0x38bdf8
                )
                .setTitle(`📰 ${resolved.display}`.slice(0, 250))
                .setDescription(desc.slice(0, 4000))
                .setFooter({
                    text: `Pedido por ${message.author.username} · Google News`
                })
                .setTimestamp();

            const searchUrl =
                'https://news.google.com/search?q=' +
                encodeURIComponent(resolved.query) +
                '&hl=pt-BR&gl=BR&ceid=BR:pt-419';

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Ver mais')
                    .setStyle(ButtonStyle.Link)
                    .setURL(searchUrl)
                    .setEmoji('🌐')
            );

            await loading.edit({ content: '', embeds: [embed], components: [row] });
        } catch (err) {
            console.error('[noticias] execute:', err);
            await message.reply('❌ Erro ao executar notícias. Veja o console do bot.').catch(() => {});
        }
    }
};
