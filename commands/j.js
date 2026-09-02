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

const drafts = new Map();
/** evita 2 collectors no mesmo usuário */
const photoCollectors = new Map();

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

function attrBar(n, max = 30) {
    const v = Math.max(0, Math.min(max, Number(n) || 0));
    const filled = Math.round((v / max) * 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function isImageAttachment(att) {
    if (!att) return false;
    const name = String(att.name || '');
    const type = String(att.contentType || '');
    if (type.startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(name) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(att.url || '');
}

function pickImageUrl(message) {
    const att = [...(message.attachments?.values?.() || message.attachments || [])].find(
        isImageAttachment
    );
    if (!att) return null;
    // proxyURL costuma ser mais estável no Discord
    return att.proxyURL || att.url || null;
}

function profileEmbed(user, profile) {
    const cls = player.getClass(profile.classId);
    const st = xp.get(user.id);
    const prog = xp.progress(user.id);
    const maxMana = player.maxManaFromLevel(st.level, profile.classId);
    const inv = Array.isArray(profile.inventory) ? profile.inventory : [];
    const photo = profile.photoUrl || user.displayAvatarURL({ size: 256 });

    const emb = new EmbedBuilder()
        .setColor(cls.color || 0xa78bfa)
        .setAuthor({
            name: `${cls.emoji} ${cls.name}`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle(`✨ ${profile.name}`)
        .setDescription(
            [
                `━━━━━━━━━━━━━━━━━━━━`,
                `Conta Discord · ${user}`,
                `Classe · **${cls.emoji} ${cls.name}**`,
                `━━━━━━━━━━━━━━━━━━━━`
            ].join('\n')
        )
        .addFields(
            {
                name: '📊 Progresso',
                value: [
                    `Nível **${st.level}**`,
                    `XP ┌${attrBar(prog.pct, 100)}┐ **${prog.pct}%**`,
                    `  ${prog.current} / ${prog.need}`
                ].join('\n'),
                inline: true
            },
            {
                name: '💪 Combate',
                value: [
                    `❤️ HP **${xp.maxHp(user.id)}**`,
                    `🔵 Mana **${maxMana}**`,
                    `_escala com o nível_`
                ].join('\n'),
                inline: true
            },
            {
                name: '📈 Atributos',
                value: [
                    `⚔️ Força   ┌${attrBar(st.attrs.forca)}┐ **${st.attrs.forca}**`,
                    `🛡️ Defesa  ┌${attrBar(st.attrs.defesa)}┐ **${st.attrs.defesa}**`,
                    `⚡ Agilidade ┌${attrBar(st.attrs.agilidade)}┐ **${st.attrs.agilidade}**`,
                    `❤️ Vida    ┌${attrBar(st.attrs.vida)}┐ **${st.attrs.vida}**`
                ].join('\n'),
                inline: false
            },
            {
                name: '🎫 Inventário',
                value: inv.length
                    ? inv
                          .slice(-6)
                          .map((i) => `${i.emoji || '🎁'} **${i.name}**`)
                          .join('\n')
                    : '_Nenhum item ainda — suba de nível (5% de drop)._',
                inline: false
            }
        )
        .setThumbnail(photo)
        .setImage(cls.banner)
        .setFooter({ text: `Aeternus · ${profile.name} · O.j perfil` })
        .setTimestamp();

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

/** Abre o PV e espera a imagem anexada */
async function startPhotoWait(user, draft) {
    const dm = await user.createDM();
    const cls = player.getClass(draft.classId);

    // para collector anterior
    const old = photoCollectors.get(user.id);
    if (old) {
        try {
            old.stop('replace');
        } catch (_) {}
    }

    await dm.send({
        embeds: [
            new EmbedBuilder()
                .setColor(cls.color)
                .setTitle(`${cls.emoji} ${draft.name} · ${cls.name}`)
                .setDescription(
                    [
                        '**Etapa final: foto do personagem**',
                        '',
                        'Envie **agora neste PV** uma **imagem** (anexo).',
                        'Formatos: PNG, JPG, GIF ou WEBP.',
                        '',
                        'Assim que eu receber, **salvo no seu perfil na hora** e mostro a ficha.',
                        '',
                        '_Ou use o botão abaixo para usar seu avatar do Discord._'
                    ].join('\n')
                )
                .setImage(cls.banner)
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

    const collector = dm.createMessageCollector({
        filter: (m) => m.author.id === user.id && !!pickImageUrl(m),
        time: 5 * 60_000,
        max: 1
    });
    photoCollectors.set(user.id, collector);

    collector.on('collect', async (m) => {
        const photoUrl = pickImageUrl(m);
        if (!photoUrl) {
            await dm
                .send('❌ Não consegui ler essa imagem. Envie outro arquivo de imagem.')
                .catch(() => {});
            return;
        }

        const d = drafts.get(user.id);
        if (!d?.name || !d?.classId) {
            await dm
                .send('⏰ Sessão expirada. Use `O.j criar` de novo no servidor.')
                .catch(() => {});
            return;
        }

        await dm
            .send({
                content:
                    '📸 **Foto recebida!** Li a imagem e estou salvando no seu perfil agora…'
            })
            .catch(() => {});

        await finishProfile(
            user,
            { name: d.name, classId: d.classId, photoUrl },
            dm,
            null,
            true
        );
        drafts.delete(user.id);
        photoCollectors.delete(user.id);
    });

    collector.on('end', async (_, reason) => {
        photoCollectors.delete(user.id);
        if (reason === 'time' && drafts.get(user.id)?.step === 'photo') {
            await dm
                .send(
                    '⏰ Tempo esgotado para enviar a foto. Use `O.j criar` no servidor para tentar de novo.'
                )
                .catch(() => {});
        }
    });
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
            return message.reply(
                [
                    '**Sistema de Jogador**',
                    '`O.j perfil` — sua ficha',
                    '`O.j perfil @user` — ficha de outro',
                    '`O.j criar` — criar perfil (PV)'
                ].join('\n')
            );
        }

        if (sub === 'criar' || sub === 'create' || sub === 'start') {
            if (player.has(message.author.id)) {
                return message.reply('Você já tem perfil. `O.j perfil`');
            }
            try {
                await message.author.send({
                    content:
                        '🎮 **Crie seu perfil Aeternus**\nClique no botão para escolher nome, classe e foto.',
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
                return message.reply('📬 Enviei um PV para você criar o perfil.');
            } catch {
                return message.reply('❌ Abra suas DMs e tente de novo.');
            }
        }

        if (sub === 'perfil' || sub === 'profile' || sub === 'ficha') {
            const target = message.mentions.users.first() || message.author;
            const profile = player.get(target.id);
            if (!profile || !profile.name) {
                if (target.id === message.author.id) {
                    return message.reply('Você ainda não tem perfil. Use `O.j criar`.');
                }
                return message.reply(`${target} ainda não criou perfil.`);
            }
            return message.reply({ embeds: [profileEmbed(target, profile)] });
        }

        return message.reply('Use `O.j perfil` ou `O.j criar`.');
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('j:')) return;

        if (id === 'j:start') return beginCreate(interaction);

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
                            `Personagem **${draft.name}**.\n\nVou te mandar (ou continuar) no **PV** para você enviar a **foto**.`
                        )
                ],
                components: []
            }).catch(() => {});

            try {
                await startPhotoWait(interaction.user, draft);
            } catch {
                await interaction
                    .followUp({
                        content:
                            '❌ Não consegui abrir seu PV. Ative mensagens diretas e use `O.j criar`.',
                        ephemeral: true
                    })
                    .catch(() => {});
            }
            return;
        }

        if (id === 'j:avatar') {
            const draft = drafts.get(interaction.user.id);
            if (!draft?.name || !draft?.classId) {
                return interaction.reply({
                    content: 'Sessão incompleta. Use `O.j criar`.',
                    ephemeral: true
                });
            }

            const old = photoCollectors.get(interaction.user.id);
            if (old) {
                try {
                    old.stop('avatar');
                } catch (_) {}
                photoCollectors.delete(interaction.user.id);
            }

            const photoUrl = interaction.user.displayAvatarURL({
                size: 512,
                extension: 'png'
            });

            await interaction.update({
                content: '🖼️ **Usando seu avatar do Discord** como foto do personagem…',
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

/**
 * @param {boolean} fromPhoto se veio de foto enviada (mensagem de aviso extra)
 */
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
        if (profile.photoUrl) {
            emb.setThumbnail(profile.photoUrl);
        }

        const notice = fromPhoto
            ? profile.photoUrl
                ? '✅ **Foto salva no perfil!** Aqui está sua ficha completa:\nUse `O.j perfil` no servidor quando quiser ver de novo.'
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
                    embeds: [emb]
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
