const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const xp = require('../utils/xp');

const PAGE_SIZE = 6;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function medal(i) {
    return ['🥇', '🥈', '🥉'][i] || `**#${i + 1}**`;
}

/** Nome visual @user sem ping real */
function displayTag(user, fallbackId) {
    if (!user) return `@usuário-${String(fallbackId).slice(-4)}`;
    const name = user.globalName || user.username || `id-${fallbackId}`;
    // texto plano — Discord não notifica
    return `@${name}`;
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

    if (a === 'xp' || a === 'nivel' || a === 'level' || a === 'exp') return 'xp';

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
            title: '🏆 Ranking XP · Servidor',
            emoji: '⭐',
            unit: 'XP',
            color: 0xa78bfa,
            scope: 'local'
        };
    }
    if (mode === 'local') {
        return {
            title: '🏆 Ranking Éter · Servidor',
            emoji: '✨',
            unit: 'éter',
            color: 0x22d3ee,
            scope: 'local'
        };
    }
    return {
        title: '🏆 Ranking Éter · Global',
        emoji: '✨',
        unit: 'éter',
        color: 0xfbbf24,
        scope: 'global'
    };
}

async function buildList(mode, guild) {
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

async function pageEmbed(client, list, mode, page, guildName) {
    const meta = modeMeta(mode);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const start = p * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);

    const blocks = [];
    for (let i = 0; i < slice.length; i++) {
        const e = slice[i];
        const pos = start + i;
        const u = await client.users.fetch(e.id).catch(() => null);
        const tag = displayTag(u, e.id);
        const extra =
            mode === 'xp' && e.level != null ? `\n   Nv. **${e.level}**` : '';

        blocks.push(
            [
                `${medal(pos)}  **${tag}**`,
                `   ${meta.emoji} **${fmt(e.value)}** ${meta.unit}${extra}`
            ].join('\n')
        );
    }

    const body = blocks.length
        ? blocks.join('\n\n──────────────────\n\n')
        : '_Ninguém no ranking ainda._';

    const scopeLine =
        meta.scope === 'local'
            ? `Servidor: **${guildName || 'este servidor'}**`
            : 'Todos os servidores do bot';

    return new EmbedBuilder()
        .setColor(meta.color)
        .setTitle(meta.title)
        .setDescription(
            [
                scopeLine,
                `Total no ranking: **${fmt(list.length)}** · **${PAGE_SIZE}** por página`,
                '',
                body
            ].join('\n')
        )
        .setFooter({
            text: `Página ${p + 1}/${totalPages} · O.rank · O.rank local · O.rank xp`
        })
        .setTimestamp();
}

function navRow(mode, page, totalPages) {
    const maxPage = Math.max(0, totalPages - 1);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`rank:prev:${mode}:${page}`)
            .setLabel('Voltar')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`rank:me:${mode}:${page}`)
            .setLabel('Ver meu rank')
            .setEmoji('👤')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`rank:next:${mode}:${page}`)
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
                '`O.rank xp` — XP **deste servidor**',
                '',
                '**Navegação**',
                '⬅️ Voltar · 👤 Ver meu rank · ➡️ Próximo',
                '',
                `${PAGE_SIZE} membros por página.`
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · Rank' });
}

async function sendRank(ctx, mode, page = 0) {
    const guild = ctx.guild;
    if ((mode === 'local' || mode === 'xp') && !guild) {
        return {
            content: '❌ Este ranking é por servidor. Use em um servidor.',
            ephemeral: true
        };
    }

    const list = await buildList(mode, guild);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const emb = await pageEmbed(ctx.client, list, mode, p, guild?.name);

    return {
        embeds: [emb],
        components: [navRow(mode, p, totalPages)]
    };
}

module.exports = {
    name: 'rank',
    aliases: ['top', 'leaderboard', 'lb', 'ranking'],
    description: 'Ranking global, éter local e XP local (paginado)',

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

        if (!['global', 'local', 'xp'].includes(mode)) {
            return interaction.reply({ content: 'Modo inválido.', ephemeral: true });
        }

        if (action === 'me') {
            const guild = interaction.guild;
            if ((mode === 'local' || mode === 'xp') && !guild) {
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
                            .setTitle(`${meta.emoji} Seu rank`)
                            .setDescription(
                                `Você ainda não aparece no **${meta.title}**.\nGanhe ${meta.unit} para entrar na lista!`
                            )
                    ],
                    ephemeral: true
                });
            }

            const pageOfMe = Math.floor((mine.rank - 1) / PAGE_SIZE);
            const extra = mode === 'xp' ? ` · Nível **${mine.level}**` : '';

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(meta.color)
                        .setAuthor({
                            name: interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL({ size: 64 })
                        })
                        .setTitle(`${meta.emoji} Seu rank`)
                        .setDescription(
                            [
                                `**${meta.title}**`,
                                '',
                                `🏆 Posição: **#${mine.rank}** de **${fmt(list.length)}**`,
                                `${meta.emoji} **${fmt(mine.value)}** ${meta.unit}${extra}`,
                                '',
                                `_Você está na página ${pageOfMe + 1}._`
                            ].join('\n')
                        )
                        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
                        .setTimestamp()
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
