async function safeUpdate(interaction, payload) {
    try {
        if (interaction.deferred || interaction.replied) return await interaction.editReply(payload);
        return await interaction.update(payload);
    } catch (e) {
        if (e && (e.code === 10062 || e.code === 40060)) return null;
        return null;
    }
}
async function safeReply(interaction, payload) {
    try {
        const data = typeof payload === 'string' ? { content: payload, ephemeral: true } : { ephemeral: true, ...payload };
        if (interaction.deferred || interaction.replied) return await interaction.followUp(data);
        return await interaction.reply(data);
    } catch (e) {
        if (e && (e.code === 10062 || e.code === 40060)) return null;
        return null;
    }
}
const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    SlashCommandBuilder, MessageFlags
} = require('discord.js');
const player = require('../utils/player');
const xp = require('../utils/xp');
const combatStats = require('../utils/combatStats');
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

function invalidPointsMessage(userId, inv) {
    return {
        content:
            `<@${userId}> Vejo que você **não tem pontos válidos** (ou há pontos inválidos no seu perfil).\n` +
            `Sendo assim, um presentinho para você — converter **${inv.recoverable}** ponto(s) inválido(s) em pontos livres válidos.`,
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('j:attrfix:' + userId)
                    .setLabel('Aceitar')
                    .setEmoji('🎁')
                    .setStyle(ButtonStyle.Success)
            )
        ]
    };
}

function profileEmbed(user, profile, opts = {}) {
    if (!profile) {
        return new EmbedBuilder().setColor(0xef4444).setTitle('Sem perfil').setDescription('Crie com `O.j criar`.');
    }
    const cls = profile.classId ? player.getClass(profile.classId) : null;
    const st = xp.get(user.id) || { level: 0, xp: 0, attrs: {} };
    let eff = null;
    try { eff = combatStats.getEffectiveAttrs(user.id); } catch (_) {}
    const photo = profile.photoUrl || user.displayAvatarURL({ size: 256 });
    const hasName = !!(profile.name && String(profile.name).trim());
    const displayName = hasName ? String(profile.name).trim() : null;
    let eterBal = 0, cristaisBal = 0;
    try { eterBal = require('../utils/eter').get(user.id) || 0; } catch (_) {}
    try { cristaisBal = require('../utils/cp').get(user.id) || 0; } catch (_) {}
    let guildLine = '_Sem guilda_';
    try {
        const g = require('../utils/guilds').findByMember(user.id);
        if (g) {
            const tag = g.tag ? '[' + g.tag + '] ' : '';
            guildLine = '**' + tag + (g.name || 'Guilda') + '** · Nv.' + (g.level || 1);
        }
    } catch (_) {}
    const a = (eff && eff.attrs) || st.attrs || {};
    const showLevel = eff ? eff.level : st.level;
    const showXp = eff ? eff.xp : st.xp;
    let manaMax = 20 + Number(showLevel || 0) * 4;
    try {
        if (typeof player.maxManaFromLevel === 'function') manaMax = player.maxManaFromLevel(showLevel, profile.classId);
        const mb = Number(eff?.extra?.manaBonus || eff?.passMods?.manaBonus || 0);
        if (mb) manaMax = Math.floor(manaMax * (1 + mb));
    } catch (_) {}
    const classLine = cls ? '**Classe:** ' + (cls.emoji || '⚔️') + ' ' + cls.name : '**Classe:** _Sem classe_';
    const classDesc = cls?.desc ? '_' + String(cls.desc).slice(0, 220) + '_' : null;
    const emb = new EmbedBuilder()
        .setColor((cls && cls.color) || 0xa78bfa)
        .setTitle(displayName || 'Sem nome')
        .setThumbnail(photo)
        .setDescription([
            !hasName ? '_Use `O.j editar nome <nome>` para definir seu nome._' : null,
            classLine, classDesc, '',
            '🎚️ **Nível** ' + Number(showLevel || 0) + ' · **XP** ' + Number(showXp || 0).toLocaleString('pt-BR'),
            '', '💙 **Mana máx:** ' + Number(manaMax).toLocaleString('pt-BR'),
            '', '✨ **Éter** ' + Number(eterBal).toLocaleString('pt-BR') + ' · 💠 **cristais** ' + Number(cristaisBal).toLocaleString('pt-BR'),
            '', '🏰 **Guilda:** ' + guildLine,
            '', '─────────────────────────────', '**Atributos** _(base + classe + equipamento)_', '',
            '💪 **força:** ' + Number(a.forca ?? 0),
            '⚡ **agilidade:** ' + Number(a.agilidade ?? 0),
            '🛡️ **defesa:** ' + Number(a.defesa ?? 0),
            '🧠 **inteligência:** ' + Number(a.inteligencia ?? 0),
            '✨ **vitalidade:** ' + Number(a.vida ?? 0),
            '🍀 **sorte:** ' + Number(a.sorte ?? 0),
            '─────────────────────────────'
        ].filter((x) => x != null).join('\n'));
    emb.setFooter({ text: ['Aeternus • jogador • perfil', new Date().toLocaleDateString('pt-BR'), opts.guildName || null].filter(Boolean).join(' • ') });
    emb.setTimestamp();
    return emb;
}

function atributosPayload(user) {
    const st = xp.get(user.id);
    let attrs = st.attrs || {};
    try { attrs = (combatStats.getEffectiveAttrs(user.id) || {}).attrs || attrs; } catch (_) {}
    const points = Number(st.attrPoints || 0);
    const profile = player.get(user.id);
    const cls = profile ? player.getClass(profile.classId) : null;
    const nome = (profile?.name || user.username || 'Aventureiro').toUpperCase();
    const photo = profile?.photoUrl || user.displayAvatarURL({ size: 256, extension: 'png' });
    const attrLines = ATTR_META.map((a) => a.emoji + ' **' + a.label + '** · `' + Number(attrs[a.key] || 0) + '`');
    const emb = new EmbedBuilder()
        .setColor(cls?.color || 0xc4b5fd)
        .setTitle('✦ AETERNUS • ATRIBUTOS')
        .setThumbnail(photo)
        .setDescription([
            '👤 **' + nome + '**',
            (cls?.emoji || '⚔️') + ' **' + (cls?.name || 'Sem classe') + '** · Nv **' + Number(st.level || 0) + '**',
            '', '⚔️ **ATRIBUTOS** _(efetivos)_', ...attrLines, '',
            points > 0 ? '✦ Pontos disponíveis: **' + points + '**' : '✦ Pontos disponíveis: **0**'
        ].join('\n'))
        .setFooter({ text: '+1 · Gastar vários · Redistribuir' });
    const components = [];
    for (let i = 0; i < ATTR_META.length; i += 4) {
        const row = new ActionRowBuilder();
        for (const a of ATTR_META.slice(i, i + 4)) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('j:attrplus:' + a.key + ':' + user.id)
                    .setLabel(('+1 ' + a.label).slice(0, 80))
                    .setEmoji(a.emoji)
                    .setStyle(points > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(points <= 0)
            );
        }
        components.push(row);
    }
    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('j:attrdist:' + user.id).setLabel('Gastar vários').setEmoji('⚖️').setStyle(ButtonStyle.Primary).setDisabled(points <= 0),
        new ButtonBuilder().setCustomId('j:attrredis:' + user.id).setLabel('Redistribuir').setEmoji('🔄').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('j:attrrefresh:' + user.id).setLabel('Atualizar').setStyle(ButtonStyle.Secondary)
    ));
    return { embeds: [emb], components };
}

function profilePayload(user, profile, opts = {}) {
    return { embeds: [profileEmbed(user, profile, opts)], components: [] };
}

async function beginCreate(interaction) {
    if (player.has(interaction.user.id)) {
        return interaction.reply({ content: 'Você já tem perfil. Use `O.j perfil`.', flags: MessageFlags.Ephemeral });
    }
    drafts.set(interaction.user.id, { step: 'name' });
    const modal = new ModalBuilder().setCustomId('j:name').setTitle('Nome do personagem');
    modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nome').setLabel('Nome do aventureiro').setStyle(TextInputStyle.Short).setMinLength(2).setMaxLength(32).setRequired(true)
    ));
    await interaction.showModal(modal);
}

module.exports = {
    name: 'j',
    aliases: ['jogador', 'personagem', 'perfiljogador'],
    description: 'Perfil de jogador / atributos',
    category: 'rpg',
    profileEmbed,
    drafts,
    photoWait,
    data: new SlashCommandBuilder()
        .setName('j')
        .setDescription('Personagem e atributos')
        .addSubcommand((s) => s.setName('perfil').setDescription('Ver perfil'))
        .addSubcommand((s) => s.setName('criar').setDescription('Criar personagem'))
        .addSubcommand((s) => s.setName('atributos').setDescription('Ver e gastar pontos de atributo')),

    async execute(message, args) {
        const sub = (args[0] || 'perfil').toLowerCase();
        if (sub === 'criar') {
            if (player.has(message.author.id)) return message.reply('Você já tem perfil.');
            if (typeof player.create === 'function') {
                player.create(message.author.id, { name: message.author.username });
                return message.reply('Personagem criado. Use `O.j perfil` e `O.classe`.');
            }
            return message.reply('Sistema indisponível.');
        }
        if (sub === 'atributos' || sub === 'attrs' || sub === 'stats') {
            const inv = typeof xp.scanInvalidAttrs === 'function' ? xp.scanInvalidAttrs(message.author.id) : null;
            if (inv && inv.hasInvalid) return message.reply(invalidPointsMessage(message.author.id, inv));
            return message.reply(atributosPayload(message.author));
        }
        const target = message.mentions.users.first() || message.author;
        const profile = player.get(target.id);
        if (!profile) {
            if (target.id === message.author.id) return message.reply('Sem personagem. Use `O.j criar`.');
            return message.reply(String(target) + ' ainda não tem personagem.');
        }
        return message.reply(profilePayload(target, profile, { guildName: message.guild?.name }));
    },

    async executeSlash(interaction) {
        const sub = interaction.options.getSubcommand(false) || 'perfil';
        const reply = (p) => interaction.replied || interaction.deferred ? interaction.editReply(p) : interaction.reply(p);
        if (sub === 'criar') return beginCreate(interaction);
        if (sub === 'atributos') {
            const inv = typeof xp.scanInvalidAttrs === 'function' ? xp.scanInvalidAttrs(interaction.user.id) : null;
            if (inv && inv.hasInvalid) return reply(invalidPointsMessage(interaction.user.id, inv));
            return reply(atributosPayload(interaction.user));
        }
        const profile = player.get(interaction.user.id);
        if (!profile) return reply({ content: 'Sem personagem. Use `/j criar`.', ephemeral: true });
        return reply(profilePayload(interaction.user, profile, { guildName: interaction.guild?.name }));
    },

    async handleComponent(interaction) {
        const id = String(interaction.customId || '');
        if (id.startsWith('j:attrfix:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) return safeReply(interaction, { content: 'Só o dono pode aceitar.', flags: MessageFlags.Ephemeral });
            const res = typeof xp.convertInvalidAttrs === 'function' ? xp.convertInvalidAttrs(ownerId) : { ok: false, error: 'Indisponível.' };
            if (!res.ok) return safeReply(interaction, { content: String(res.error || 'Nada a converter.'), flags: MessageFlags.Ephemeral });
            const payload = atributosPayload(interaction.user);
            payload.content = '🎁 Convertidos **' + (res.converted || 0) + '** → **' + res.attrPoints + '** pontos livres válidos.';
            return safeUpdate(interaction, payload);
        }
        if (id.startsWith('j:attrplus:')) {
            const parts = id.split(':');
            const attrKey = normalizeAttrKey(parts[2]);
            const ownerId = parts[3];
            const meta = ATTR_META.find((a) => a.key === attrKey);
            if (!meta) return safeReply(interaction, { content: 'Botão antigo. Use `O.j atributos`.', flags: MessageFlags.Ephemeral });
            if (String(interaction.user.id) !== String(ownerId)) return safeReply(interaction, { content: 'Só o dono.', flags: MessageFlags.Ephemeral });
            const spent = xp.spendAttrPoint(ownerId, attrKey);
            if (!spent?.ok) return safeReply(interaction, { content: String(spent?.error || 'Falha.'), flags: MessageFlags.Ephemeral });
            const payload = atributosPayload(interaction.user);
            payload.content = '✅ **' + meta.emoji + ' ' + meta.label + '** +1';
            return safeUpdate(interaction, payload);
        }
        if (id.startsWith('j:attrdist:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) return safeReply(interaction, { content: 'Só o dono.', flags: MessageFlags.Ephemeral });
            const pts = Number(xp.get(ownerId).attrPoints || 0);
            if (pts <= 0) return safeReply(interaction, { content: 'Sem pontos.', flags: MessageFlags.Ephemeral });
            const rows = [];
            for (let i = 0; i < ATTR_META.length; i += 2) {
                const row = new ActionRowBuilder();
                for (const a of ATTR_META.slice(i, i + 2)) {
                    row.addComponents(new ButtonBuilder().setCustomId('j:attrpick:' + a.key + ':' + ownerId).setLabel((a.emoji + ' ' + a.label).slice(0, 80)).setStyle(ButtonStyle.Secondary));
                }
                rows.push(row);
            }
            rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('j:attrcancel:' + ownerId).setLabel('Cancelar').setStyle(ButtonStyle.Danger)));
            return safeUpdate(interaction, { content: '**' + pts + '** pts — escolha o atributo:', embeds: [], components: rows });
        }
        if (id.startsWith('j:attrpick:')) {
            const parts = id.split(':');
            const attrKey = normalizeAttrKey(parts[2]);
            const ownerId = parts[3];
            const meta = ATTR_META.find((a) => a.key === attrKey);
            if (!meta || String(interaction.user.id) !== String(ownerId)) return safeReply(interaction, { content: 'Inválido.', flags: MessageFlags.Ephemeral });
            const pts = Number(xp.get(ownerId).attrPoints || 0);
            if (pts <= 0) return safeUpdate(interaction, atributosPayload(interaction.user));

            const modal = new ModalBuilder()
                .setCustomId('j:attramount:' + attrKey + ':' + ownerId)
                .setTitle('Distribuir pontos — ' + meta.label);

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('quantidade')
                        .setLabel('Quantidade de pontos')
                        .setPlaceholder('Digite um número válido (1 a ' + pts + ')')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(String(pts).length)
                )
            );

            return interaction.showModal(modal);
        }
        if (id.startsWith('j:attrqty:')) {
            const parts = id.split(':');
            const attrKey = normalizeAttrKey(parts[2]);
            const ownerId = parts[3];
            const amount = Math.floor(Number(parts[4]) || 0);
            const meta = ATTR_META.find((a) => a.key === attrKey);
            if (!meta || String(interaction.user.id) !== String(ownerId) || amount <= 0) return safeReply(interaction, { content: 'Inválido.', flags: MessageFlags.Ephemeral });
            const spent = xp.spendAttrPoints(ownerId, attrKey, amount);
            if (!spent?.ok) return safeReply(interaction, { content: String(spent?.error || 'Falha.'), flags: MessageFlags.Ephemeral });
            const payload = atributosPayload(interaction.user);
            payload.content = '✅ **1 ponto** investido em ' + meta.emoji + ' **' + meta.label + '** → **+' + spent.gained + '** atributo(s).';
            return safeUpdate(interaction, payload);
        }
        if (id.startsWith('j:attrcancel:') || id.startsWith('j:attrrefresh:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) return safeReply(interaction, { content: 'Só o dono.', flags: MessageFlags.Ephemeral });
            return safeUpdate(interaction, atributosPayload(interaction.user));
        }
        if (id.startsWith('j:attrredis:')) {
            const ownerId = id.split(':')[2];
            if (String(interaction.user.id) !== String(ownerId)) return safeReply(interaction, { content: 'Só o dono.', flags: MessageFlags.Ephemeral });
            const res = xp.redistribuirAttrs(ownerId);
            if (!res?.ok) return safeReply(interaction, { content: 'Falha ao redistribuir.', flags: MessageFlags.Ephemeral });
            await safeUpdate(interaction, atributosPayload(interaction.user));
            return interaction.followUp({ content: res.refund > 0 ? '🔄 **' + res.refund + '** pontos devolvidos.' : '🔄 Já na base.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        if (id === 'j:start') return beginCreate(interaction);
    },

    async handleModal(interaction) {
        if (interaction.customId.startsWith('j:attramount:')) {
            const parts = interaction.customId.split(':');
            const attrKey = normalizeAttrKey(parts[2]);
            const ownerId = parts[3];
            const meta = ATTR_META.find((a) => a.key === attrKey);

            if (!meta || String(interaction.user.id) !== String(ownerId)) {
                return interaction.reply({ content: 'Solicitação inválida.', flags: MessageFlags.Ephemeral });
            }

            const raw = String(interaction.fields.getTextInputValue('quantidade') || '').trim();

            // Revalidação completa no momento do depósito.
            // Isso impede que um valor antigo ou incompatível seja aplicado.
            if (!raw || !/^\\d+$/.test(raw)) {
                return interaction.reply({
                    content: '❌ O valor informado não é válido. Digite apenas um número inteiro positivo.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const amount = Number(raw);
            const current = xp.get(ownerId) || {};
            const available = Number(current.attrPoints || 0);
            const attrs = current.attrs || {};

            if (!Object.prototype.hasOwnProperty.call(attrs, attrKey)) {
                return interaction.reply({
                    content: '❌ Esse atributo não é compatível com o sistema atual.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!Number.isSafeInteger(amount) || amount < 1) {
                return interaction.reply({
                    content: '❌ A quantidade precisa ser um número inteiro maior que **0**.',
                    flags: MessageFlags.Ephemeral
                });
            }

            if (amount > available) {
                return interaction.reply({
                    content: '❌ Valor incompatível: você informou **' + amount + '**, mas possui apenas **' + available + '** ponto(s) disponíveis.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const spent = xp.spendAttrPoints(ownerId, attrKey, amount);
            if (!spent?.ok) {
                return interaction.reply({ content: String(spent?.error || 'Não foi possível distribuir os pontos.'), flags: MessageFlags.Ephemeral });
            }

            const payload = atributosPayload(interaction.user);
            payload.content = '✅ **' + spent.spent + '** ponto(s) investido(s) em ' + meta.emoji + ' **' + meta.label + '** → **+' + spent.gained + '** atributo(s).';
            return interaction.reply(payload);
        }

        if (interaction.customId !== 'j:name') return;
        const nome = interaction.fields.getTextInputValue('nome').trim();
        if (nome.length < 2) return interaction.reply({ content: 'Nome muito curto.', flags: MessageFlags.Ephemeral });
        if (typeof player.create === 'function') {
            player.create(interaction.user.id, { name: nome, photoUrl: interaction.user.displayAvatarURL({ size: 256 }) });
            const profile = player.get(interaction.user.id);
            return interaction.reply({ content: '✅ Personagem **' + nome + '** criado!', embeds: [profileEmbed(interaction.user, profile, { guildName: interaction.guild?.name })] });
        }
        return interaction.reply({ content: 'Sistema indisponível.', flags: MessageFlags.Ephemeral });
    }
};
