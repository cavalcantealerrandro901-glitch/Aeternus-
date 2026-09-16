const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const xp = require('../utils/xp');
const actionStats = require('../utils/actionStats');

const PAGE_SIZE = 5;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function medal(i) {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return String(i + 1).padStart(2, '0');
}

function displayTag(user, fallbackId) {
    if (!user) return '@usuário-' + String(fallbackId).slice(-4);
    const name = user.globalName || user.username || 'id-' + fallbackId;
    return '@' + name;
}

function parseMode(args) {
    const a = String(args?.[0] || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    const b = String(args?.[1] || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    if (a === 'xp' || a === 'nivel' || a === 'level' || a === 'exp' || a === 'topxp') return 'xp';
    if (a === 'tapa' || a === 'slap' || a === 'toptapa') return 'tapa';

    if (
        a === 'local' ||
        a === 'servidor' ||
        a === 'server' ||
        a === 'eterlocal' ||
        (a === 'eter' && (b === 'local' || b === 'servidor' || b === 'server' || !b))
    ) {
        return 'local';
    }

    if (a === 'global' || a === 'mundo' || a === 'all') return 'global';
    return 'global';
}

function modeMeta(mode) {
    if (mode === 'xp') {
        return {
            rankLabel: 'XP',
            titleEmoji: '⭐',
            unitEmoji: '⭐',
            unit: 'XP',
            color: 0xa78bfa,
            scope: 'local'
        };
    }
    if (mode === 'tapa') {
        return {
            rankLabel: 'Tapa',
            titleEmoji: '👋',
            unitEmoji: '👋',
            unit: 'tapas',
            color: 0xfb7185,
            scope: 'local'
        };
    }
    if (mode === 'local') {
        return {
            rankLabel: 'Éter',
            titleEmoji: '✨',
            unitEmoji: '✨',
            unit: 'éter',
            color: 0x22d3ee,
            scope: 'local'
        };
    }
    return {
        rankLabel: 'Éter',
        titleEmoji: '🏆',
        unitEmoji: '✨',
        unit: 'éter',
        color: 0xfbbf24,
        scope: 'global'
    };
}

async function buildList(mode, guild) {
    if (mode === 'tapa') {
        const raw = actionStats.all('tapa', guild?.id) || {};
        let entries = Object.entries(raw).map(([id, v]) => ({
            id,
            value: Number(v || 0),
            level: 0
        }));
        if (guild) {
            const memberIds = new Set();
            try {
                const members = await guild.members.fetch().catch(() => null);
                if (members) members.forEach((m) => memberIds.add(m.id));
            } catch (_) {}
            if (memberIds.size) entries = entries.filter((e) => memberIds.has(e.id));
        }
        return entries.filter((e) => e.value > 0).sort((a, b) => b.value - a.value);
    }

    if (mode === 'xp') {
        const data = xp.all() || {};
        let entries = Object.entries(data).map(([id, v]) => ({
            id,
            value: Number(v?.xp || 0),
            level: Number(v?.level || 0)
        }));

        if (guild) {
            const memberIds = new Set();
            try {
                const members = await guild.members.fetch().catch(() => null);
                if (members) members.forEach((m) => memberIds.add(m.id));
            } catch (_) {}
            if (memberIds.size) entries = entries.filter((e) => memberIds.has(e.id));
        }

        return entries
            .filter((e) => e.value > 0)
            .sort((a, b) => b.value - a.value || b.level - a.level);
    }

    const data = eter.all() || {};
    let entries = Object.entries(data).map(([id, v]) => ({
        id,
        value: Number(v || 0)
    }));

    if (mode === 'local' && guild) {
        const memberIds = new Set();
        try {
            const members = await guild.members.fetch().catch(() => null);
            if (members) members.forEach((m) => memberIds.add(m.id));
        } catch (_) {}
        if (memberIds.size) entries = entries.filter((e) => memberIds.has(e.id));
    }

    return entries.filter((e) => e.value > 0).sort((a, b) => b.value - a.value);
}

function findMyRank(list, userId) {
    const idx = list.findIndex((e) => e.id === userId);
    if (idx < 0) return { rank: null, value: 0, level: 0 };
    return {
        rank: idx + 1,
        value: list[idx].value,
        level: list[idx].level || 0
    };
}

function formatDate() {
    try {
        return new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (_) {
        return new Date().toLocaleString('pt-BR');
    }
}

async function pageEmbed(client, list, mode, page, guild) {
    const meta = modeMeta(mode);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const start = p * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);

    const lines = [];
    for (let i = 0; i < slice.length; i++) {
        const e = slice[i];
        const pos = start + i;
        const u = await client.users.fetch(e.id).catch(() => null);
        const tag = displayTag(u, e.id);
        const val =
            mode === 'xp' && e.level != null
                ? meta.unitEmoji + ' ' + fmt(e.value) + ' · Nv. ' + e.level
                : meta.unitEmoji + ' ' + fmt(e.value);

        lines.push(medal(pos) + '° ' + tag + ' = ' + val);
    }

    const body = lines.length ? lines.join('\n\n') : '_Ninguém no ranking ainda._';

    const isLocal = meta.scope === 'local';
    const guildName = guild?.name || 'Servidor';
    const title = isLocal
        ? meta.titleEmoji + ' RANK · ' + guildName.toUpperCase()
        : meta.titleEmoji + ' RANK ' + meta.rankLabel.toUpperCase() + ' · AETERNUS';

    const emb = new EmbedBuilder()
        .setColor(meta.color)
        .setTitle(title)
        .setDescription(
            [
                '━━━━━━━━━━━━━━━━━━━━',
                '',
                body,
                '',
                '━━━━━━━━━━━━━━━━━━━━'
            ].join('\n')
        )
        .setFooter({
            text:
                'Rank ' +
                meta.rankLabel +
                (isLocal ? ' · ' + guildName : '') +
                ' · Aeternus · ' +
                formatDate() +
                ' · Pág. ' +
                (p + 1) +
                '/' +
                totalPages
        });

    if (isLocal && guild) {
        const icon = guild.iconURL?.({ size: 128 }) || null;
        emb.setAuthor({
            name: guildName,
            iconURL: icon || undefined
        });
        if (icon) emb.setThumbnail(icon);
    } else {
        emb.setAuthor({ name: 'Aeternus · Ranking Global' });
    }

    return emb;
}

function navRow(mode, page, totalPages) {
    const maxPage = Math.max(0, totalPages - 1);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('rank:prev:' + mode + ':' + page)
            .setLabel('Voltar')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId('rank:me:' + mode + ':' + page)
            .setLabel('Ver meu rank')
            .setEmoji('👤')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('rank:next:' + mode + ':' + page)
            .setLabel('Próximo')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= maxPage)
    );
}

function helpEmbed() {
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('🏆 Rankings Aeternus')
        .setDescription(
            [
                '**Comandos**',
                '`O.rank` — ranking **global** de Éter',
                '`O.rank eter` / `O.rank local` — Éter **deste servidor**',
                '`O.rank xp` / `O.topxp` — XP **deste servidor**',
                '`O.rank tapa` / `O.toptapa` — Tapas **deste servidor**',
                '',
                '**Navegação**',
                '⬅️ Voltar · 👤 Ver meu rank · ➡️ Próximo',
                '',
                PAGE_SIZE + ' membros por página.'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · Rank' });
}

async function sendRank(ctx, mode, page) {
    page = page || 0;
    const guild = ctx.guild;
    if ((mode === 'local' || mode === 'xp' || mode === 'tapa') && !guild) {
        return {
            content: '❌ Este ranking é por servidor. Use em um servidor.',
            ephemeral: true
        };
    }

    const list = await buildList(mode, guild);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const emb = await pageEmbed(ctx.client, list, mode, p, guild);

    return {
        embeds: [emb],
        components: [navRow(mode, p, totalPages)]
    };
}

module.exports = {
    name: 'rank',
    aliases: ['top', 'leaderboard', 'lb', 'ranking', 'topxp', 'toptapa', 'top-xp', 'top-tapa'],
    description: 'Ranking global, éter local, XP e tapa (paginado)',

    async execute(message, args) {
        const raw = String(args?.[0] || '').toLowerCase();
        if (['help', 'ajuda', '?'].includes(raw)) {
            return message.reply({ embeds: [helpEmbed()] });
        }

        const mode = parseMode(args);
        const payload = await sendRank(message, mode, 0);
        return message.reply(payload);
    },

    async handleComponent(interaction) {
        if (!interaction.customId.startsWith('rank:')) return;

        const parts = interaction.customId.split(':');
        const action = parts[1];
        const mode = parts[2] || 'global';
        let page = parseInt(parts[3], 10) || 0;

        if (!['global', 'local', 'xp', 'tapa'].includes(mode)) {
            return interaction.reply({ content: 'Modo inválido.', ephemeral: true });
        }

        if (action === 'me') {
            const guild = interaction.guild;
            if ((mode === 'local' || mode === 'xp' || mode === 'tapa') && !guild) {
                return interaction.reply({
                    content: '❌ Ranking local só funciona em servidor.',
                    ephemeral: true
                });
            }

            const list = await buildList(mode, guild);
            const mine = findMyRank(list, interaction.user.id);
            const meta = modeMeta(mode);

            if (!mine.rank) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle(meta.titleEmoji + ' Seu rank')
                            .setDescription(
                                'Você ainda não aparece no ranking de **' +
                                    meta.rankLabel +
                                    '**.\nGanhe ' +
                                    meta.unit +
                                    ' para entrar na lista!'
                            )
                    ],
                    ephemeral: true
                });
            }

            const pageOfMe = Math.floor((mine.rank - 1) / PAGE_SIZE);
            const extra = mode === 'xp' ? ' · Nível **' + mine.level + '**' : '';

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(meta.color)
                        .setAuthor({
                            name: interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL({ size: 64 })
                        })
                        .setTitle(meta.titleEmoji + ' Seu rank')
                        .setDescription(
                            [
                                '**Rank ' + meta.rankLabel + '**',
                                '',
                                '🏆 Posição: **#' + mine.rank + '** de **' + fmt(list.length) + '**',
                                meta.unitEmoji + ' **' + fmt(mine.value) + '** ' + meta.unit + extra,
                                '',
                                '_Você está na página ' + (pageOfMe + 1) + '._'
                            ].join('\n')
                        )
                        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
                        .setFooter({ text: 'Aeternus · ' + formatDate() })
                ],
                ephemeral: true
            });
        }

        if (action === 'prev') page = Math.max(0, page - 1);
        if (action === 'next') page = page + 1;

        const payload = await sendRank(interaction, mode, page);
        return interaction.update(payload);
    }
};
