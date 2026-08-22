const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    PermissionFlagsBits
} = require('discord.js');
const music = require('../utils/musicPlayer');
const { searchList, SearchError } = require('../utils/musicSearch');

function friendlyError(err) {
    if (!err) return 'Erro desconhecido.';
    if (err instanceof SearchError) return err.message;
    return err.message || 'Falha na busca.';
}

function fmtDur(sec) {
    sec = Math.floor(Number(sec) || 0);
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = {
    name: 'play',
    aliases: ['p', 'tocar', 'music', 'musica', 'música'],
    description: 'Toca música em canal público ou sala privada',
    async execute(message, args) {
        if (!message.guild) return message.reply('Use em um servidor.');

        // O.play @user → convite
        const mentioned = message.mentions.users.first();
        const textArgs = args.filter((a) => !a.startsWith('<@') && !a.startsWith('<@!'));

        if (mentioned && !textArgs.length) {
            const st = music.getQueue(message.guild.id);
            const chId = st.voiceChannelId || st.privateChannelId;
            if (!chId) {
                return message.reply('Não há sessão ativa. Use `O.play <música>` primeiro.');
            }

            if (st.isPrivate) {
                await music.allowUserInPrivate(message.guild.id, mentioned.id, message.client);
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`minvite_${message.guild.id}_${chId}_${mentioned.id}`)
                    .setLabel('Entrar no canal')
                    .setEmoji('🎧')
                    .setStyle(ButtonStyle.Success)
            );

            return message.reply({
                content: `${mentioned}, **${message.author.username}** te chamou para ouvir música!`,
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x1db954)
                        .setTitle('🎧 Convite')
                        .setDescription(
                            `Canal: <#${chId}> · ${st.isPrivate ? '🔒 Privado' : '🌐 Público'}\n` +
                                (st.now ? `Tocando: **${st.now.title}**` : 'Aguardando…')
                        )
                ],
                components: [row]
            });
        }

        // O.play privada <nome>  ou  O.play priv <nome>
        let privateMode = false;
        if (textArgs[0] && /^(priv(ada|ate)?|lock|solo)$/i.test(textArgs[0])) {
            privateMode = true;
            textArgs.shift();
        }

        const q = textArgs.join(' ').trim();

        if (!q) {
            return message.reply(
                '**Uso**\n' +
                    '`O.play <música>` — toca no **canal público** onde você está\n' +
                    '`O.play privada <música>` — cria **sala privada**\n' +
                    '`O.play @user` — convida alguém\n' +
                    '`O.fila` · `O.pular` · `O.parar` · `O.np`'
            );
        }

        const me = message.guild.members.me;
        if (me) {
            const need = [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak];
            if (!me.permissions.has(need)) {
                return message.reply('Preciso de **Conectar** e **Falar**.');
            }
            if (privateMode && !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return message.reply('Para sala privada preciso de **Gerenciar Canais**.');
            }
        }

        if (!message.member.voice?.channelId) {
            return message.reply(
                '⚠️ Entre em um **canal de voz** (público ou qualquer um) e use o comando de novo.'
            );
        }

        const loading = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x1db954)
                    .setTitle('🔎 Buscando…')
                    .setDescription(`**${q.slice(0, 100)}**`)
            ]
        });

        let list;
        try {
            list = await searchList(q, 5);
        } catch (err) {
            return loading.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('❌ Erro na busca')
                        .setDescription(friendlyError(err))
                ]
            });
        }

        if (!list?.length) {
            return loading.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xf59e0b)
                        .setTitle('Nenhum resultado')
                        .setDescription('Tente outro nome.')
                ]
            });
        }

        const modeLabel = privateMode ? '🔒 Privada' : '🌐 Pública';
        const embed = new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle(`🔎 ${modeLabel} · ${q.slice(0, 40)}`)
            .setDescription(
                list
                    .map((it, i) => {
                        const dur = fmtDur(it.duration);
                        return `**${i + 1}.** ${it.title}\n🎤 ${it.artist || '—'} · ⏱️ ${dur}`;
                    })
                    .join('\n\n')
                    .slice(0, 4000)
            )
            .setFooter({
                text: privateMode
                    ? 'Sala privada será criada'
                    : `Toca em: ${message.member.voice.channel?.name || 'seu canal'}`
            });

        if (list[0]?.artwork) embed.setThumbnail(list[0].artwork);

        const rowNums = new ActionRowBuilder();
        list.slice(0, 5).forEach((_, i) => {
            rowNums.addComponents(
                new ButtonBuilder()
                    .setCustomId(`mplay_${message.author.id}_${i}`)
                    .setLabel(String(i + 1))
                    .setStyle(ButtonStyle.Success)
            );
        });

        // Alternar modo
        const rowMode = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mplay_mode_pub_${message.author.id}`)
                .setLabel('Público')
                .setEmoji('🌐')
                .setStyle(!privateMode ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`mplay_mode_priv_${message.author.id}`)
                .setLabel('Privado')
                .setEmoji('🔒')
                .setStyle(privateMode ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`mplay_cancel_${message.author.id}`)
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Danger)
        );

        let usePrivate = privateMode;

        await loading.edit({ embeds: [embed], components: [rowNums, rowMode] });

        const collector = loading.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000,
            filter: (i) => i.user.id === message.author.id
        });

        collector.on('collect', async (i) => {
            if (i.customId === `mplay_cancel_${message.author.id}`) {
                await i.update({
                    embeds: [new EmbedBuilder().setColor(0x64748b).setTitle('Cancelado')],
                    components: []
                });
                collector.stop('cancel');
                return;
            }

            if (i.customId === `mplay_mode_pub_${message.author.id}`) {
                usePrivate = false;
                embed.setTitle(`🔎 🌐 Pública · ${q.slice(0, 40)}`);
                embed.setFooter({
                    text: `Toca em: ${message.member.voice.channel?.name || 'seu canal'}`
                });
                rowMode.components[0].setStyle(ButtonStyle.Success);
                rowMode.components[1].setStyle(ButtonStyle.Secondary);
                await i.update({ embeds: [embed], components: [rowNums, rowMode] });
                return;
            }

            if (i.customId === `mplay_mode_priv_${message.author.id}`) {
                usePrivate = true;
                embed.setTitle(`🔎 🔒 Privada · ${q.slice(0, 40)}`);
                embed.setFooter({ text: 'Sala privada será criada' });
                rowMode.components[0].setStyle(ButtonStyle.Secondary);
                rowMode.components[1].setStyle(ButtonStyle.Success);
                await i.update({ embeds: [embed], components: [rowNums, rowMode] });
                return;
            }

            if (!i.customId.startsWith(`mplay_${message.author.id}_`)) {
                await i.reply({ content: 'Esta busca não é sua.', ephemeral: true });
                return;
            }

            const idx = parseInt(i.customId.split('_').pop(), 10);
            const item = list[idx];
            if (!item) {
                await i.reply({ content: 'Opção inválida.', ephemeral: true });
                return;
            }

            await i.deferUpdate().catch(() => {});

            if (!message.member.voice?.channelId) {
                await loading.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xf59e0b)
                            .setTitle('⚠️ Entre em um canal de voz')
                            .setDescription('Depois clique no número de novo.')
                    ],
                    components: [rowNums, rowMode]
                }).catch(() => {});
                return;
            }

            const query = item.youtube || `${item.title} ${item.artist || ''}`;

            try {
                await loading.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x1db954)
                            .setTitle('⏳ Preparando…')
                            .setDescription(
                                `**${item.title}**\n` +
                                    `${usePrivate ? '🔒 Sala privada' : '🌐 Canal público'} · conectando…`
                            )
                            .setThumbnail(item.artwork || null)
                    ],
                    components: []
                });

                const result = await music.startSession(
                    message.guild,
                    message.member,
                    message.channel,
                    query,
                    message.client,
                    { privateMode: usePrivate }
                );

                const mode = result.isPrivate ? '🔒 Privada' : '🌐 Pública';
                await loading.edit({
                    content: `${mode} · <#${result.voiceChannelId}>`,
                    embeds: [result.embed],
                    components: result.components
                });

                collector.stop('played');
            } catch (err) {
                console.error('[play]', err);
                await loading
                    .edit({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0xef4444)
                                .setTitle('❌ Não foi possível tocar')
                                .setDescription(String(err.message || err))
                        ],
                        components: []
                    })
                    .catch(() => {});
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'played' || reason === 'cancel') return;
            try {
                await loading.edit({ components: [] });
            } catch (_) {}
        });
    }
};
