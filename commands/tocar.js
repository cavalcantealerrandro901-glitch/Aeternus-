const {
    EmbedBuilder,

    ChannelType,
    MessageFlags
} = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'tocar',
    aliases: ['play', 'p', 'toca'],
    description: 'Toca música (SoundCloud / Lavalink)',

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

    async handleComponent(interaction, client) {
        if (String(interaction.customId || '').startsWith('music:')) {
            return musicManager.handleMusicButton(interaction, client);
        }
    }
};

async function run(message, query) {
    try {
        // O musicManager já cria/atualiza o painel principal com embed e botões.
        // Evita enviar um segundo embed temporário para a mesma música.
        await play(message, query);
        return null;
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
                    .setColor(0x2b2d31)
                    .setAuthor({ name: 'AETERNUS  /  MÚSICA' })
                    .setTitle('Playlist adicionada à fila')
                    .setDescription(`**${res.playlistName}**`)
                    .addFields(
                        { name: 'Faixas adicionadas', value: `\`${res.added}\``, inline: true },
                        { name: 'Total na fila', value: `\`${res.queueSize}\``, inline: true }
                    )
                    .setFooter({ text: 'Aeternus Music' })
                    .setTimestamp()
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
                .setColor(0x2b2d31)
                .setAuthor({ name: 'AETERNUS  /  MÚSICA' })
                .setTitle(res.queueSize <= 1 ? 'Adicionado à reprodução' : 'Adicionado à fila')
                .setDescription(`**[${String(info.title || 'Música').slice(0, 180)}](${info.uri || '#'})**${note}`)
                .addFields(
                    { name: 'Solicitado por', value: userId ? `<@${userId}>` : 'Usuário', inline: true },
                    { name: 'Origem', value: `\`${fonte}\``, inline: true },
                    { name: 'Faixas na fila', value: `\`${res.queueSize}\``, inline: true }
                )
                .setThumbnail(/^https?:\/\//i.test(String(info.artworkUrl || '')) ? info.artworkUrl : null)
                .setFooter({ text: 'Use os controles do painel para gerenciar a reprodução.' })
                .setTimestamp()
        ]
    };
}
