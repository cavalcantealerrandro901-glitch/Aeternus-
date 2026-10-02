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

function profileEmbed(user, profile) {
    if (!profile) {
        return new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('Sem perfil')
            .setDescription('Crie com `O.j criar`.');
    }
    const cls = profile.classId ? player.getClass(profile.classId) : null;
    const st = xp.get(user.id) || { level: 0, xp: 0, attrs: {} };
    const photo = profile.photoUrl || user.displayAvatarURL({ size: 256 });
    const displayName = (profile.name && String(profile.name).trim()) || user.username;
    const attrs = st.attrs || {};
    const attrLines = ATTR_META.map((a) => {
        const v = Number(attrs[a.key] || 0);
        return a.emoji + ' **' + a.label + ':** ' + v;
    }).join('\n');

    return new EmbedBuilder()
        .setColor(cls?.color || 0x5865f2)
        .setTitle('✦ ' + displayName)
        .setThumbnail(photo)
        .setDescription(
            [
                (cls?.emoji || '⚔️') +
                    ' **' +
                    (cls?.name || 'Sem classe') +
                    '** · Nv **' +
                    (st.level || 0) +
                    '**',
                'XP: **' + (st.xp || 0) + '** · Pontos: **' + (st.attrPoints || 0) + '**',
                '',
                attrLines,
                '',
                'Use `O.j atributos` para gastar pontos.'
            ].join('\n')
        )
        .setFooter({ text: 'O.j atributos · O.j criar' });
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

        const profile = player.get(message.author.id);
        if (!profile) return message.reply('Sem personagem. Use `O.j criar`.');
        return message.reply(profilePayload(message.author, profile));
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
        return reply(profilePayload(interaction.user, profile));
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

        if (id.startsWith('j:attrcancel:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) {
                return safeReply(interaction, { content: 'Só o dono.', flags: MessageFlags.Ephemeral });
            }
            return safeUpdate(interaction, atributosPayload(interaction.user));
        }

        if (id.startsWith('j:attrrefresh:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) {
                return safeReply(interaction, {
                    content: 'Só o dono do perfil.',
                    flags: MessageFlags.Ephemeral
                });
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

        if (id === 'j:class' && interaction.isStringSelectMenu()) {
            const classId = interaction.values?.[0];
            if (!classId || classId === 'none') {
                return safeReply(interaction, { content: 'Classe inválida.', flags: MessageFlags.Ephemeral });
            }
            try {
                if (typeof player.setClass === 'function') player.setClass(interaction.user.id, classId);
                else if (typeof player.update === 'function') player.update(interaction.user.id, { classId });
            } catch (e) {
                return safeReply(interaction, {
                    content: 'Falha ao definir classe: ' + (e.message || e),
                    flags: MessageFlags.Ephemeral
                });
            }
            const profile = player.get(interaction.user.id);
            return safeUpdate(interaction, profilePayload(interaction.user, profile));
        }

        if (id === 'j:name' && interaction.isModalSubmit()) {
            const nome = String(interaction.fields.getTextInputValue('nome') || '').trim();
            if (nome.length < 2) {
                return safeReply(interaction, { content: 'Nome inválido.', flags: MessageFlags.Ephemeral });
            }
            if (typeof player.create === 'function') {
                player.create(interaction.user.id, { name: nome });
            }
            drafts.delete(interaction.user.id);
            const profile = player.get(interaction.user.id);
            return interaction.reply({
                content: 'Personagem **' + nome + '** criado. Escolha a classe se quiser.',
                embeds: profile ? [profileEmbed(interaction.user, profile)] : [],
                components: [classSelect('j:class')]
            });
        }
    },

    tryConsumePhotoMessage
};
