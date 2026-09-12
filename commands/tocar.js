const { EmbedBuilder, SlashCommandBuilder, ChannelType } = require('discord.js');
const musicManager = require('../utils/musicManager');

module.exports = {
    name: 'tocar',
    aliases: ['play', 'p', 'toca'],
    description: 'Toca música (SoundCloud, Deezer, Spotify, YouTube…)',
    data: new SlashCommandBuilder()
        .setName('tocar')
        .setDescription('Toca música no canal de voz (várias fontes)')
        .addStringOption((o) =>
            o
                .setName('busca')
                .setDescription('Nome ou URL (SoundCloud, Spotify, Deezer, YouTube…)')
                .setRequired(true)
        ),

    async execute(message, args) {
        const query = args.join(' ').trim();
        if (!query) {
            return message.reply(
                'Use: `O.tocar <nome ou url>`\nFontes: **SoundCloud**, Deezer, Spotify, YouTube.'
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
    }
};

async function run(message, query) {
    try {
        const result = await play(message, query);
        return message.reply(result);
    } catch (e) {
        return message.reply(`❌ ${e.message || e}`);
    }
}

function sourceLabel(usedQuery, info) {
    if (info?.sourceName) return String(info.sourceName);
    const u = String(usedQuery || '');
    if (u.startsWith('scsearch:')) return 'soundcloud';
    if (u.startsWith('dzsearch:')) return 'deezer';
    if (u.startsWith('spsearch:')) return 'spotify';
    if (u.startsWith('ytmsearch:')) return 'youtube-music';
    if (u.startsWith('ytsearch:')) return 'youtube';
    if (/soundcloud/i.test(u)) return 'soundcloud';
    if (/spotify/i.test(u)) return 'spotify';
    if (/deezer/i.test(u)) return 'deezer';
    if (/youtu/i.test(u)) return 'youtube';
    return 'auto';
}

async function play(ctx, query) {
    const member = ctx.member || ctx.guild?.members?.cache?.get(ctx.user?.id);
    const voice = member?.voice?.channel;
    if (!voice) throw new Error('Entre em um canal de voz primeiro.');
    if (voice.type !== ChannelType.GuildVoice && voice.type !== ChannelType.GuildStageVoice) {
        throw new Error('Canal de voz inválido.');
    }

    const me = ctx.guild.members.me;
    if (me?.voice?.channelId && me.voice.channelId !== voice.id) {
        throw new Error('Já estou em outro canal de voz neste servidor.');
    }

    if (!ctx.client?.shoukaku) {
        throw new Error('Música não inicializada. Verifique LAVALINK_NODES e os logs.');
    }

    const node = ctx.client.shoukaku.getIdealNode();
    if (!node) {
        throw new Error('Nenhum node Lavalink online. Aguarde a conexão ou configure nodes estáveis.');
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
                    .setColor(0xa78bfa)
                    .setTitle('📑 Playlist adicionada')
                    .setDescription(
                        `**${res.playlistName}**\n+**${res.added}** faixa(s) na fila.\nFila total: **${res.queueSize}**`
                    )
            ]
        };
    }

    const info = res.first?.info || {};
    const fonte = sourceLabel(res.usedQuery, info);
    const note =
        res.fallbackFromYoutube || res.fallbackMirror
            ? '\n_Espelho automático (fonte original indisponível)._'
            : '';

    return {
        embeds: [
            new EmbedBuilder()
                .setColor(0xa78bfa)
                .setTitle(res.queueSize <= 1 ? '▶️ Tocando' : '➕ Na fila')
                .setDescription(
                    `**[${info.title || 'Música'}](${info.uri || '#'})**${note}`
                )
                .addFields(
                    { name: 'Autor', value: String(info.author || '—').slice(0, 80), inline: true },
                    {
                        name: 'Duração',
                        value: info.isStream ? 'Live' : musicManager.formatMs(info.length),
                        inline: true
                    },
                    { name: 'Fonte', value: fonte, inline: true },
                    { name: 'Node', value: node.name, inline: true }
                )
                .setThumbnail(info.artworkUrl || null)
        ]
    };
}
