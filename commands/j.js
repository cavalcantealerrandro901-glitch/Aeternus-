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
                `_Atributos: use o comando de atributos do servidor._`
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

function profilePayload(user, profile, viewerId) {
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
        ]
    });
    photoWait.set(user.id, { ...draft, at: Date.now() });
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
        .addSubcommand((s) => s.setName('atributos').setDescription('Ver e gastar pontos de atributo')),

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
            if (!player.has(message.author.id) && !xp.get(message.author.id).level) {
                // still allow attrs without full profile
            }
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
            const profile = player.get(target.id);
            return message.reply(profilePayload(target, profile, message.author.id));
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
        // perfil
        if (!player.has(i.user.id)) {
            return i.reply({
                content: 'Você ainda não tem personagem. Use `/jogador criar`.',
                ephemeral: true
            });
        }
        return i.reply(profilePayload(i.user, player.get(i.user.id), i.user.id));
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
                            `Personagem **${draft.name}**.\n\nContinue no **PV** para enviar a **foto**.`
                        )
                ],
                components: []
            });

            try {
                await startPhotoWait(interaction.user, draft);
            } catch (_) {
                await interaction.followUp({
                    content: 'Não consegui abrir seu PV. Ative DMs do servidor e tente de novo.',
                    ephemeral: true
                });
            }
            return;
        }
    },

    async handleModal(interaction) {
        if (interaction.customId !== 'j:name') return;
        const nome = interaction.fields.getTextInputValue('nome')?.trim();
        if (!nome || nome.length < 2) {
            return interaction.reply({ content: 'Nome inválido.', ephemeral: true });
        }
        drafts.set(interaction.user.id, { step: 'class', name: nome });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('j:class')
            .setPlaceholder('Escolha sua classe')
            .addOptions(
                Object.values(player.CLASSES).map((c) => ({
                    label: c.name,
                    value: c.id,
                    description: (c.desc || '').slice(0, 100),
                    emoji: c.emoji
                }))
            );

        await interaction.reply({
            content: `Nome **${nome}** registrado. Escolha a classe:`,
            components: [new ActionRowBuilder().addComponents(menu)],
            ephemeral: true
        });
    },

    // chamado pelo playerOnboard / messageCreate quando chega foto no DM
    async handlePhotoMessage(message) {
        const wait = photoWait.get(message.author.id);
        if (!wait) return false;
        const img = message.attachments.find((a) =>
            (a.contentType || '').startsWith('image/') ||
            /\.(png|jpe?g|gif|webp)$/i.test(a.name || '')
        );
        if (!img) {
            await message.reply('Envie uma **imagem** (png, jpg, gif ou webp).');
            return true;
        }
        try {
            player.create(message.author.id, {
                name: wait.name,
                classId: wait.classId,
                photoUrl: img.url
            });
            photoWait.delete(message.author.id);
            drafts.delete(message.author.id);
            const profile = player.get(message.author.id);
            await message.reply({
                content: '✅ Personagem criado!',
                embeds: [profileEmbed(message.author, profile)]
            });
        } catch (e) {
            await message.reply('Falha ao criar personagem: ' + (e.message || e));
        }
        return true;
    }
};
