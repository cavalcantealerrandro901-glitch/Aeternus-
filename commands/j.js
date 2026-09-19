const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    SlashCommandBuilder,
    MessageFlags
} = require('discord.js');
const player = require('../utils/player');
const xp = require('../utils/xp');

const drafts = new Map();
const photoWait = new Map();

const ATTR_META = [
    { key: 'forca', label: 'Força', emoji: '💪' },
    { key: 'agilidade', label: 'Agilidade', emoji: '⚡' },
    { key: 'constituicao', label: 'Constituição', emoji: '🛡️' },
    { key: 'inteligencia', label: 'Inteligência', emoji: '🧠' },
    { key: 'espirito', label: 'Espírito', emoji: '✨' },
    { key: 'sorte', label: 'Sorte', emoji: '🍀' }
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
                '**Nível** ' + st.level + ' · **XP** ' + Number(st.xp || 0).toLocaleString('pt-BR'),
                '**Mana máx.** ' + player.maxManaFromLevel(st.level, profile.classId),
                '',
                '_Atributos: use `O.j atributos`._'
            ].join('\n')
        )
        .addFields({
            name: 'Classe',
            value: (cls.emoji || '⚔️') + ' **' + cls.name + '**\n' + (cls.desc || ''),
            inline: false
        })
        .setThumbnail(photo)
        .setImage(cls.banner);
}

function atributosPayload(user) {
    const st = xp.get(user.id);
    const attrs = st.attrs || {};
    const points = Number(st.attrPoints || 0);
    const profile = player.get(user.id);
    const cls = profile ? player.getClass(profile.classId) : null;
    const nome = (profile?.name || user.username || 'Aventureiro').toUpperCase();
    const level = Number(st.level || 0);
    const hpMax = xp.maxHp(user.id);
    const manaMax = xp.maxMana(user.id);
    const hp = hpMax;
    const mana = manaMax;
    const photo =
        profile?.photoUrl || user.displayAvatarURL({ size: 256, extension: 'png' });

    const pad = (label, n = 14) => {
        const s = String(label);
        return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
    };

    const attrLines = ATTR_META.map((a) => {
        const v = Number(attrs[a.key] || 0);
        return (
            a.emoji +
            ' **' +
            pad(a.label) +
            '** `' +
            String(v).padStart(3, ' ') +
            '`   `[ + ]`'
        );
    });

    const emb = new EmbedBuilder()
        .setColor(cls?.color || 0xc4b5fd)
        .setTitle('✦ AETERNUS • FICHA DO AVENTUREIRO')
        .setThumbnail(photo)
        .setDescription(
            [
                '👤 **' + nome + '**',
                (cls?.emoji || '⚔️') +
                    ' **' +
                    (cls?.name || 'Sem classe') +
                    '** • Nível **' +
                    level +
                    '**',
                '',
                '❤️ **HP**   `' +
                    hp.toLocaleString('pt-BR') +
                    ' / ' +
                    hpMax.toLocaleString('pt-BR') +
                    '`',
                '🔷 **Mana** `' +
                    mana.toLocaleString('pt-BR') +
                    ' / ' +
                    manaMax.toLocaleString('pt-BR') +
                    '`',
                '',
                '━━━━━━━━━━━━━━━━━━',
                '⚔️ **ATRIBUTOS**',
                '━━━━━━━━━━━━━━━━━━',
                '',
                ...attrLines,
                '',
                '✦ Pontos disponíveis: **' + points + '**'
            ].join('\n')
        )
        .setFooter({ text: 'Use [ + ] para gastar 1 ponto · Redistribuir devolve à base' });

    const components = [];
    for (let i = 0; i < ATTR_META.length; i += 2) {
        const row = new ActionRowBuilder();
        for (const a of ATTR_META.slice(i, i + 2)) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('j:attrplus:' + a.key + ':' + user.id)
                    .setLabel((a.emoji + ' ' + a.label + ' +').slice(0, 80))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(points <= 0)
            );
        }
        components.push(row);
    }
    components.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('j:attrdist:' + user.id)
                .setLabel('Distribuir')
                .setEmoji('⚖️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(points <= 0),
            new ButtonBuilder()
                .setCustomId('j:attrredis:' + user.id)
                .setLabel('Redistribuir')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Danger)
        )
    );

    return {
        embeds: [emb],
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
            flags: MessageFlags.Ephemeral
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
                            'Olá, **' + draft.name + '** (' + cls.emoji + ' ' + cls.name + ')!',
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
                return message.reply(String(target) + ' ainda não tem personagem.');
            }
            return message.reply(profilePayload(target, player.get(target.id)));
        }

        return message.reply(
            [
                'Uso:',
                '`O.j perfil` — ver perfil',
                '`O.j atributos` — ficha e pontos',
                '`O.j criar` — criar personagem'
            ].join('\n')
        );
    },

    async executeSlash(i) {
        const sub = i.options.getSubcommand();
        if (sub === 'criar') {
            if (player.has(i.user.id)) {
                return i.reply({ content: 'Você já tem perfil.', flags: MessageFlags.Ephemeral });
            }
            return beginCreate(i);
        }
        if (sub === 'atributos') {
            return i.reply(atributosPayload(i.user));
        }
        if (!player.has(i.user.id)) {
            return i.reply({
                content: 'Você ainda não tem personagem. Use `/jogador criar`.',
                flags: MessageFlags.Ephemeral
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
            let attrKey = String(parts[2] || '').toLowerCase();
            const ownerId = parts[3];
            if (attrKey === 'vida' || attrKey === 'defesa') attrKey = 'constituicao';

            const meta = ATTR_META.find((a) => a.key === attrKey);
            const eph = MessageFlags.Ephemeral;

            if (!meta) {
                return interaction.reply({
                    content:
                        '⚠️ Este botão é antigo. Use `O.j atributos` de novo para abrir a ficha atualizada.',
                    flags: eph
                });
            }
            if (String(interaction.user.id) !== String(ownerId)) {
                return interaction.reply({
                    content: 'Só o dono do perfil pode usar estes botões.',
                    flags: eph
                });
            }
            const spent = xp.spendAttrPoint(ownerId, attrKey);
            if (!spent || !spent.ok) {
                const msg =
                    String((spent && spent.error) || 'Não foi possível gastar o ponto de atributo.').trim() ||
                    'Não foi possível gastar o ponto de atributo.';
                return interaction.reply({ content: msg, flags: eph });
            }
            const payload = atributosPayload(interaction.user);
            if (!payload.content && !(payload.embeds && payload.embeds.length)) {
                payload.content = '✅ Ponto aplicado. Use `O.j atributos` para ver a ficha.';
            }
            if (payload.content === null) delete payload.content;
            try {
                await interaction.update(payload);
            } catch (err) {
                await interaction
                    .reply({
                        content:
                            '✅ **' +
                            meta.label +
                            '** aumentou! Abra de novo com `O.j atributos`.',
                        flags: eph
                    })
                    .catch(() => {});
            }
            return;
        }

        if (id.startsWith('j:attrdist:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) {
                return interaction.reply({
                    content: 'Só o dono do perfil pode usar estes botões.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const pts = Number(xp.get(ownerId).attrPoints || 0);
            if (pts <= 0) {
                return interaction.reply({
                    content: 'Você não tem pontos para distribuir. Suba de nível para ganhar mais.',
                    flags: MessageFlags.Ephemeral
                });
            }
            return interaction.reply({
                content:
                    '⚖️ Você tem **' +
                    pts +
                    '** ponto(s). Toque em **[ atributo + ]** abaixo da ficha para gastar 1 ponto por clique.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (id.startsWith('j:attrredis:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) {
                return interaction.reply({
                    content: 'Só o dono do perfil pode usar estes botões.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const res = xp.redistribuirAttrs(ownerId);
            if (!res || !res.ok) {
                return interaction.reply({
                    content: 'Não foi possível redistribuir agora.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const payload = atributosPayload(interaction.user);
            await interaction.update(payload);
            return interaction
                .followUp({
                    content:
                        res.refund > 0
                            ? '🔄 Redistribuído! **' +
                              res.refund +
                              '** ponto(s) voltaram para o saldo.'
                            : '🔄 Atributos já estavam na base. Nenhum ponto a devolver.',
                    flags: MessageFlags.Ephemeral
                })
                .catch(() => {});
        }

        if (id === 'j:class' && interaction.isStringSelectMenu()) {
            const draft = drafts.get(interaction.user.id);
            if (!draft || !draft.name) {
                return interaction.reply({
                    content: 'Sessão expirada. Clique em **Criar meu perfil** de novo.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const classId = interaction.values[0];
            if (!player.CLASSES[classId]) {
                return interaction.reply({
                    content: 'Classe inválida.',
                    flags: MessageFlags.Ephemeral
                });
            }
            draft.classId = classId;
            draft.step = 'photo';
            drafts.set(interaction.user.id, draft);

            const cls = player.getClass(classId);
            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(cls.color)
                        .setTitle(cls.emoji + ' Classe escolhida: ' + cls.name)
                        .setDescription(
                            'Personagem **' +
                                draft.name +
                                '**.\n\nContinue no **PV** para enviar a **foto**, ou use o botão de avatar.'
                        )
                ],
                components: []
            });

            const ok = await startPhotoWait(interaction.user, draft);
            if (!ok) {
                await interaction.followUp({
                    content:
                        'Não consegui abrir seu PV. Use o botão **Usar avatar do Discord** se aparecer, ou ative DMs.',
                    flags: MessageFlags.Ephemeral
                });
            }
            return;
        }

        if (id === 'j:avatar') {
            const draft = drafts.get(interaction.user.id) || photoWait.get(interaction.user.id);
            if (!draft || !draft.name || !draft.classId) {
                return interaction.reply({
                    content: 'Sessão expirada. Use `O.j criar` de novo.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const photoUrl = interaction.user.displayAvatarURL({ size: 256, extension: 'png' });
            await interaction
                .update({
                    content: '🖼️ **Usando seu avatar do Discord** como foto…',
                    embeds: [],
                    components: []
                })
                .catch(() => {});
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
            return interaction.reply({
                content: 'Nome inválido.',
                flags: MessageFlags.Ephemeral
            });
        }
        drafts.set(interaction.user.id, { step: 'class', name });
        await interaction.reply({
            content: 'Olá, **' + name + '**! Escolha sua classe:',
            components: [classSelect('j:class')],
            flags: MessageFlags.Ephemeral
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
            if (interaction && interaction.update) return interaction.update(msg);
            return channel.send(msg).catch(() => {});
        }

        const profile = player.create(user.id, data);
        const cls = player.getClass(profile.classId);

        try {
            const dataXp = xp.all();
            const cur = dataXp[user.id] || { xp: 0, level: 0, attrs: { ...xp.BASE_ATTR } };
            if (!cur.attrs) cur.attrs = { ...xp.BASE_ATTR };
            for (const [k0, v] of Object.entries(cls.bonus || {})) {
                let k = k0;
                if (k === 'defesa' || k === 'vida') k = 'constituicao';
                if (!xp.ATTR_KEYS.includes(k)) continue;
                cur.attrs[k] = (cur.attrs[k] || 0) + Number(v || 0);
            }
            dataXp[user.id] = cur;
            require('../utils/store').save('xp.json', dataXp);
        } catch (_) {}

        const emb = profileEmbed(user, profile);
        emb.setTitle('✅ ' + profile.name + ' · perfil criado');
        if (profile.photoUrl) emb.setThumbnail(profile.photoUrl);

        const notice = fromPhoto
            ? profile.photoUrl
                ? '✅ **Foto salva no perfil!** Use `O.j perfil` no servidor para ver de novo.'
                : '✅ Perfil criado (sem foto customizada).'
            : '✅ **Perfil criado com sucesso!**';

        if (interaction && interaction.update) {
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
        const err = '❌ Erro ao criar perfil: ' + e.message;
        if (interaction && interaction.reply) {
            await interaction
                .reply({ content: err, flags: MessageFlags.Ephemeral })
                .catch(() => {});
        } else if (channel && channel.send) {
            await channel.send(err).catch(() => {});
        }
    }
}
