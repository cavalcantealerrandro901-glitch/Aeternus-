const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const settings = require('../utils/settings');
const music = require('../utils/musicPlayer');
const { searchList } = require('../utils/musicSearch');

module.exports = {
    name: 'play',
    aliases: ['p', 'tocar', 'music', 'buscar', 'search'],
    description: 'Busca músicas na API (iTunes + YouTube) e toca se a voz estiver ok',
    async execute(message, args) {
        const q = args.join(' ').trim();

        if (!q) {
            return message.reply(
                'Uso: `O.play <nome da música ou artista>`\n' +
                    'Busca na **API** e mostra os resultados. Clique em **Tocar** para reproduzir.'
            );
        }

        const loading = await message.reply(`🔎 Buscando **${q.slice(0, 80)}** na API…`);

        let list;
        try {
            list = await searchList(q, 5);
        } catch (e) {
            console.error('[play search]', e);
            return loading.edit('❌ Erro ao buscar na API. Tente de novo.');
        }

        if (!list.length) {
            return loading.edit('Nenhum resultado para esse nome. Tente outro termo.');
        }

        const embed = new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle(`🔎 Resultados: ${q.slice(0, 80)}`)
            .setDescription(
                list
                    .map((it, i) => {
                        const link = it.youtube ? `[YouTube](${it.youtube})` : '_sem link_';
                        return (
                            `**${i + 1}. ${it.title}** — ${it.artist || '—'}\n` +
                            `${link}` +
                            (it.album ? ` · ${it.album}` : '')
                        );
                    })
                    .join('\n\n')
            )
            .setFooter({ text: 'API: iTunes + YouTube · Clique em Tocar para reproduzir' });

        if (list[0]?.artwork) embed.setThumbnail(list[0].artwork);

        const row = new ActionRowBuilder();
        list.slice(0, 5).forEach((it, i) => {
            if (!it.youtube && !it.title) return;
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`mplay_${message.author.id}_${i}`)
                    .setLabel(`${i + 1}`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('▶️')
            );
        });

        await loading.edit({
            content: null,
            embeds: [embed],
            components: row.components.length ? [row] : []
        });

        if (!row.components.length) return;

        const collector = loading.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000,
            filter: (i) =>
                i.customId.startsWith(`mplay_${message.author.id}_`) &&
                i.user.id === message.author.id
        });

        collector.on('collect', async (i) => {
            const idx = parseInt(i.customId.split('_').pop(), 10);
            const item = list[idx];
            if (!item) {
                return i.reply({ content: 'Resultado inválido.', ephemeral: true });
            }

            await i.deferUpdate().catch(() => {});

            const query = item.youtube || `${item.title} ${item.artist || ''}`;

            // Canal de voz: painel → canal do usuário
            const cfg = settings.getGuild(message.guild.id);
            const configured = cfg.musicVoiceChannel || cfg.musicChannel || null;
            const userVc = message.member?.voice?.channelId || null;
            const voiceChannelId = configured || userVc;

            if (!voiceChannelId) {
                await loading.edit({
                    content:
                        `🎵 **${item.title}** — ${item.artist || ''}\n` +
                        (item.youtube ? `Link: ${item.youtube}\n` : '') +
                        'Entre em um **canal de voz** ou configure no painel para tocar.',
                    embeds: [],
                    components: []
                }).catch(() => {});
                return;
            }

            try {
                const result = await music.enqueue(
                    message.guild,
                    voiceChannelId,
                    message.channel.id,
                    query,
                    message.author.id,
                    message.client
                );

                const playEmbed = new EmbedBuilder()
                    .setColor(0x1db954)
                    .setTitle(result.started ? '🎶 Tocando' : '➕ Na fila')
                    .setDescription(`**[${result.track.title}](${result.track.url})**`)
                    .addFields(
                        { name: 'Canal', value: `<#${voiceChannelId}>`, inline: true },
                        {
                            name: 'Duração',
                            value: music.formatDuration(result.track.duration),
                            inline: true
                        }
                    );
                if (result.track.thumbnail) playEmbed.setThumbnail(result.track.thumbnail);

                await loading.edit({ content: null, embeds: [playEmbed], components: [] });
                collector.stop('played');
            } catch (err) {
                await loading.edit({
                    content:
                        `❌ ${err.message}\n\n` +
                        `🎵 **${item.title}** — ${item.artist || ''}\n` +
                        (item.youtube ? `Ainda pode ouvir no link: ${item.youtube}` : ''),
                    embeds: [],
                    components: []
                }).catch(() => {});
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'played') return;
            try {
                await loading.edit({ components: [] });
            } catch (_) {}
        });
    }
};
