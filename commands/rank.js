const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const xp = require('../utils/xp');

const PAGE_SIZE = 5;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function medal(i) {
    return ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i] || `**#${i + 1}**`;
}

function progressBar(value, max, size = 10) {
    const m = Math.max(1, Number(max) || 1);
    const v = Math.max(0, Number(value) || 0);
    const filled = Math.round(Math.min(1, v / m) * size);
    return '█'.repeat(filled) + '░'.repeat(Math.max(0, size - filled));
}

function clockNow() {
    return new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
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
            title: '👑 COLISEU AETERNUS · RANK XP GLOBAL',
            emoji: '⭐',
            unit: 'XP',
            color: 0xc9a227,
            scope: 'global',
            economy: false,
            tip: 'Continue batalhando e evoluindo para subir no ranking global de XP!'
        };
    }
    if (mode === 'xp') {
        return {
            title: '👑 COLISEU AETERNUS · RANK XP',
            emoji: '⭐',
            unit: 'XP',
            color: 0xa78bfa,
            scope: 'local',
            economy: false,
            tip: 'Continue conversando e interagindo para subir no ranking de XP!'
        };
    }
    if (mode === 'local') {
        return {
            title: '✨ AETERNUS · RANK ÉTER (SERVIDOR)',
            emoji: '✨',
            unit: 'éter',
            color: 0xa78bfa,
            scope: 'local',
            economy: true,
            tip: 'Trabalhe, craft e complete missões para acumular éter neste servidor!'
        };
    }
    return {
        title: '✨ AETERNUS · RANK GERAL',
        emoji: '✨',
        unit: 'éter',
        color: 0xc9a227,
        scope: 'global',
        economy: true,
        tip: 'Acumule éter em todos os servidores para dominar o ranking geral!'
    };
}

async function buildList(mode, guild, client) {
    if (mode === 'xp' || mode === 'xpglobal') {
        const data = xp.all() || {};
        const eterData = eter.all() || {};
        let entries = Object.entries(data).map(([id, v]) => ({
            id: String(id),
            value: Number(v?.xp || 0),
            level: Number(v?.level || 0),
            xp: Number(v?.xp || 0),
            eter: Number(eterData[id] || 0)
        }));

        if (mode === 'xp' && guild) {
            const memberIds = new Set();
            guild.members.cache.forEach((m) => {
                if (m.user && !m.user.bot) memberIds.add(m.id);
            });
            if (memberIds.size < 5) {
                try {
                    const members = await guild.members.fetch().catch(() => null);
                    if (members) {
                        members.forEach((m) => {
                            if (m.user && !m.user.bot) memberIds.add(m.id);
                        });
                    }
                } catch (_) {}
            }
            if (memberIds.size) entries = entries.filter((e) => memberIds.has(e.id));
        }

        return entries
            .filter((e) => e.value > 0 && !isKnownBot(client, e.id))
            .sort((a, b) => b.value - a.value || b.level - a.level);
    }

    const data = eter.all() || {};
    const xpData = xp.all() || {};
    let entries = Object.entries(data).map(([id, v]) => {
        const st = xpData[id] || {};
        return {
            id: String(id),
            value: Number(v || 0),
            eter: Number(v || 0),
            xp: Number(st.xp || 0),
            level: Number(st.level || 0)
        };
    });

    if (mode === 'local' && guild) {
        const memberIds = new Set();
        guild.members.cache.forEach((m) => {
            if (m.user && !m.user.bot) memberIds.add(m.id);
        });
        if (memberIds.size < 5) {
            try {
                const members = await guild.members.fetch().catch(() => null);
                if (members) {
                    members.forEach((m) => {
                        if (m.user && !m.user.bot) memberIds.add(m.id);
                    });
                }
            } catch (_) {}
        }
        if (memberIds.size) entries = entries.filter((e) => memberIds.has(e.id));
    }

    return entries
        .filter((e) => e.value > 0 && !isKnownBot(client, e.id))
        .sort((a, b) => b.value - a.value);
}

function isKnownBot(client, id) {
    const u = client?.users?.cache?.get(String(id));
    return Boolean(u?.bot);
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

async function pageEmbed(client, list, mode, page, guild, viewerId) {
    const meta = modeMeta(mode);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const start = p * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);
    const mine = findMyRank(list, viewerId);
    const guildName = guild?.name || 'Global';
    const topValue = list[0]?.value || 1;

    const resolved = await Promise.all(
        slice.map(async (e) => {
            let u = client.users.cache.get(e.id) || null;
            if (!u) u = await client.users.fetch(e.id).catch(() => null);
            if (u?.bot) return null;
            const inGuild = Boolean(guild?.members?.cache?.get(e.id));
            const displayName = u
                ? (u.globalName || u.username || ('id-' + String(e.id).slice(-4)))
                : ('usuário-' + String(e.id).slice(-4));
            // Menção = foto do membro no Discord
            const tag = inGuild ? ('<@' + e.id + '>') : ('**' + displayName + '**');
            const avatar = u?.displayAvatarURL?.({ size: 128, extension: 'png' }) || null;
            return {
                e,
                tag,
                name: displayName,
                id: e.id,
                avatar
            };
        })
    );

    const blocks = [];
    for (let i = 0; i < resolved.length; i++) {
        const row = resolved[i];
        if (!row) continue;
        const pos = start + i;
        const { e, tag, name, id } = row;
        const bar = progressBar(e.value, topValue, 8);
        const nivel = e.level != null ? Number(e.level) : 0;
        const xpVal = e.xp != null ? e.xp : (meta.economy ? 0 : e.value);
        const saldo = e.eter != null ? e.eter : (meta.economy ? e.value : 0);

        // Rank de XP → foto (menção), nome, id, xp
        // Rank de saldo → foto (menção), nome, id, saldo
        const lines = [
            medal(pos) + '  ' + tag,
            '┗ **Nome:** ' + name,
            '　**ID:** `' + id + '`'
        ];
        if (meta.economy) {
            lines.push('　✨ **Saldo:** ' + fmt(saldo) + ' éter');
        } else {
            lines.push('　⭐ **XP:** ' + fmt(xpVal) + (nivel ? ('  ·  Nv. **' + nivel + '**') : ''));
        }
        lines.push('　`' + bar + '`');
        blocks.push(lines.join('\n'));
    }

    const body = blocks.length ? blocks.join('\n\n') : '_Ninguém no ranking ainda._';

    const posLine =
        mine.rank != null
            ? `📍 **Sua posição:** #${mine.rank}  ·  ${meta.emoji} **${fmt(mine.value)}** ${meta.unit}` +
              (mine.level ? `  ·  Nv. **${mine.level}**` : '')
            : '📍 **Sua posição:** _ainda fora do ranking_';

    const hora = clockNow();

    const emb = new EmbedBuilder()
        .setColor(meta.color)
        .setTitle(meta.title)
        .setDescription(
            [
                posLine,
                '',
                `🏆 **RANKING** · Página **${p + 1}/${totalPages}**`,
                '━━━━━━━━━━━━━━━━━━━━',
                '',
                body,
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                `💡 **Dica:** ${meta.tip}`
            ].join('\n')
        )
        .setFooter({
            text: `Aeternus Bot · ${guildName} · atualizado às ${hora}`
        })
        .setTimestamp();

    // Foto do 1º da página
    const first = resolved.find((r) => r && r.avatar);
    if (first?.avatar) emb.setThumbnail(first.avatar);

    return emb;
}

function helpEmbed() {
    return new EmbedBuilder()
        .setColor(0xc9a227)
        .setTitle('👑 COMANDO RANK · AETERNUS')
        .setDescription(
            [
                'Veja o ranking dos aventureiros mais ativos!',
                '',
                '**📖 Como usar**',
                '`O.rank` — rank geral de **éter**',
                '`O.rank local` — éter **deste servidor**',
                '`O.rank xp` — XP **deste servidor**',
                '`O.rank xp global` — XP **global**',
                '',
                '**Exemplo:** `O.rank xp`',
                '',
                '⬅️ Voltar · 👤 Meu rank · ➡️ Próximo'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus Bot · Rank' });
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
        guild || null,
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
    description: 'Ranking de economia (éter) e XP',

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
            const foot = 'Aeternus Bot · ' + (guild?.name || 'Global') + ' · ' + clockNow();

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
                    ],
                    ephemeral: true
                }).catch(() => {});
            }

            const entry = list[mine.rank - 1] || {};
            const xpVal = entry.xp != null ? entry.xp : (meta.economy ? 0 : mine.value);
            const saldo = entry.eter != null ? entry.eter : (meta.economy ? mine.value : 0);
            const nivel = entry.level != null ? entry.level : mine.level;
            const meLines = [
                '👤 <@' + interaction.user.id + '>',
                '',
                '📍 **Posição:** #' + mine.rank,
                '**Nome:** ' + (interaction.user.globalName || interaction.user.username),
                '**ID:** `' + interaction.user.id + '`'
            ];
            if (meta.economy) {
                meLines.push('✨ **Saldo:** ' + fmt(saldo) + ' éter');
            } else {
                meLines.push('⭐ **XP:** ' + fmt(xpVal) + (nivel ? ('  ·  Nv. **' + nivel + '**') : ''));
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(meta.color)
                        .setTitle(meta.title)
                        .setDescription(meLines.join('\n'))
                        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
                        .setFooter({ text: foot })
                        .setTimestamp()
                ],
                ephemeral: true
            }).catch(() => {});
        }

        if (action === 'prev') page = Math.max(0, page - 1);
        if (action === 'next') page = page + 1;

        const payload = await sendRank(interaction, mode, page);
        return interaction.update(payload).catch(() => {});
    }
};
