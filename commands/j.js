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
const classesUtil = require('../utils/classes');
const abilities = require('../utils/abilities');

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
                Object.values(player.CLASSES || {}).map((c) => ({
                    label: c.name,
                    value: c.id,
                    description: (c.desc || '').slice(0, 100),
                    emoji: c.emoji
                }))
            )
    );
}

function resolveClass(profile) {
    const id = profile?.classId || profile?.class;
    try {
        return classesUtil.getClass(id) || player.getClass(id);
    } catch (_) {
        return player.getClass(id);
    }
}

function xpBar(cur, need, width = 12) {
    const n = Math.max(1, Number(need) || 1);
    const c = Math.max(0, Math.min(n, Number(cur) || 0));
    const filled = Math.round((c / n) * width);
    return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

function abilityDmgLabel(a) {
    if (!a) return '';
    const power = Number(a.power);
    if (Number.isFinite(power) && power > 0) {
        const dmg = Math.round(power * 100);
        return ' · 💥 `' + dmg + '`';
    }
    if (a.effect === 'heal' || a.type === 'heal') return ' · 💚 cura';
    if (a.type === 'buff' || a.kind === 'passive') return ' · ✨ buff';
    if (a.effect) return ' · ✨ ' + String(a.effect).slice(0, 16);
    return '';
}

function itemStatLine(it) {
    if (!it) return '';
    const eff = it.effects || {};
    const bits = Object.entries(eff)
        .filter(([, v]) => Number(v))
        .map(([k, v]) => k.slice(0, 5) + ' ' + Number(v))
        .slice(0, 4);
    const extra = bits.length ? ' · ' + bits.join(', ') : '';
    return (it.emoji || '•') + ' **' + (it.name || it.id) + '**' + extra;
}

function profileEmbed(user, profile) {
    const cls = resolveClass(profile);
    const st = xp.get(user.id);
    const prog = typeof xp.progress === 'function' ? xp.progress(user.id) : null;
    const rank = typeof xp.rankOf === 'function' ? xp.rankOf(user.id) : null;
    const attrs = (typeof xp.getAttrs === 'function' ? xp.getAttrs(user.id) : st.attrs) || {};
    const photo = profile.photoUrl || user.displayAvatarURL({ size: 256 });
    const hpMax = typeof xp.maxHp === 'function' ? xp.maxHp(user.id) : 100;
    const manaMax =
        typeof xp.maxMana === 'function'
            ? xp.maxMana(user.id)
            : player.maxManaFromLevel(st.level, profile.classId);
    const exclusive = cls.exclusiveOwner ? ' · 🔒 **Única**' : '';
    const rarity = cls.rarityName || cls.rarity || 'Comum';

    let equippedAb = { active: [], passive: [] };
    try {
        equippedAb = abilities.getEquippedAbilities(user.id);
    } catch (_) {}

    const actLine =
        (equippedAb.active || [])
            .filter(Boolean)
            .map((a) => (a.emoji || '⚔️') + ' **' + a.name + '**' + abilityDmgLabel(a))
            .slice(0, 4)
            .join('\n') || '_nenhuma_';
    const pasLine =
        (equippedAb.passive || [])
            .filter(Boolean)
            .map((a) => (a.emoji || '✨') + ' **' + a.name + '**' + abilityDmgLabel(a))
            .slice(0, 5)
            .join('\n') || '_nenhuma_';

    let eqLine = '_vazio_';
    try {
        const eq = player.getEquipped(user.id) || {};
        const parts = [];
        if (eq.weapon) parts.push(itemStatLine(eq.weapon));
        if (eq.armor) parts.push(itemStatLine(eq.armor));
        if (eq.accessory) parts.push(itemStatLine(eq.accessory));
        if (parts.length) eqLine = parts.join('\n');
    } catch (_) {}

    const attrBits = [
        '💪 ' + Number(attrs.forca || 0),
        '⚡ ' + Number(attrs.agilidade || 0),
        '🛡️ ' + Number(attrs.constituicao || attrs.defesa || 0),
        '🧠 ' + Number(attrs.inteligencia || 0),
        '✨ ' + Number(attrs.espirito || 0),
        '🍀 ' + Number(attrs.sorte || 0)
    ].join(' · ');

    const level = Number(st.level || 1);
    const xpCur = prog ? Number(prog.current || prog.xpInLevel || 0) : Number(st.xp || 0);
    const xpNeed = prog ? Number(prog.needed || prog.next || 100) : 100;
    const bar = xpBar(xpCur, xpNeed);
    const rankTxt = rank != null ? '#' + rank : '—';
    const pts = Number(st.attrPoints || 0);
    const eter = Number(profile.eter ?? st.eter ?? 0);

    const emb = new EmbedBuilder()
        .setColor(cls.color || 0xa78bfa)
        .setAuthor({
            name: profile.name + ' · Nv.' + level,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle((cls.emoji || '⚔️') + ' ' + cls.name + exclusive)
        .setDescription(
            [
                (cls.desc || '').slice(0, 180),
                '',
                '🏅 **Ranking** ' + rankTxt + ' · **Raridade** ' + rarity,
                '📈 **XP** `' + xpCur.toLocaleString('pt-BR') + '` / `' + xpNeed.toLocaleString('pt-BR') + '`',
                '`' + bar + '`',
                '',
                '❤️ **HP** `' +
                    Number(hpMax).toLocaleString('pt-BR') +
                    '` · 🔷 **Mana** `' +
                    Number(manaMax).toLocaleString('pt-BR') +
                    '`',
                eter ? '💎 **Éter** `' + eter.toLocaleString('pt-BR') + '`' : null,
                pts > 0 ? '✦ **Pontos de atributo:** ' + pts : null
            ]
                .filter(Boolean)
                .join('\n')
        )
        .addFields(
            { name: '📊 Atributos', value: attrBits || '—', inline: false },
            { name: '⚔️ Habilidades ativas', value: actLine.slice(0, 1020), inline: false },
            { name: '✨ Passivas', value: pasLine.slice(0, 1020), inline: false },
            { name: '🎒 Equipado', value: eqLine.slice(0, 1020), inline: false }
        )
        .setThumbnail(photo)
        .setFooter({ text: 'ID ' + user.id + ' · O.j atributos · O.habilidades · O.passivas' });

    if (cls.banner) emb.setImage(cls.banner);
    return emb;
}

function profilePayload(user, profile) {
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('j:gotoattrs:' + user.id)
                .setLabel('Atributos')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('j:refreshperfil:' + user.id)
                .setLabel('Atualizar')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary)
        )
    ];
    return { embeds: [profileEmbed(user, profile)], components: rows };
}

function atributosPayload(user) {
    const st = xp.get(user.id);
    const attrs = st.attrs || {};
    const points = Number(st.attrPoints || 0);
    const profile = player.get(user.id);
    const cls = profile ? resolveClass(profile) : null;
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
        return a.emoji + ' **' + pad(a.label) + '** `' + String(v).padStart(3, ' ') + '`   `[ + ]`';
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
        .setFooter({
            text: 'Use [ + ] para 1 ponto · Depositar = atributo + quantidade · Redistribuir'
        });

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
                .setLabel('Depositar')
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

    return { embeds: [emb], components };
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

        if (id.startsWith('j:gotoattrs:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) {
                return interaction.reply({
                    content: 'Só o dono pode abrir os atributos.',
                    flags: MessageFlags.Ephemeral
                });
            }
            return interaction.update(atributosPayload(interaction.user));
        }
        if (id.startsWith('j:refreshperfil:')) {
            const ownerId = id.split(':')[2];
            if (!player.has(ownerId)) {
                return interaction.reply({
                    content: 'Perfil não encontrado.',
                    flags: MessageFlags.Ephemeral
                });
            }
            if (String(interaction.user.id) !== String(ownerId)) {
                try {
                    const u = await interaction.client.users.fetch(ownerId);
                    return interaction.update(profilePayload(u, player.get(ownerId)));
                } catch (_) {
                    return interaction.reply({
                        content: 'Não foi possível atualizar.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
            return interaction.update(profilePayload(interaction.user, player.get(ownerId)));
        }

        if (id === 'j:start') return beginCreate(interaction);

        if (id.startsWith('j:attrplus:')) {
            const parts = id.split(':');
            let attrKey = String(parts[2] || '').toLowerCase();
            const ownerId = parts[3];
            if (attrKey === 'vida' || attrKey === 'defesa') attrKey = 'constituicao';
            const meta = ATTR_META.find((a) => a.key === attrKey);
            const eph = MessageFlags.Ephemeral;
            if (!meta) {
                return interaction.reply({
                    content: '⚠️ Botão antigo. Use `O.j atributos` de novo.',
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
                const msg = String((spent && spent.error) || 'Não foi possível gastar o ponto.').trim();
                return interaction.reply({ content: msg, flags: eph });
            }
            try {
                await interaction.update(atributosPayload(interaction.user));
            } catch (_) {
                await interaction
                    .reply({ content: '✅ **' + meta.label + '** aumentou!', flags: eph })
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
                    content: 'Você não tem pontos para distribuir.',
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
                            .setStyle(ButtonStyle.Primary)
                    );
                }
                rows.push(row);
            }
            rows.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('j:attrcancel:' + ownerId)
                        .setLabel('Voltar à ficha')
                        .setStyle(ButtonStyle.Secondary)
                )
            );
            return interaction.update({
                content: '⚖️ **Depositar pontos** · **' + pts + '** disponível(is)\nEscolha **um atributo**:',
                embeds: [],
                components: rows
            });
        }

        if (id.startsWith('j:attrcancel:')) {
            return interaction.update(atributosPayload(interaction.user));
        }

        if (id.startsWith('j:attrredis:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) {
                return interaction.reply({
                    content: 'Só o dono do perfil pode usar estes botões.',
                    flags: MessageFlags.Ephemeral
                });
            }
            if (typeof xp.redistribuirAttrs === 'function') {
                xp.redistribuirAttrs(ownerId);
            }
            return interaction.update(atributosPayload(interaction.user));
        }

        if (id.startsWith('j:attrpick:')) {
            const parts = id.split(':');
            let attrKey = String(parts[2] || '').toLowerCase();
            const ownerId = parts[3];
            if (attrKey === 'vida' || attrKey === 'defesa') attrKey = 'constituicao';
            const meta = ATTR_META.find((a) => a.key === attrKey);
            if (!meta) {
                return interaction.reply({ content: 'Atributo inválido.', flags: MessageFlags.Ephemeral });
            }
            if (String(interaction.user.id) !== String(ownerId)) {
                return interaction.reply({
                    content: 'Só o dono do perfil pode usar estes botões.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const pts = Number(xp.get(ownerId).attrPoints || 0);
            if (pts <= 0) return interaction.update(atributosPayload(interaction.user));
            const opts = [];
            for (const n of [1, 2, 3, 5, 10]) if (n <= pts) opts.push(n);
            const half = Math.floor(pts / 2);
            if (half >= 1 && !opts.includes(half)) opts.push(half);
            if (!opts.includes(pts)) opts.push(pts);
            opts.sort((a, b) => a - b);
            const rows = [];
            let row = new ActionRowBuilder();
            for (let i = 0; i < opts.length; i++) {
                const n = opts[i];
                const label = n === pts ? 'Tudo (' + n + ')' : String(n);
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('j:attrqty:' + attrKey + ':' + ownerId + ':' + n)
                        .setLabel(label.slice(0, 80))
                        .setStyle(n === pts ? ButtonStyle.Success : ButtonStyle.Primary)
                );
                if (row.components.length >= 5 || i === opts.length - 1) {
                    rows.push(row);
                    row = new ActionRowBuilder();
                }
            }
            rows.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('j:attrdist:' + ownerId)
                        .setLabel('Trocar atributo')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('j:attrcancel:' + ownerId)
                        .setLabel('Voltar à ficha')
                        .setStyle(ButtonStyle.Secondary)
                )
            );
            return interaction.update({
                content: '⚖️ **' + meta.emoji + ' ' + meta.label + '**\nVocê tem **' + pts + '** pontos. Quanto depositar?',
                embeds: [],
                components: rows
            });
        }

        if (id.startsWith('j:attrqty:')) {
            const parts = id.split(':');
            let attrKey = String(parts[2] || '').toLowerCase();
            const ownerId = parts[3];
            const amount = Number(parts[4] || 1);
            if (attrKey === 'vida' || attrKey === 'defesa') attrKey = 'constituicao';
            if (String(interaction.user.id) !== String(ownerId)) {
                return interaction.reply({
                    content: 'Só o dono do perfil pode usar estes botões.',
                    flags: MessageFlags.Ephemeral
                });
            }
            if (typeof xp.spendAttrPoints === 'function') {
                xp.spendAttrPoints(ownerId, attrKey, amount);
            } else {
                for (let i = 0; i < amount; i++) xp.spendAttrPoint(ownerId, attrKey);
            }
            return interaction.update(atributosPayload(interaction.user));
        }

        if (id === 'j:avatar') {
            const draft = photoWait.get(interaction.user.id);
            if (!draft) {
                return interaction.reply({
                    content: 'Sessão de foto expirada. Use `O.j criar` de novo.',
                    flags: MessageFlags.Ephemeral
                });
            }
            try {
                player.create(interaction.user.id, {
                    name: draft.name,
                    classId: draft.classId,
                    photoUrl: interaction.user.displayAvatarURL({ size: 256, extension: 'png' })
                });
                photoWait.delete(interaction.user.id);
                drafts.delete(interaction.user.id);
                return interaction.update({
                    content: '✅ Personagem criado com o avatar do Discord!',
                    embeds: [],
                    components: []
                });
            } catch (e) {
                return interaction.reply({ content: 'Erro: ' + e.message, flags: MessageFlags.Ephemeral });
            }
        }
    },

    async handleModal(interaction) {
        if (interaction.customId !== 'j:name') return;
        const nome = interaction.fields.getTextInputValue('nome').trim();
        drafts.set(interaction.user.id, { step: 'class', name: nome });
        return interaction.reply({
            content: 'Escolha a **classe** de **' + nome + '**:',
            components: [classSelect('j:class')],
            flags: MessageFlags.Ephemeral
        });
    }
};
