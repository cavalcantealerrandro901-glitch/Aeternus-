const {
    EmbedBuilder,
    SlashCommandBuilder,
    ChannelType,
    MessageFlags
} = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'tocar',
    aliases: ['play', 'p', 'toca'],
    description: 'Toca música (SoundCloud / Lavalink)',
    data: new SlashCommandBuilder()
        .setName('tocar')
        .setDescription('Toca música')
        .addStringOption((o) =>
            o
                .setName('busca')
                .setDescription('Nome da música ou link (SoundCloud / YouTube)')
                .setRequired(true)
        ),

    async execute(message, args) {
        const query = args.join(' ').trim();
        if (!query) {
            return message.reply(
                'Use: `O.tocar <nome ou link>`\n' +
                    'Exemplos:\n' +
                    '• `O.tocar never gonna give you up`\n' +
                    '• `O.tocar https://soundcloud.com/...`'
            );
        }
        return run(message, query);
    },

    async executeSlash(i) {
        const query = i.options.getString('busca', true);
        await i.deferReply();
        try {
            const result = await play(i, query);
            return i.editReply(result);
        } catch (e) {
            return i.editReply({ content: `❌ ${e.message || e}` });
        }
    },

    async handleComponent(interaction, client) {
        if (String(interaction.customId || '').startsWith('music:')) {
            return musicManager.handleMusicButton(interaction, client);
        }
    }
};

async function run(message, query) {
    try {
        const result = await play(message, query);
        const sent = await message.reply({
            ...result,
            allowedMentions: { repliedUser: false }
        });
        setTimeout(() => sent.delete().catch(() => {}), 15_000);
        return sent;
    } catch (e) {
        const err = await message.reply(`❌ ${e.message || e}`);
        setTimeout(() => err.delete().catch(() => {}), 12_000);
        return err;
    }
}

function sourceLabel(usedQuery, info) {
    if (info?.sourceName) return String(info.sourceName);
    const u = String(usedQuery || '');
    if (u.startsWith('scsearch:') || /soundcloud/i.test(u)) return 'soundcloud';
    if (u.startsWith('dzsearch:')) return 'deezer';
    if (u.startsWith('yt') || /youtu/i.test(u)) return 'youtube';
    return 'auto';
}

function getOnlineNode(shoukaku) {
    if (!shoukaku) return null;
    if (typeof shoukaku.getIdealNode === 'function') {
        const n = shoukaku.getIdealNode();
        if (n) return n;
    }
    if (typeof shoukaku.getNode === 'function') {
        const n = shoukaku.getNode();
        if (n) return n;
    }
    if (shoukaku.options?.nodeResolver) {
        const n = shoukaku.options.nodeResolver(shoukaku.nodes);
        if (n) return n;
    }
    try {
        for (const node of shoukaku.nodes?.values?.() || []) {
            const st = node?.state;
            if (st === 2 || st === 'CONNECTED' || node?.sessionId) return node;
        }
    } catch (_) {}
    return null;
}

async function waitForNode(shoukaku, tries = 8) {
    for (let i = 0; i < tries; i++) {
        const n = getOnlineNode(shoukaku);
        if (n) return n;
        await new Promise((r) => setTimeout(r, 700));
    }
    return null;
}

async function play(ctx, query) {
    const member = ctx.member || ctx.guild?.members?.cache?.get(ctx.user?.id);
    const voice = member?.voice?.channel;
    if (!voice) throw new Error('Entre em um **canal de voz** primeiro.');
    if (voice.type !== ChannelType.GuildVoice && voice.type !== ChannelType.GuildStageVoice) {
        throw new Error('Canal de voz inválido.');
    }

    const me = ctx.guild.members.me;
    if (me?.voice?.channelId && me.voice.channelId !== voice.id) {
        throw new Error('Já estou em outro canal de voz neste servidor.');
    }

    const shoukaku = ctx.client?.shoukaku;
    if (!shoukaku) {
        throw new Error(
            'Sistema de música não inicializou. Confira se o pacote `shoukaku` está instalado e reinicie o bot.'
        );
    }

    const node = await waitForNode(shoukaku);
    if (!node) {
        throw new Error(
            'Nenhum node **Lavalink** online ainda.\n' +
                'Aguarde ~10s após o bot ligar e tente de novo.\n' +
                'No Render confira `LAVALINK_NODES=serenetia|lavalinkv4.serenetia.com:443|https://seretia.link/discord|true`'
        );
    }

    const userId = ctx.author?.id || ctx.user?.id;
    const channelId = ctx.channel?.id;

    const res = await musicManager.enqueue(ctx.client, {
        guild: ctx.guild,
        voiceChannelId: voice.id,
        textChannelId: channelId,
        query,
        requesterId: userId
    });

    if (res.playlistName) {
        return {
            embeds: [
                new EmbedBuilder()
                    .setColor(0x7c3aed)
                    .setTitle('📑 Playlist na fila')
                    .setDescription(
                        `**${res.playlistName}**\n+**${res.added}** faixa(s)\nTotal: **${res.queueSize}**`
                    )
            ]
        };
    }

    const info = res.first?.info || {};
    const fonte = sourceLabel(res.usedQuery, info);
    const note =
        res.fallbackFromYoutube || res.fallbackMirror
            ? '\n_Espelho automático no SoundCloud._'
            : '';

    return {
        embeds: [
            new EmbedBuilder()
                .setColor(0x7c3aed)
                .setTitle(res.queueSize <= 1 ? '✅ Tocando' : '➕ Na fila')
                .setDescription(`**[${info.title || 'Música'}](${info.uri || '#'})**${note}`)
                .addFields(
                    { name: 'Fonte', value: `\`${fonte}\``, inline: true },
                    { name: 'Node', value: `\`${node.name}\``, inline: true },
                    { name: 'Fila', value: `\`${res.queueSize}\``, inline: true }
                )
                .setThumbnail(info.artworkUrl || null)
                .setFooter({ text: 'Aeternus Music · Serenetia' })
        ]
    };
}
