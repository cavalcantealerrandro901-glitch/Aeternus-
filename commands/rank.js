const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const xp = require('../utils/xp');

const PAGE_SIZE = 8;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function medal(i) {
    return ['🥇', '🥈', '🥉'][i] || `**#${i + 1}**`;
}

function clockNow() {
    return new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
}

/** Nome visual sem ping real */
function displayTag(user, fallbackId) {
    if (!user) return `@usuário-${String(fallbackId).slice(-4)}`;
    const name = user.globalName || user.username || `id-${fallbackId}`;
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
    const joined = `${a} ${b}`.trim();

    if (
        a === 'xpglobal' ||
        a === 'rankxp' ||
        a === 'topxp' ||
        joined === 'xp global' ||
        joined === 'xp mundo' ||
        joined === 'xp all' ||
        joined === 'global xp' ||
        (a === 'xp' && (b === 'global' || b === 'mundo' || b === 'all'))
    ) {
        return 'xpglobal';
    }

    if (a === 'xp' || a === 'nivel' || a === 'level' || a === 'exp') return 'xp';

    if (
        a === 'local' ||
        a === 'servidor' ||
        a === 'server' ||
        a === 'eterlocal' ||
        (a === 'eter' && (b === 'local' || b === 'servidor' || b === 'server'))
    ) {
        return 'local';
    }

    // padrão e aliases de economia
    if (
        a === 'global' ||
        a === 'mundo' ||
        a === 'all' ||
        a === 'geral' ||
        a === 'eter' ||
        a === 'economia' ||
        a === 'saldo' ||
        !a
    ) {
        return 'global';
    }

    return 'global';
}

function modeMeta(mode) {
    if (mode === 'xpglobal') {
        return {
            title: 'AETERNUS RANK XP · GLOBAL',
            emoji: '⭐',
            unit: 'XP',
            color: 0xc084fc,
            scope: 'global',
            economy: false
        };
    }
    if (mode === 'xp') {
        return {
            title: 'AETERNUS RANK XP · SERVIDOR',
            emoji: '⭐',
            unit: 'XP',
            color: 0xa78bfa,
            scope: 'local',
            economy: false
        };
    }
    if (mode === 'local') {
        return {
            title: 'AETERNUS RANK · SERVIDOR',
            emoji: '✨',
            unit: 'éter',
            color: 0x22d3ee,
            scope: 'local',
            economy: true
        };
    }
    return {
        title: 'AETERNUS RANK GERAL',
        emoji: '✨',
        unit: 'éter',
        color: 0xfbbf24,
        scope: 'global',
        economy: true
    };
}

/**
 * Lista do ranking — saldos de Éter vêm do Mongo (store → eter.json).
 */
async function buildList(mode, guild, client) {
    if (mode === 'xp' || mode === 'xpglobal') {
        const data = xp.all() || {};
        let entries = Object.entries(data).map(([id, v]) => ({
            id,
            value: Number(v?.xp || 0),
            level: Number(v?.level || 0)
        }));

        if (mode === 'xp' && guild) {
            const memberIds = new Set();
            try {
                const members = await guild.members.fetch().catch(() => null);
                if (members) members.forEach((m) => memberIds.add(m.id));
            } catch (_) {}
            if (memberIds.size) entries = entries.filter((e) => memberIds.has(e.id));
        } else if (mode === 'xpglobal' && client?.guilds?.cache?.size) {
            const memberIds = new Set();
            for (const g of client.guilds.cache.values()) {
                try {
                    if (g.members.cache.size > 1) {
                        g.members.cache.forEach((m) => {
                            if (m.user && !m.user.bot) memberIds.add(m.id);
                        });
                    }
                } catch (_) {}
            }
            if (memberIds.size) entries = entries.filter((e) => memberIds.has(e.id));
        }

        const out = [];
        for (const e of entries) {
            if (e.value <= 0) continue;
            let u = client?.users?.cache?.get(e.id) || null;
            if (!u && client) u = await client.users.fetch(e.id).catch(() => null);
            if (u?.bot) continue;
            out.push(e);
        }
        return out.sort((a, b) => b.value - a.value || b.level - a.level);
    }

    // Economia: saldos no MongoDB via utils/eter (store)
    const data = eter.all() || {};
    let entries = Object.entries(data).map(([id, v]) => ({
        id: String(id),
        value: Number(v || 0)
    }));

    if (mode === 'local' && guild) {
        const memberIds = new Set();
        try {
            const members = await guild.members.fetch().catch(() => null);
            if (members) {
                members.forEach((m) => {
                    if (m.user && !m.user.bot) memberIds.add(m.id);
                });
            }
        } catch (_) {}
        if (memberIds.size) entries = entries.filter((e) => memberIds.has(e.id));
    }

    // Remove bots: cache + fetch sob demanda
    const humans = [];
    for (const e of entries) {
        if (e.value <= 0) continue;
        let u = client?.users?.cache?.get(e.id) || null;
        if (!u && client) {
            u = await client.users.fetch(e.id).catch(() => null);
        }
        if (u?.bot) continue;
        // IDs de bot do Discord terminam com padrões; se não achou user, ainda inclui (pode ser user offline)
        // Se client ausente, filtra só por value
        humans.push(e);
    }

    return humans.sort((a, b) => b.value - a.value);
}

function findMyRank(list, userId) {
    const idx = list.findIndex((e) => e.id === String(userId));
    if (idx < 0) return { rank: null, value: 0, level: 0 };
    return {
        rank: idx + 1,
        value: list[idx].value,
        level: list[idx].level || 0
    };
}

async function pageEmbed(client, list, mode, page, guildName, viewerId) {
    const meta = modeMeta(mode);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const start = p * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);
    const mine = findMyRank(list, viewerId);

    const blocks = [];
    for (let i = 0; i < slice.length; i++) {
        const e = slice[i];
        const pos = start + i;
        const u = await client.users.fetch(e.id).catch(() => null);
        // Pula bots (garantia extra na página)
        if (u?.bot) continue;

        // <@id> no embed aparece marcado e NÃO notifica (só content notifica)
        const mention = `<@${e.id}>`;

        if (meta.economy) {
            blocks.push(
                `${medal(pos)} ${mention} = ID [\`${e.id}\`] | saldo:  ✨ **${fmt(e.value)}** éter`
            );
        } else {
            const extra =
                e.level != null ? `\n   Nv. **${e.level}**` : '';
            blocks.push(
                `${medal(pos)} ${mention}\n   ${meta.emoji} **${fmt(e.value)}** ${meta.unit}${extra}`
            );
        }
    }

    const body = blocks.length ? blocks.join('\n\n') : '_Ninguém no ranking ainda._';

    const posLine =
        mine.rank != null
            ? `Sua posição no rank: **${mine.rank}** posição.`
            : 'Sua posição no rank: _você ainda não está no ranking._';

    const serverLabel = guildName || 'Global';
    const hora = clockNow();

    return new EmbedBuilder()
        .setColor(meta.color)
        .setTitle(meta.title)
        .setDescription([posLine, '', body].join('\n'))
        .setFooter({
            text: `Aeternus rank • ${serverLabel} • hoje as ${hora}`
        })
        .setTimestamp();
}

function helpEmbed() {
    return new EmbedBuilder()
        .setColor(0xfbbf24)
        .setTitle('🏆 Rankings · Economia Aeternus')
        .setDescription(
            [
                'Saldos lidos do **MongoDB** (éter).',
                '',
                '**Comandos**',
                '`O.rank` — **AETERNUS RANK GERAL** (éter global)',
                '`O.rank local` — éter deste servidor',
                '`O.rank xp` — XP deste servidor',
                '`O.rank xp global` — XP global',
                '',
                '⬅️ Voltar · 👤 Meu rank · ➡️ Próximo'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · Rank' });
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
            .setLabel('Meu rank')
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

async function sendRank(ctx, mode, page = 0) {
    const guild = ctx.guild;
    if ((mode === 'local' || mode === 'xp') && !guild) {
        return {
            content: '❌ Este ranking é por servidor. Use em um servidor.',
            ephemeral: true
        };
    }

    const list = await buildList(mode, guild, ctx.client);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const viewerId = ctx.user?.id || ctx.author?.id;
    const emb = await pageEmbed(
        ctx.client,
        list,
        mode,
        p,
        guild?.name || 'Global',
        viewerId
    );

    return {
        embeds: [emb],
        components: [navRow(mode, p, totalPages)]
    };
}

module.exports = {
    name: 'rank',
    aliases: ['top', 'leaderboard', 'lb', 'ranking', 'rankxp', 'topxp', 'xpglobal'],
    description: 'Ranking de economia (éter) e XP — dados do MongoDB',

    async execute(message, args) {
        if (['ajuda', 'help', '?'].includes(String(args[0] || '').toLowerCase())) {
            return message.reply({ embeds: [helpEmbed()] });
        }
        let mode = parseMode(args);
        const invoked = String(message.content || '')
            .trim()
            .split(/\s+/)[0]
            .toLowerCase()
            .replace(/^[oO]\./, '')
            .replace(/^!/, '');
        if (['topxp', 'rankxp', 'xpglobal'].includes(invoked) && !args[0]) {
            mode = 'xpglobal';
        }
        const payload = await sendRank(message, mode, 0);
        return message.reply(payload);
    },

    async handleComponent(interaction) {
        if (!String(interaction.customId || '').startsWith('rank:')) return;

        const parts = interaction.customId.split(':');
        const action = parts[1];
        const mode = parts[2] || 'global';
        let page = parseInt(parts[3], 10) || 0;

        if (!['global', 'local', 'xp', 'xpglobal'].includes(mode)) {
            return interaction.reply({ content: 'Modo inválido.' }).catch(() => {});
        }

        if (action === 'me') {
            const guild = interaction.guild;
            if ((mode === 'local' || mode === 'xp') && !guild) {
                return interaction.reply({
                    content: '❌ Ranking local só funciona em servidor.'
                }).catch(() => {});
            }

            const list = await buildList(mode, guild, interaction.client);
            const mine = findMyRank(list, interaction.user.id);
            const meta = modeMeta(mode);
            const foot = 'Aeternus rank • ' + (guild?.name || 'Global') + ' • hoje as ' + clockNow();

            if (!mine.rank) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle(meta.title)
                            .setDescription(
                                '<@' + interaction.user.id + '> ainda não aparece no ranking.\nGanhe éter/XP para entrar na lista!'
                            )
                            .setFooter({ text: foot })
                    ]
                }).catch(() => {});
            }

            const saldoLine = meta.economy
                ? 'saldo:  ✨ **' + fmt(mine.value) + '** éter'
                : meta.emoji + ' **' + fmt(mine.value) + '** ' + meta.unit;

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(meta.color)
                        .setTitle(meta.title)
                        .setDescription(
                            '<@' + interaction.user.id + '>\n' +
                            'Sua posição no rank: **' + mine.rank + '** posição.\n\n' +
                            saldoLine
                        )
                        .setFooter({ text: foot })
                        .setTimestamp()
                ]
            }).catch(() => {});
        }

        if (action === 'prev') page = Math.max(0, page - 1);
        if (action === 'next') page = page + 1;

        const payload = await sendRank(interaction, mode, page);
        return interaction.update(payload).catch(() => {});
    }
};
