const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const player = require('../utils/player');
const xp = require('../utils/xp');

/** userId -> { step, name?, classId?, photoUrl? } */
const drafts = new Map();

function classSelect(customId = 'j:class') {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder('Escolha sua classe')
            .addOptions(
                Object.values(player.CLASSES).map((c) => ({
                    label: c.name,
                    value: c.id,
                    description: c.desc.slice(0, 100),
                    emoji: c.emoji
                }))
            )
    );
}

function profileEmbed(user, profile) {
    const cls = player.CLASSES[profile.classId] || { name: '?', emoji: '?' };
    const st = xp.get(user.id);
    const prog = xp.progress(user.id);
    const maxMana = player.maxManaFromLevel(st.level, profile.classId);
    const inv = Array.isArray(profile.inventory) ? profile.inventory : [];

    const emb = new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle(`${cls.emoji} ${profile.name}`)
        .setDescription(
            [
                `**Jogador:** ${user}`,
                `**Classe:** ${cls.emoji} ${cls.name}`,
                `**Nível:** **${st.level}** · XP **${prog.current}/${prog.need}** (${prog.pct}%)`,
                `**Mana máx.:** **${maxMana}** 🔵 (escala com o nível)`,
                '',
                '**Atributos**',
                `⚔️ Força **${st.attrs.forca}** · 🛡️ Defesa **${st.attrs.defesa}**`,
                `⚡ Agilidade **${st.attrs.agilidade}** · ❤️ Vida **${st.attrs.vida}**`,
                `💪 HP combate: **${xp.maxHp(user.id)}**`,
                '',
                '**Inventário**',
                inv.length
                    ? inv
                          .slice(-8)
                          .map((i) => `${i.emoji || '🎁'} ${i.name}`)
                          .join('\n')
                    : '_Nenhum item ainda._'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · O.j perfil' })
        .setTimestamp();

    if (profile.photoUrl) emb.setThumbnail(profile.photoUrl);
    else emb.setThumbnail(user.displayAvatarURL({ size: 128 }));

    return emb;
}

async function beginCreate(interaction) {
    if (player.has(interaction.user.id)) {
        return interaction.reply({
            content: 'Você já tem perfil. Use `O.j perfil`.',
            ephemeral: true
        });
    }

    drafts.set(interaction.user.id, { step: 'name' });

    const modal = new ModalBuilder()
        .setCustomId('j:name')
        .setTitle('Nome do personagem');
    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('nome')
                .setLabel('Como seu aventureiro se chama?')
                .setStyle(TextInputStyle.Short)
                .setMinLength(2)
                .setMaxLength(32)
                .setRequired(true)
                .setPlaceholder('Ex: Lyra, Kael, Shadow…')
        )
    );

    await interaction.showModal(modal);
}

module.exports = {
    name: 'j',
    aliases: ['jogador', 'rpg', 'personagem'],
    description: 'Perfil de jogador RPG (O.j perfil)',

    async execute(message, args) {
        const sub = String(args[0] || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{M}/gu, '');

        if (!sub || sub === 'help' || sub === 'ajuda') {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('🎮 Sistema de Jogador')
                        .setDescription(
                            [
                                '`O.j perfil` — ver sua ficha',
                                '`O.j perfil @user` — ver ficha de outro',
                                '`O.j criar` — criar / refazer convite de perfil',
                                '',
                                'Sem perfil, o bot envia um **PV** pedindo nome, classe e foto.'
                            ].join('\n')
                        )
                ]
            });
        }

        if (sub === 'criar' || sub === 'create' || sub === 'start') {
            if (player.has(message.author.id)) {
                return message.reply('Você já tem perfil. `O.j perfil`');
            }
            try {
                await message.author.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xa78bfa)
                            .setTitle('🎮 Criar perfil')
                            .setDescription('Clique para começar a criação do personagem.')
                    ],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('j:start')
                                .setLabel('Criar meu perfil')
                                .setStyle(ButtonStyle.Primary)
                        )
                    ]
                });
                return message.reply('📬 Enviei um PV para você criar o perfil.');
            } catch {
                return message.reply(
                    '❌ Não consegui te mandar PV. Abra DMs e use o botão de novo.'
                );
            }
        }

        if (sub === 'perfil' || sub === 'profile' || sub === 'ficha') {
            const target =
                message.mentions.users.first() ||
                message.author;
            const profile = player.get(target.id);
            if (!profile || !profile.name) {
                if (target.id === message.author.id) {
                    return message.reply(
                        'Você ainda não tem perfil. Use `O.j criar` (abre o PV).'
                    );
                }
                return message.reply(`${target} ainda não criou perfil de jogador.`);
            }
            return message.reply({ embeds: [profileEmbed(target, profile)] });
        }

        return message.reply('Use `O.j perfil` ou `O.j criar`.');
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('j:')) return;

        if (id === 'j:start') {
            return beginCreate(interaction);
        }

        if (id === 'j:class' && interaction.isStringSelectMenu()) {
            const draft = drafts.get(interaction.user.id);
            if (!draft?.name) {
                return interaction.reply({
                    content: 'Sessão expirada. Clique em **Criar meu perfil** de novo.',
                    ephemeral: true
                });
            }
            const classId = interaction.values[0];
            if (!player.CLASSES[classId]) {
                return interaction.reply({ content: 'Classe inválida.', ephemeral: true });
            }
            draft.classId = classId;
            draft.step = 'photo';
            drafts.set(interaction.user.id, draft);

            const cls = player.CLASSES[classId];
            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22d3ee)
                        .setTitle(`${cls.emoji} Classe: ${cls.name}`)
                        .setDescription(
                            [
                                `Nome: **${draft.name}**`,
                                '',
                                'Agora envie **uma foto** neste PV (anexo de imagem).',
                                'Ou clique em **Usar avatar do Discord**.'
                            ].join('\n')
                        )
                ],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('j:avatar')
                            .setLabel('Usar avatar do Discord')
                            .setStyle(ButtonStyle.Secondary)
                    )
                ]
            });

            // coletor de imagem no DM
            try {
                const dm = interaction.channel;
                const collector = dm.createMessageCollector({
                    filter: (m) =>
                        m.author.id === interaction.user.id &&
                        m.attachments.some((a) =>
                            /\.(png|jpe?g|gif|webp)$/i.test(a.name || a.url)
                        ),
                    time: 180_000,
                    max: 1
                });
                collector.on('collect', async (m) => {
                    const att = m.attachments.find((a) =>
                        /\.(png|jpe?g|gif|webp)$/i.test(a.name || a.url)
                    );
                    if (!att) return;
                    await finishProfile(interaction.user, {
                        name: draft.name,
                        classId: draft.classId,
                        photoUrl: att.url
                    }, dm);
                    drafts.delete(interaction.user.id);
                });
            } catch (_) {}
            return;
        }

        if (id === 'j:avatar') {
            const draft = drafts.get(interaction.user.id);
            if (!draft?.name || !draft?.classId) {
                return interaction.reply({
                    content: 'Sessão incompleta. Comece de novo.',
                    ephemeral: true
                });
            }
            const photoUrl = interaction.user.displayAvatarURL({
                size: 256,
                extension: 'png'
            });
            await finishProfile(
                interaction.user,
                { name: draft.name, classId: draft.classId, photoUrl },
                interaction.channel,
                interaction
            );
            drafts.delete(interaction.user.id);
        }
    },

    async handleModal(interaction) {
        if (interaction.customId !== 'j:name') return;
        const name = interaction.fields.getTextInputValue('nome')?.trim();
        if (!name || name.length < 2) {
            return interaction.reply({ content: 'Nome inválido.', ephemeral: true });
        }

        drafts.set(interaction.user.id, { step: 'class', name });

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(`Olá, **${name}**!`)
                    .setDescription('Escolha sua **classe** no menu abaixo.')
            ],
            components: [classSelect('j:class')],
            ephemeral: true
        });
    }
};

async function finishProfile(user, data, channel, interaction) {
    try {
        if (player.has(user.id)) {
            const msg = { content: 'Você já tinha perfil.', embeds: [] };
            if (interaction?.update) return interaction.update(msg);
            return channel.send(msg).catch(() => {});
        }

        const profile = player.create(user.id, data);
        const cls = player.CLASSES[profile.classId];

        // aplica bônus de classe nos atributos base
        try {
            const dataXp = xp.all();
            const cur = dataXp[user.id] || { xp: 0, level: 0, attrs: { ...xp.BASE_ATTR } };
            if (!cur.attrs) cur.attrs = { ...xp.BASE_ATTR };
            for (const [k, v] of Object.entries(cls.bonus || {})) {
                cur.attrs[k] = (cur.attrs[k] || 0) + Number(v || 0);
            }
            dataXp[user.id] = cur;
            require('../utils/store').save('xp.json', dataXp);
        } catch (_) {}

        const emb = profileEmbed(user, profile).setTitle(
            `✅ Perfil criado · ${cls.emoji} ${profile.name}`
        );

        if (interaction?.update) {
            await interaction.update({
                embeds: [emb],
                components: []
            });
        } else {
            await channel.send({ embeds: [emb] }).catch(() => {});
        }
    } catch (e) {
        const err = `Erro ao criar perfil: ${e.message}`;
        if (interaction?.reply) {
            await interaction.reply({ content: err, ephemeral: true }).catch(() => {});
        } else {
            await channel.send(err).catch(() => {});
        }
    }
}
