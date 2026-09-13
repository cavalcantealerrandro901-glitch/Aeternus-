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
    description: 'Toca música (YouTube → fallback SoundCloud)',
    data: new SlashCommandBuilder()
        .setName('tocar')
        .setDescription('Toca música no canal de voz')
        .addStringOption((o) =>
            o
                .setName('busca')
                .setDescription('Nome ou URL (YouTube / SoundCloud)')
                .setRequired(true)
        ),

    async execute(message, args) {
        const query = args.join(' ').trim();
        if (!query) {
            return message.reply(
                'Use: `O.tocar <nome ou url>`\n' +
                    'Ordem: **YouTube** → SoundCloud (se o YT falhar).'
            );
        }
        return run(message, query);
    },

    async executeSlash(i) {
        const query = i.options.getString('busca', true);
        await i.deferReply({ flags: MessageFlags.Ephemeral });
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
        setTimeout(() => sent.delete().catch(() => {}), 12_000);
        return sent;
    } catch (e) {
        const err = await message.reply(`❌ ${e.message || e}`);
        setTimeout(() => err.delete().catch(() => {}), 10_000);
        return err;
    }
}

function sourceLabel(usedQuery, info) {
    if (info?.sourceName) return String(info.sourceName);
    const u = String(usedQuery || '');
    if (u.startsWith('ytsearch:') || u.startsWith('ytmsearch:') || /youtu/i.test(u)) return 'youtube';
    if (u.startsWith('scsearch:') || /soundcloud/i.test(u)) return 'soundcloud';
    if (u.startsWith('dzsearch:')) return 'deezer';
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
        throw new Error('Música não inicializada. Verifique LAVALINK_NODES.');
    }

    const node = ctx.client.shoukaku.getIdealNode();
    if (!node) throw new Error('Nenhum node Lavalink online.');

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
                    .setColor(0xff0000)
                    .setTitle('📑 Playlist na fila')
                    .setDescription(
                        `**${res.playlistName}**\n+**${res.added}** faixa(s)\nTotal: **${res.queueSize}**`
                    )
                    .setFooter({ text: 'Só você vê esta confirmação' })
            ]
        };
    }

    const info = res.first?.info || {};
    const fonte = sourceLabel(res.usedQuery, info);
    const note =
        res.fallbackFromYoutube || res.fallbackMirror
            ? '\n_YouTube falhou → tocando via SoundCloud._'
            : '';

    return {
        embeds: [
            new EmbedBuilder()
                .setColor(fonte === 'soundcloud' ? 0xff5500 : 0xff0000)
                .setTitle(res.queueSize <= 1 ? '✅ Pedido recebido' : '➕ Na fila')
                .setDescription(
                    `**[${info.title || 'Música'}](${info.uri || '#'})**${note}`
                )
                .addFields(
                    { name: 'Fonte', value: `\`${fonte}\``, inline: true },
                    { name: 'Node', value: `\`${node.name}\``, inline: true },
                    { name: 'Fila', value: `\`${res.queueSize}\``, inline: true }
                )
                .setThumbnail(info.artworkUrl || null)
                .setFooter({ text: 'YouTube prioritário · fallback SoundCloud' })
        ]
    };
}
