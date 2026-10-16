const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');
const eter = require('../utils/eter');
const xp = require('../utils/xp');
const rankCard = require('../utils/rankCard');

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
    const meta = modeMeta(mode);
    const start = p * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);

    // Só a imagem: o bot escreve nome/id/xp|saldo e coloca as fotos no card
    const rows = [];
    for (const e of slice) {
        let u = ctx.client.users.cache.get(e.id) || null;
        if (!u) u = await ctx.client.users.fetch(e.id).catch(() => null);
        if (u?.bot) continue;
        rows.push({
            name: u ? (u.globalName || u.username) : ('usuário-' + String(e.id).slice(-4)),
            id: e.id,
            value: e.value,
            level: e.level,
            avatarURL: u ? u.displayAvatarURL({ size: 128, extension: 'png' }) : null
        });
    }

    let files = [];
    try {
        const card = await rankCard.render({
            title: meta.title,
            subtitle: meta.economy ? 'Ranking de éter' : 'Ranking de XP',
            rows,
            economy: !!meta.economy,
            page: p + 1,
            totalPages,
            tip: meta.tip
        });
        if (card?.buffer) {
            files = [new AttachmentBuilder(card.buffer, { name: card.name || 'rank.png' })];
        }
    } catch (err) {
        console.warn('[rank] card image:', err.message);
    }

    // Sem embed de texto — apenas a imagem + navegação
    if (!files.length) {
        return {
            content: '_Não foi possível gerar o card do ranking._',
            components: [navRow(mode, p, totalPages)],
            embeds: [],
            files: []
        };
    }

    return {
        content: '',
        embeds: [],
        components: [navRow(mode, p, totalPages)],
        files
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
                    content: '<@' + interaction.user.id + '> ainda não aparece no ranking. Ganhe éter/XP para entrar!',
                    ephemeral: true
                }).catch(() => {});
            }

            const entry = list[mine.rank - 1] || {};
            const xpVal = entry.xp != null ? entry.xp : (meta.economy ? 0 : mine.value);
            const saldo = entry.eter != null ? entry.eter : (meta.economy ? mine.value : 0);
            const nivel = entry.level != null ? entry.level : mine.level;
            let line = '📍 **#' + mine.rank + '** · ' + (interaction.user.globalName || interaction.user.username);
            if (meta.economy) line += ' · ✨ **' + fmt(saldo) + '** éter';
            else line += ' · ⭐ **' + fmt(xpVal) + '** XP' + (nivel ? ' · Nv. **' + nivel + '**' : '');

            return interaction.reply({
                content: line,
                ephemeral: true
            }).catch(() => {});
        }

        if (action === 'prev') page = Math.max(0, page - 1);
        if (action === 'next') page = page + 1;

        const payload = await sendRank(interaction, mode, page);
        return interaction.update(payload).catch(() => {});
    }
};
