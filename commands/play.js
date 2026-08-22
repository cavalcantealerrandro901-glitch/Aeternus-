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
    description: 'Busca e toca música com botões interativos',
    async execute(message, args) {
        if (!message.guild) return message.reply('Use em um servidor.');

        // O.play @user → convida para a sala atual
        const mentioned = message.mentions.users.first();
        if (mentioned && !args.filter((a) => !a.includes(mentioned.id) && !a.startsWith('<@')).join(' ').trim()) {
            const st = music.getQueue(message.guild.id);
            if (!st.privateChannelId) {
                return message.reply('Não há sala de música ativa. Use `O.play <música>` primeiro.');
            }
            const member = await message.guild.members.fetch(mentioned.id).catch(() => null);
            if (!member) return message.reply('Membro não encontrado.');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`minvite_${message.guild.id}_${st.privateChannelId}_${mentioned.id}`)
                    .setLabel('Entrar na sala')
                    .setEmoji('🎧')
                    .setStyle(ButtonStyle.Success)
            );

            return message.reply({
                content: `${mentioned}, **${message.author.username}** te convidou para ouvir música!`,
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x1db954)
                        .setTitle('🎧 Convite para a sala')
                        .setDescription(
                            `Sala: <#${st.privateChannelId}>\n` +
                                (st.now ? `Tocando: **${st.now.title}**` : 'Aguardando música…')
                        )
                ],
                components: [row]
            });
        }

        const q = args
            .filter((a) => !a.startsWith('<@'))
            .join(' ')
            .trim();

        if (!q) {
            return message.reply(
                '**Uso**\n' +
                    '`O.play <música>` — busca e toca\n' +
                    '`O.play @user` — convida alguém para a sala\n' +
                    '`O.fila` · `O.pular` · `O.pausar` · `O.parar`'
            );
        }

        const me = message.guild.members.me;
        const need = [
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers
        ];
        if (me && !me.permissions.has(need)) {
            return message.reply(
                'Preciso de **Conectar**, **Falar**, **Gerenciar Canais** e **Mover Membros**.'
            );
        }

        if (!message.member.voice?.channelId) {
            return message.reply(
                '⚠️ Entre em um **canal de voz** primeiro e use `O.play <música>` de novo.'
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
                        .setDescription('Tente outro nome ou artista.')
                ]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle(`🔎 Resultados · ${q.slice(0, 50)}`)
            .setDescription(
                list
                    .map((it, i) => {
                        const dur = fmtDur(it.duration);
                        return `**${i + 1}.** ${it.title}\n🎤 ${it.artist || '—'} · ⏱️ ${dur}`;
                    })
                    .join('\n\n')
                    .slice(0, 4000)
            )
            .setFooter({ text: `${message.author.username} · escolha em 60s` });

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

        const rowExtra = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mplay_cancel_${message.author.id}`)
                .setLabel('Cancelar')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary)
        );

        await loading.edit({ embeds: [embed], components: [rowNums, rowExtra] });

        const collector = loading.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000,
            filter: (i) => i.user.id === message.author.id
        });

        collector.on('collect', async (i) => {
            if (i.customId === `mplay_cancel_${message.author.id}`) {
                await i.update({
                    embeds: [
                        new EmbedBuilder().setColor(0x64748b).setTitle('Busca cancelada')
                    ],
                    components: []
                });
                collector.stop('cancel');
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
                            .setDescription('Depois clique de novo no número.')
                    ],
                    components: [rowNums, rowExtra]
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
                                `**${item.title}**\n${item.artist || ''}\n\n` +
                                    `🔒 Sala privada · bot conectando · toca em 5s`
                            )
                            .setThumbnail(item.artwork || null)
                    ],
                    components: []
                });

                const result = await music.startPrivateSession(
                    message.guild,
                    message.member,
                    message.channel,
                    query,
                    message.client
                );

                const inviteRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `minvite_${message.guild.id}_${result.voiceChannelId}_${message.author.id}`
                        )
                        .setLabel('Convidar amigos')
                        .setEmoji('👥')
                        .setStyle(ButtonStyle.Primary),
                    ...result.components[0].components
                );

                // max 5 buttons per row — split if needed
                const controls = result.components;
                const extra = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`minvite_pick_${message.guild.id}_${result.voiceChannelId}`)
                        .setLabel('Convidar')
                        .setEmoji('👥')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`mctl_stop_${message.guild.id}`)
                        .setLabel('Parar')
                        .setEmoji('⏹️')
                        .setStyle(ButtonStyle.Danger)
                );

                await loading.edit({
                    content: result.createdNew
                        ? `🔒 Sala criada: <#${result.voiceChannelId}>`
                        : `🎧 Sala: <#${result.voiceChannelId}>`,
                    embeds: [result.embed],
                    components: [...controls, extra]
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
                                .setDescription(
                                    `${err.message || err}\n\n` +
                                        `**${item.title}**` +
                                        (item.youtube ? `\n${item.youtube}` : '')
                                )
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
