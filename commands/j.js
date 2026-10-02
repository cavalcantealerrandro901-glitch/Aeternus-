async function safeUpdate(interaction, payload) {
    try {
        if (interaction.deferred || interaction.replied) return await interaction.editReply(payload);
        return await interaction.update(payload);
    } catch (e) {
        if (e && (e.code === 10062 || e.code === 40060)) return null;
        try {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply(
                    typeof payload === 'object'
                        ? { ...payload, ephemeral: true }
                        : { content: String(payload), ephemeral: true }
                );
            }
        } catch (_) {}
        return null;
    }
}

async function safeReply(interaction, payload) {
    try {
        const data =
            typeof payload === 'string'
                ? { content: payload, ephemeral: true }
                : { ephemeral: true, ...payload };
        if (interaction.deferred || interaction.replied) return await interaction.followUp(data);
        return await interaction.reply(data);
    } catch (e) {
        if (e && (e.code === 10062 || e.code === 40060)) return null;
        return null;
    }
}

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
    { key: 'defesa', label: 'Defesa', emoji: '🛡️' },
    { key: 'agilidade', label: 'Agilidade', emoji: '⚡' },
    { key: 'vida', label: 'Vida', emoji: '❤️' },
    { key: 'inteligencia', label: 'Intel.', emoji: '🧠' },
    { key: 'sorte', label: 'Sorte', emoji: '🍀' },
    { key: 'precisao', label: 'Precisão', emoji: '🎯' },
    { key: 'resistencia', label: 'Resist.', emoji: '🪨' }
];

function normalizeAttrKey(key) {
    const k = String(key || '').toLowerCase().trim();
    if (k === 'constituicao' || k === 'defense') return 'defesa';
    if (k === 'strength' || k === 'force') return 'forca';
    if (k === 'agility') return 'agilidade';
    if (k === 'life' || k === 'hp' || k === 'vitalidade') return 'vida';
    if (k === 'intel' || k === 'intelligence' || k === 'espirito') return 'inteligencia';
    if (k === 'luck') return 'sorte';
    if (k === 'accuracy' || k === 'crit') return 'precisao';
    if (k === 'res' || k === 'resistance') return 'resistencia';
    return k;
}

function classSelect(customId = 'j:class') {
    const classesMod = require('../utils/classes');
    let list = classesMod.listSelectableClasses
        ? classesMod.listSelectableClasses()
        : Object.values(player.CLASSES || {});
    list = (list || []).filter((c) => c && c.id && c.name).slice(0, 25);
    const options =
        list.length > 0
            ? list.map((c) => {
                  const label = String(c.name || c.id).slice(0, 100) || c.id;
                  const value = String(c.id).slice(0, 100);
                  let description =
                      (c.rarityName || c.rarity || 'Comum') + ' · ' + String(c.desc || '').slice(0, 40);
                  description = description.slice(0, 100) || 'Classe';
                  const opt = { label, value, description };
                  const em = c.emoji && String(c.emoji);
                  if (em && em.length <= 4 && !em.includes(':')) opt.emoji = em;
                  return opt;
              })
            : [{ label: 'Nenhuma classe', value: 'none', description: 'Cadastre classes' }];
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder('Escolha sua classe')
            .addOptions(options)
    );
}

function profileEmbed(user, profile, opts = {}) {
    if (!profile) {
        return new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('Sem perfil')
            .setDescription('Crie com `O.j criar`.');
    }

    const cls = profile.classId ? player.getClass(profile.classId) : null;
    const st = xp.get(user.id) || { level: 0, xp: 0, attrs: {} };
    const photo = profile.photoUrl || user.displayAvatarURL({ size: 256 });
    const hasName = !!(profile.name && String(profile.name).trim());
    const displayName = hasName ? String(profile.name).trim() : null;

    let eterBal = 0;
    let cristaisBal = 0;
    try {
        eterBal = require('../utils/eter').get(user.id) || 0;
    } catch (_) {}
    try {
        cristaisBal = require('../utils/cp').get(user.id) || 0;
    } catch (_) {
        try {
            const cristais = require('../utils/cristais');
            if (cristais && typeof cristais.get === 'function') cristaisBal = cristais.get(user.id) || 0;
        } catch (_) {}
    }

    let guildLine = '_Sem guilda_';
    try {
        const g = require('../utils/guilds').findByMember(user.id);
        if (g) {
            const tag = g.tag ? '[' + g.tag + ']' : '';
            guildLine =
                '**' + (tag ? tag + ' ' : '') + (g.name || 'Guilda') + '** · Nv.' + (g.level || 1);
        }
    } catch (_) {}

    const a = st.attrs || {};
    const forca = Number(a.forca ?? 0);
    const agilidade = Number(a.agilidade ?? 0);
    const defesa = Number(a.defesa ?? a.constituicao ?? 0);
    const inteligencia = Number(a.inteligencia ?? a.espirito ?? 0);
    const vitalidade = Number(a.vitalidade ?? a.vida ?? 0);
    const sorte = Number(a.sorte ?? 0);

    let manaMax = 20 + Number(st.level || 0) * 4;
    try {
        if (typeof player.maxManaFromLevel === 'function') {
            manaMax = player.maxManaFromLevel(st.level, profile.classId);
        } else if (typeof xp.maxMana === 'function') {
            manaMax = xp.maxMana(user.id);
        }
    } catch (_) {}

    const classLine = cls
        ? '**Classe:** ' + (cls.emoji || '⚔️') + ' ' + cls.name
        : '**Classe:** _Sem classe — use `O.classe`_';
    const classDesc = cls?.desc
        ? '_' +
          String(cls.desc).slice(0, 220) +
          (String(cls.desc).length > 220 ? '…' : '') +
          '_'
        : null;

    const titleName = displayName || 'Sem nome';
    const emb = new EmbedBuilder()
        .setColor((cls && cls.color) || 0xa78bfa)
        .setTitle(titleName)
        .setThumbnail(photo)
        .setDescription(
            [
                !hasName
                    ? '_Use `O.j editar nome <nome>` para definir seu nome._'
                    : null,
                classLine,
                classDesc,
                '',
                '🎚️ **Nível** ' +
                    Number(st.level || 0) +
                    ' · **XP** ' +
                    Number(st.xp || 0).toLocaleString('pt-BR'),
                '',
                '💙 **Mana máx:** ' + Number(manaMax).toLocaleString('pt-BR'),
                '',
                '✨ **Éter** ' +
                    Number(eterBal).toLocaleString('pt-BR') +
                    ' · 💠 **cristais** ' +
                    Number(cristaisBal).toLocaleString('pt-BR'),
                '',
                '🏰 **Guilda:** ' + guildLine,
                '',
                '─────────────────────────────',
                '**Atributos**',
                '',
                '💪 **força:** ' + forca,
                '⚡ **agilidade:** ' + agilidade,
                '🛡️ **defesa:** ' + defesa,
                '🧠 **inteligência:** ' + inteligencia,
                '✨ **vitalidade:** ' + vitalidade,
                '🍀 **sorte:** ' + sorte,
                '─────────────────────────────'
            ]
                .filter((x) => x != null)
                .join('\n')
        );

    const serverName = opts.guildName || opts.serverName || null;
    const dateStr = new Date().toLocaleDateString('pt-BR');
    emb.setFooter({
        text: ['Aeternus • jogador • perfil', dateStr, serverName].filter(Boolean).join(' • ')
    });
    emb.setTimestamp();
    return emb;
}

function atributosPayload(user) {
    const st = xp.get(user.id);
    const attrs = st.attrs || {};
    const points = Number(st.attrPoints || 0);
    const profile = player.get(user.id);
    const cls = profile ? player.getClass(profile.classId) : null;
    const nome = (profile?.name || user.username || 'Aventureiro').toUpperCase();
    const level = Number(st.level || 0);
    const hpMax = typeof xp.maxHp === 'function' ? xp.maxHp(user.id) : 0;
    const manaMax = typeof xp.maxMana === 'function' ? xp.maxMana(user.id) : 0;
    const photo = profile?.photoUrl || user.displayAvatarURL({ size: 256, extension: 'png' });

    const attrLines = ATTR_META.map((a) => {
        const v = Number(attrs[a.key] || 0);
        return a.emoji + ' **' + a.label + '** · `' + v + '`';
    });

    const emb = new EmbedBuilder()
        .setColor(cls?.color || 0xc4b5fd)
        .setTitle('✦ AETERNUS • ATRIBUTOS')
        .setThumbnail(photo)
        .setDescription(
            [
                '👤 **' + nome + '**',
                (cls?.emoji || '⚔️') +
                    ' **' +
                    (cls?.name || 'Sem classe') +
                    '** · Nv **' +
                    level +
                    '**',
                '❤️ HP `' +
                    Number(hpMax).toLocaleString('pt-BR') +
                    '` · 🔷 Mana `' +
                    Number(manaMax).toLocaleString('pt-BR') +
                    '`',
                '',
                '⚔️ **ATRIBUTOS**',
                ...attrLines,
                '',
                points > 0
                    ? '✦ Pontos disponíveis: **' + points + '** — clique em **+1** para gastar'
                    : '✦ Pontos disponíveis: **0** — suba de nível para ganhar mais'
            ].join('\n')
        )
        .setFooter({ text: 'Cada +1 gasta 1 ponto · Gastar vários · Redistribuir' });

    const components = [];
    for (let i = 0; i < ATTR_META.length; i += 4) {
        const row = new ActionRowBuilder();
        for (const a of ATTR_META.slice(i, i + 4)) {
            const v = Number(attrs[a.key] || 0);
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('j:attrplus:' + a.key + ':' + user.id)
                    .setLabel(('+1 ' + a.label + ' (' + v + ')').slice(0, 80))
                    .setEmoji(a.emoji)
                    .setStyle(points > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(points <= 0)
            );
        }
        components.push(row);
    }

    components.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('j:attrdist:' + user.id)
                .setLabel('Gastar vários')
                .setEmoji('⚖️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(points <= 0),
            new ButtonBuilder()
                .setCustomId('j:attrredis:' + user.id)
                .setLabel('Redistribuir')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('j:attrrefresh:' + user.id)
                .setLabel('Atualizar')
                .setStyle(ButtonStyle.Secondary)
        )
    );

    return { embeds: [emb], components };
}

function profilePayload(user, profile, opts = {}) {
    return { embeds: [profileEmbed(user, profile, opts)], components: [] };
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
                .setLabel('Nome do aventureiro')
                .setStyle(TextInputStyle.Short)
                .setMinLength(2)
                .setMaxLength(32)
                .setRequired(true)
        )
    );
    await interaction.showModal(modal);
}

const dmPhoto = require('../utils/dmPhoto');
async function tryConsumePhotoMessage(message, client) {
    if (client) return dmPhoto.tryConsumePhotoMessage(message, client);
    return false;
}

module.exports = {
    name: 'j',
    aliases: ['jogador', 'personagem', 'perfiljogador'],
    description: 'Perfil de jogador / atributos',
    category: 'rpg',
    profileEmbed,
    data: new SlashCommandBuilder()
        .setName('j')
        .setDescription('Personagem e atributos')
        .addSubcommand((s) => s.setName('perfil').setDescription('Ver perfil'))
        .addSubcommand((s) => s.setName('criar').setDescription('Criar personagem'))
        .addSubcommand((s) => s.setName('atributos').setDescription('Ver e gastar pontos de atributo'))
        .addSubcommand((s) => s.setName('foto').setDescription('Definir foto do personagem')),

    async execute(message, args) {
        const sub = (args[0] || 'perfil').toLowerCase();

        if (sub === 'criar') {
            if (player.has(message.author.id)) {
                return message.reply('Você já tem perfil. Use `O.j perfil`.');
            }
            if (typeof player.create === 'function') {
                player.create(message.author.id, { name: message.author.username });
                return message.reply('Personagem criado. Use `O.j perfil` e `O.classe`.');
            }
            return message.reply('Sistema de personagem indisponível.');
        }

        if (sub === 'atributos' || sub === 'attrs' || sub === 'stats') {
            return message.reply(atributosPayload(message.author));
        }

        if (sub === 'foto') {
            photoWait.set(message.author.id, Date.now() + 120000);
            return message.reply('Manda a imagem no meu PV em até 2 min, ou anexa aqui.');
        }

        const target = message.mentions.users.first() || message.author;
        const profile = player.get(target.id);
        if (!profile) {
            if (target.id === message.author.id) return message.reply('Sem personagem. Use `O.j criar`.');
            return message.reply(String(target) + ' ainda não tem personagem.');
        }
        return message.reply(
            profilePayload(target, profile, { guildName: message.guild?.name })
        );
    },

    async executeSlash(interaction) {
        const sub = interaction.options.getSubcommand(false) || 'perfil';
        const reply = (p) =>
            interaction.replied || interaction.deferred
                ? interaction.editReply(p)
                : interaction.reply(p);

        if (sub === 'criar') return beginCreate(interaction);
        if (sub === 'atributos') return reply(atributosPayload(interaction.user));
        if (sub === 'foto') {
            photoWait.set(interaction.user.id, Date.now() + 120000);
            return reply({ content: 'Manda a imagem no meu PV em até 2 minutos.', ephemeral: true });
        }

        const profile = player.get(interaction.user.id);
        if (!profile) return reply({ content: 'Sem personagem. Use `/j criar`.', ephemeral: true });
        return reply(
            profilePayload(interaction.user, profile, { guildName: interaction.guild?.name })
        );
    },

    async handleComponent(interaction) {
        const id = String(interaction.customId || '');

        if (id.startsWith('j:attrplus:')) {
            const parts = id.split(':');
            const attrKey = normalizeAttrKey(parts[2]);
            const ownerId = parts[3];
            const meta = ATTR_META.find((a) => a.key === attrKey);
            if (!meta) {
                return safeReply(interaction, {
                    content: '⚠️ Botão antigo. Use `O.j atributos`.',
                    flags: MessageFlags.Ephemeral
                });
            }
            if (String(interaction.user.id) !== String(ownerId)) {
                return safeReply(interaction, {
                    content: 'Só o dono do perfil.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const spent = xp.spendAttrPoint(ownerId, attrKey);
            if (!spent?.ok) {
                return safeReply(interaction, {
                    content: String(spent?.error || 'Falha ao gastar ponto.'),
                    flags: MessageFlags.Ephemeral
                });
            }
            const payload = atributosPayload(interaction.user);
            payload.content = '✅ **' + meta.emoji + ' ' + meta.label + '** +1';
            return safeUpdate(interaction, payload);
        }

        if (id.startsWith('j:attrdist:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) {
                return safeReply(interaction, {
                    content: 'Só o dono do perfil.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const pts = Number(xp.get(ownerId).attrPoints || 0);
            if (pts <= 0) {
                return safeReply(interaction, {
                    content: 'Sem pontos.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const rows = [];
            for (let i = 0; i < ATTR_META.length; i += 2) {
                const row = new ActionRowBuilder();
                for (const a of ATTR_META.slice(i, i + 2)) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('j:attrpick:' + a.key + ':' + ownerId)
                            .setLabel((a.emoji + ' ' + a.label).slice(0, 80))
                            .setStyle(ButtonStyle.Secondary)
                    );
                }
                rows.push(row);
            }
            rows.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('j:attrcancel:' + ownerId)
                        .setLabel('Cancelar')
                        .setStyle(ButtonStyle.Danger)
                )
            );
            return safeUpdate(interaction, {
                content: '**' + pts + '** pts — escolha o atributo:',
                embeds: [],
                components: rows
            });
        }

        if (id.startsWith('j:attrpick:')) {
            const parts = id.split(':');
            const attrKey = normalizeAttrKey(parts[2]);
            const ownerId = parts[3];
            const meta = ATTR_META.find((a) => a.key === attrKey);
            if (!meta || String(interaction.user.id) !== String(ownerId)) {
                return safeReply(interaction, { content: 'Inválido.', flags: MessageFlags.Ephemeral });
            }
            const pts = Number(xp.get(ownerId).attrPoints || 0);
            if (pts <= 0) return safeUpdate(interaction, atributosPayload(interaction.user));

            const qtyRow = new ActionRowBuilder();
            const options = [1, 2, 3, 5, 10].filter((n) => n <= pts);
            for (const n of options) {
                qtyRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId('j:attrqty:' + attrKey + ':' + ownerId + ':' + n)
                        .setLabel('+' + n)
                        .setStyle(ButtonStyle.Success)
                );
            }
            qtyRow.addComponents(
                new ButtonBuilder()
                    .setCustomId('j:attrcancel:' + ownerId)
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Danger)
            );
            return safeUpdate(interaction, {
                content: meta.emoji + ' **' + meta.label + '** — quantos pontos?',
                embeds: [],
                components: [qtyRow]
            });
        }

        if (id.startsWith('j:attrqty:')) {
            const parts = id.split(':');
            const attrKey = normalizeAttrKey(parts[2]);
            const ownerId = parts[3];
            const amount = Math.floor(Number(parts[4]) || 0);
            const meta = ATTR_META.find((a) => a.key === attrKey);
            if (!meta || String(interaction.user.id) !== String(ownerId) || amount <= 0) {
                return safeReply(interaction, { content: 'Inválido.', flags: MessageFlags.Ephemeral });
            }
            const spent = xp.spendAttrPoints(ownerId, attrKey, amount);
            if (!spent?.ok) {
                return safeReply(interaction, {
                    content: String(spent?.error || 'Falha.'),
                    flags: MessageFlags.Ephemeral
                });
            }
            const payload = atributosPayload(interaction.user);
            payload.content = '✅ +' + spent.spent + ' em ' + meta.emoji + ' ' + meta.label;
            return safeUpdate(interaction, payload);
        }

        if (id.startsWith('j:attrcancel:') || id.startsWith('j:attrrefresh:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) {
                return safeReply(interaction, { content: 'Só o dono.', flags: MessageFlags.Ephemeral });
            }
            return safeUpdate(interaction, atributosPayload(interaction.user));
        }

        if (id.startsWith('j:attrredis:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) {
                return safeReply(interaction, {
                    content: 'Só o dono do perfil.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const res = xp.redistribuirAttrs(ownerId);
            if (!res?.ok) {
                return safeReply(interaction, {
                    content: 'Falha ao redistribuir.',
                    flags: MessageFlags.Ephemeral
                });
            }
            await safeUpdate(interaction, atributosPayload(interaction.user));
            return interaction
                .followUp({
                    content:
                        res.refund > 0
                            ? '🔄 **' + res.refund + '** pontos devolvidos.'
                            : '🔄 Já na base.',
                    flags: MessageFlags.Ephemeral
                })
                .catch(() => {});
        }

        if (id === 'j:start') return beginCreate(interaction);

        if (id === 'j:class' && interaction.isStringSelectMenu()) {
            const draft = drafts.get(interaction.user.id);
            if (!draft?.name) {
                return safeReply(interaction, {
                    content: 'Sessão expirada.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const classId = interaction.values[0];
            if (classId === 'none' || (!player.getClass(classId) && !player.CLASSES?.[classId])) {
                return safeReply(interaction, {
                    content: 'Classe inválida.',
                    flags: MessageFlags.Ephemeral
                });
            }
            try {
                player.create(interaction.user.id, {
                    name: draft.name,
                    classId,
                    photoUrl: interaction.user.displayAvatarURL({ size: 256 })
                });
                drafts.delete(interaction.user.id);
                const profile = player.get(interaction.user.id);
                return safeUpdate(interaction, {
                    content: '✅ Personagem criado!',
                    embeds: [
                        profileEmbed(interaction.user, profile, {
                            guildName: interaction.guild?.name
                        })
                    ],
                    components: []
                });
            } catch (e) {
                return safeReply(interaction, {
                    content: 'Erro: ' + (e.message || e),
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },

    async handleModal(interaction) {
        if (interaction.customId !== 'j:name') return;
        const nome = interaction.fields.getTextInputValue('nome').trim();
        if (nome.length < 2) {
            return interaction.reply({
                content: 'Nome muito curto.',
                flags: MessageFlags.Ephemeral
            });
        }
        drafts.set(interaction.user.id, { step: 'class', name: nome });
        return interaction.reply({
            content: 'Nome **' + nome + '**. Escolha a classe:',
            components: [classSelect('j:class')],
            flags: MessageFlags.Ephemeral
        });
    },

    tryConsumePhotoMessage
};
