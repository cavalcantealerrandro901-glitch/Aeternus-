const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    SlashCommandBuilder
} = require('discord.js');
const player = require('../utils/player');
const xp = require('../utils/xp');

const drafts = new Map();
const photoWait = new Map();

const ATTR_META = [
    { key: 'forca', label: 'Força', emoji: '💪' },
    { key: 'defesa', label: 'Defesa', emoji: '🛡️' },
    { key: 'agilidade', label: 'Agilidade', emoji: '💨' },
    { key: 'vida', label: 'Vida', emoji: '❤️' }
];

function classSelect(customId = 'j:class') {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder('Escolha sua classe')
            .addOptions(
                Object.values(player.CLASSES).map((c) => ({
                    label: c.name,
                    value: c.id,
                    description: (c.desc || '').slice(0, 100),
                    emoji: c.emoji
                }))
            )
    );
}

function profileEmbed(user, profile) {
    const cls = player.getClass(profile.classId);
    const st = xp.get(user.id);
    const photo = profile.photoUrl || user.displayAvatarURL({ size: 256 });
    return new EmbedBuilder()
        .setColor(cls.color || 0xa78bfa)
        .setAuthor({
            name: `${profile.name} · ${cls.emoji || ''} ${cls.name}`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setDescription(
            [
                `**Nível** ${st.level} · **XP** ${Number(st.xp || 0).toLocaleString('pt-BR')}`,
                `**Mana máx.** ${player.maxManaFromLevel(st.level, profile.classId)}`,
                '',
                `_Atributos: use \`O.j atributos\`._`
            ].join('\n')
        )
        .addFields({
            name: 'Classe',
            value: `${cls.emoji || '⚔️'} **${cls.name}**\n${cls.desc || ''}`,
            inline: false
        })
        .setThumbnail(photo)
        .setImage(cls.banner);
}

function atributosPayload(user) {
    const st = xp.get(user.id);
    const attrs = st.attrs || { forca: 0, defesa: 0, agilidade: 0, vida: 0 };
    const points = Number(st.attrPoints || 0);

    const lines = [
        '✦ **Atributos · ' + (user.username || 'Jogador') + '**',
        '',
        ...ATTR_META.map((a) => {
            const v = Number(attrs[a.key] || 0);
            return a.emoji + ' **' + a.label + ':** ' + v;
        }),
        '',
        '💠 Pontos disponíveis: **' + points + '**',
        '_Use ➕ ao lado do atributo para gastar 1 ponto._'
    ];

    const components = ATTR_META.map((a) => {
        const v = Number(attrs[a.key] || 0);
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('j:attrinfo:' + a.key + ':' + user.id)
                .setLabel((a.emoji + ' ' + a.label + ': ' + v).slice(0, 80))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('j:attrplus:' + a.key + ':' + user.id)
                .setLabel('➕')
                .setStyle(ButtonStyle.Success)
                .setDisabled(points <= 0)
        );
    });

    return {
        content: lines.join('\n'),
        embeds: [],
        components
    };
}

function profilePayload(user, profile) {
    return { embeds: [profileEmbed(user, profile)], components: [] };
}

async function beginCreate(interaction) {
    if (player.has(interaction.user.id)) {
        return interaction.reply({
            content: 'Você já tem perfil. Use `O.j perfil`.',
            ephemeral: true
        });
    }

    drafts.set(interaction.user.id, { step: 'name' });

    const modal = new ModalBuilder().setCustomId('j:name').setTitle('Nome do personagem');
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

async function startPhotoWait(user, draft) {
    try {
        const dm = await user.createDM();
        const cls = player.getClass(draft.classId);
        await dm.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(cls.color || 0xa78bfa)
                    .setTitle('📸 Foto do personagem')
                    .setDescription(
                        [
                            `Olá, **${draft.name}** (${cls.emoji} ${cls.name})!`,
                            '',
                            'Envie **uma imagem** nesta conversa para usar no perfil.',
                            'Quando a foto for recebida, o personagem será criado na hora.'
                        ].join('\n')
                    )
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('j:avatar')
                        .setLabel('Usar avatar do Discord')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🖼️')
                )
            ]
        });
        photoWait.set(user.id, { ...draft, at: Date.now() });
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = {
    name: 'j',
    aliases: ['jogador', 'personagem', 'perfiljogador'],
    description: 'Perfil de jogador / atributos',
    data: new SlashCommandBuilder()
        .setName('jogador')
        .setDescription('Perfil de jogador')
        .addSubcommand((s) => s.setName('perfil').setDescription('Ver perfil'))
        .addSubcommand((s) => s.setName('criar').setDescription('Criar personagem'))
        .addSubcommand((s) =>
            s.setName('atributos').setDescription('Ver e gastar pontos de atributo')
        ),

    photoWait,

    async execute(message, args) {
        const sub = String(args[0] || 'perfil').toLowerCase();

        if (sub === 'criar' || sub === 'create') {
            if (player.has(message.author.id)) {
                return message.reply('Você já tem perfil. Use `O.j perfil`.');
            }
            return message.reply({
                content: 'Clique no botão para começar a criação do personagem.',
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('j:start')
                            .setLabel('Criar meu perfil')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('✨')
                    )
                ]
            });
        }

        if (sub === 'atributos' || sub === 'attrs' || sub === 'stats') {
            return message.reply(atributosPayload(message.author));
        }

        if (sub === 'perfil' || sub === 'profile' || !args[0]) {
            const target = message.mentions.users.first() || message.author;
            if (!player.has(target.id)) {
                if (target.id === message.author.id) {
                    return message.reply({
                        content: 'Você ainda não tem personagem.',
                        components: [
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId('j:start')
                                    .setLabel('Criar meu perfil')
                                    .setStyle(ButtonStyle.Primary)
                                    .setEmoji('✨')
                            )
                        ]
                    });
                }
                return message.reply(`${target} ainda não tem personagem.`);
            }
            return message.reply(profilePayload(target, player.get(target.id)));
        }

        return message.reply(
            [
                'Uso:',
                '`O.j perfil` — ver perfil',
                '`O.j atributos` — atributos e pontos',
                '`O.j criar` — criar personagem'
            ].join('\n')
        );
    },

    async executeSlash(i) {
        const sub = i.options.getSubcommand();
        if (sub === 'criar') {
            if (player.has(i.user.id)) {
                return i.reply({ content: 'Você já tem perfil.', ephemeral: true });
            }
            return beginCreate(i);
        }
        if (sub === 'atributos') {
            return i.reply(atributosPayload(i.user));
        }
        if (!player.has(i.user.id)) {
            return i.reply({
                content: 'Você ainda não tem personagem. Use `/jogador criar`.',
                ephemeral: true
            });
        }
        return i.reply(profilePayload(i.user, player.get(i.user.id)));
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('j:')) return;

        if (id === 'j:start') return beginCreate(interaction);

        if (id.startsWith('j:attrinfo:')) {
            return interaction.deferUpdate().catch(() => {});
        }

        if (id.startsWith('j:attrplus:')) {
            const parts = id.split(':');
            const attrKey = parts[2];
            const ownerId = parts[3];
            const meta = ATTR_META.find((a) => a.key === attrKey);
            if (!meta) {
                return interaction.reply({
                    content: 'Atributo inválido.',
                    flags: 64
                });
            }
            if (String(interaction.user.id) !== String(ownerId)) {
                return interaction.reply({
                    content: 'Só o dono do perfil pode usar estes botões.',
                    flags: 64
                });
            }
            const spent = xp.spendAttrPoint(ownerId, attrKey);
            if (!spent || !spent.ok) {
                const msg =
                    (spent && spent.error) ||
                    'Não foi possível gastar o ponto de atributo.';
                return interaction.reply({ content: msg, flags: 64 });
            }
            const payload = atributosPayload(interaction.user);
            if (!payload.content && !(payload.embeds && payload.embeds.length)) {
                payload.content = '✅ Ponto aplicado.';
            }
            await interaction.update(payload);
            return;
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

            const cls = player.getClass(classId);
            await interaction.update({
                content: null,
                embeds: [
                    new EmbedBuilder()
                        .setColor(cls.color)
                        .setTitle(`${cls.emoji} Classe escolhida: ${cls.name}`)
                        .setDescription(
                            `Personagem **${draft.name}**.\n\nContinue no **PV** para enviar a **foto**, ou use o botão de avatar.`
                        )
                ],
                components: []
            });

            const ok = await startPhotoWait(interaction.user, draft);
            if (!ok) {
                await interaction.followUp({
                    content:
                        'Não consegui abrir seu PV. Use o botão **Usar avatar do Discord** se aparecer, ou ative DMs.',
                    ephemeral: true
                });
            }
            return;
        }

        if (id === 'j:avatar') {
            const draft = drafts.get(interaction.user.id) || photoWait.get(interaction.user.id);
            if (!draft?.name || !draft?.classId) {
                return interaction.reply({
                    content: 'Sessão expirada. Use `O.j criar` de novo.',
                    ephemeral: true
                });
            }
            const photoUrl = interaction.user.displayAvatarURL({ size: 256, extension: 'png' });
            await interaction.update({
                content: '🖼️ **Usando seu avatar do Discord** como foto…',
                embeds: [],
                components: []
            }).catch(() => {});
            await finishProfile(
                interaction.user,
                { name: draft.name, classId: draft.classId, photoUrl },
                interaction.channel,
                null,
                true
            );
            drafts.delete(interaction.user.id);
            photoWait.delete(interaction.user.id);
            return;
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
            content: `Olá, **${name}**! Escolha sua classe:`,
            components: [classSelect('j:class')],
            ephemeral: true
        });
    }
};

async function finishProfile(user, data, channel, interaction, fromPhoto = false) {
    try {
        if (player.has(user.id)) {
            const msg = {
                content: 'Você já tinha um perfil. Use `O.j perfil` no servidor.',
                embeds: [],
                components: []
            };
            if (interaction?.update) return interaction.update(msg);
            return channel.send(msg).catch(() => {});
        }

        const profile = player.create(user.id, data);
        const cls = player.getClass(profile.classId);

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

        const emb = profileEmbed(user, profile);
        emb.setTitle(`✅ ${profile.name} · perfil criado`);
        if (profile.photoUrl) emb.setThumbnail(profile.photoUrl);

        const notice = fromPhoto
            ? profile.photoUrl
                ? '✅ **Foto salva no perfil!** Use `O.j perfil` no servidor para ver de novo.'
                : '✅ Perfil criado (sem foto customizada).'
            : '✅ **Perfil criado com sucesso!**';

        if (interaction?.update) {
            await interaction.update({
                content: notice,
                embeds: [emb],
                components: []
            });
        } else {
            await channel
                .send({
                    content: notice,
                    embeds: [emb],
                    components: []
                })
                .catch(() => {});
        }
    } catch (e) {
        const err = `❌ Erro ao criar perfil: ${e.message}`;
        if (interaction?.reply) {
            await interaction.reply({ content: err, ephemeral: true }).catch(() => {});
        } else if (channel?.send) {
            await channel.send(err).catch(() => {});
        }
    }
}
