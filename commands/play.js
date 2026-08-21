const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const settings = require('../utils/settings');
const music = require('../utils/musicPlayer');
const { searchList, SearchError } = require('../utils/musicSearch');

function friendlyError(err) {
    if (!err) return 'Erro desconhecido na busca.';
    if (err instanceof SearchError) return err.message;
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        return 'Sem conexão com a internet ou API indisponível.';
    }
    return err.message || 'Falha ao buscar músicas.';
}

module.exports = {
    name: 'play',
    aliases: ['p', 'tocar', 'music', 'buscar', 'search'],
    description: 'Busca músicas na API e toca no canal de voz',
    async execute(message, args) {
        const q = args.join(' ').trim();

        if (!q) {
            return message.reply(
                'Uso: `O.play <nome da música ou artista>`\n' +
                    'A busca usa a **API** (iTunes + YouTube). Depois escolha nos botões.'
            );
        }

        if (q.length > 120) {
            return message.reply('Nome muito longo. Use até **120** caracteres.');
        }

        let loading;
        try {
            loading = await message.reply(`🔎 Buscando **${q.slice(0, 80)}** na API…`);
        } catch {
            return; // sem permissão de responder
        }

        let list;
        try {
            list = await searchList(q, 5);
        } catch (err) {
            console.error('[play search]', err);
            const text = friendlyError(err);
            try {
                await loading.edit(`❌ **Erro na busca**\n${text}`);
            } catch {
                await message.channel.send(`❌ **Erro na busca**\n${text}`).catch(() => {});
            }
            return;
        }

        if (!Array.isArray(list) || !list.length) {
            return loading.edit(
                'Nenhum resultado para **' +
                    q.slice(0, 60) +
                    '**.\nTente outro nome, artista ou em inglês.'
            ).catch(() => {});
        }

        try {
            const embed = new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle(`🔎 Resultados: ${q.slice(0, 80)}`)
                .setDescription(
                    list
                        .map((it, i) => {
                            const link = it.youtube ? `[YouTube](${it.youtube})` : '_sem link de stream_';
                            return (
                                `**${i + 1}. ${it.title}** — ${it.artist || '—'}\n` +
                                `${link}` +
                                (it.album ? ` · ${it.album}` : '')
                            );
                        })
                        .join('\n\n')
                        .slice(0, 4000)
                )
                .setFooter({ text: 'API: iTunes + YouTube · Clique em ▶️ para tocar' });

            if (list[0]?.artwork) embed.setThumbnail(list[0].artwork);

            const row = new ActionRowBuilder();
            list.slice(0, 5).forEach((it, i) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mplay_${message.author.id}_${i}`)
                        .setLabel(`${i + 1}`)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('▶️')
                        .setDisabled(!it.youtube && !it.title)
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
                try {
                    const idx = parseInt(i.customId.split('_').pop(), 10);
                    const item = list[idx];
                    if (!item) {
                        return i.reply({ content: 'Resultado inválido.', ephemeral: true });
                    }

                    await i.deferUpdate().catch(() => {});

                    const query = item.youtube || `${item.title} ${item.artist || ''}`;
                    const cfg = settings.getGuild(message.guild.id);
                    const configured = cfg.musicVoiceChannel || cfg.musicChannel || null;
                    const userVc = message.member?.voice?.channelId || null;
                    const voiceChannelId = configured || userVc;

                    if (!voiceChannelId) {
                        await loading.edit({
                            content:
                                `🎵 **${item.title}** — ${item.artist || ''}\n` +
                                (item.youtube ? `Link: ${item.youtube}\n` : '') +
                                'Entre em um **canal de voz** ou configure no **painel → Música**.',
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
                    } catch (playErr) {
                        console.error('[play enqueue]', playErr);
                        await loading.edit({
                            content:
                                `❌ **Não foi possível tocar**\n${playErr.message || playErr}\n\n` +
                                `🎵 **${item.title}** — ${item.artist || ''}\n` +
                                (item.youtube ? `Link: ${item.youtube}` : ''),
                            embeds: [],
                            components: []
                        }).catch(() => {});
                    }
                } catch (btnErr) {
                    console.error('[play button]', btnErr);
                    try {
                        if (i.deferred || i.replied) {
                            await i.followUp({
                                content: '❌ Erro ao processar o botão.',
                                ephemeral: true
                            });
                        } else {
                            await i.reply({ content: '❌ Erro ao processar o botão.', ephemeral: true });
                        }
                    } catch (_) {}
                }
            });

            collector.on('end', async (_, reason) => {
                if (reason === 'played') return;
                try {
                    await loading.edit({ components: [] });
                } catch (_) {}
            });
        } catch (err) {
            console.error('[play ui]', err);
            try {
                await loading.edit(`❌ Erro ao montar os resultados: ${friendlyError(err)}`);
            } catch {
                await message.channel.send(`❌ Erro na busca: ${friendlyError(err)}`).catch(() => {});
            }
        }
    }
};
