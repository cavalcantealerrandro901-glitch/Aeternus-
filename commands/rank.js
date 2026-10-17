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
const USER_FETCH_CONCURRENCY = 8;

function fmt(n) { return Number(n || 0).toLocaleString('pt-BR'); }

function parseMode(args) {
    const a = String(args?.[0] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const b = String(args?.[1] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const joined = `${a} ${b}`.trim();
    if (['xpglobal','rankxp','topxp'].includes(a) || ['xp global','xp mundo','xp all','global xp'].includes(joined) || (a === 'xp' && ['global','mundo','all'].includes(b))) return 'xpglobal';
    if (['xp','nivel','level','exp'].includes(a)) return 'xp';
    if (['local','servidor','server','eterlocal'].includes(a) || (a === 'eter' && ['local','servidor','server'].includes(b))) return 'local';
    return 'global';
}

function modeMeta(mode) {
    if (mode === 'xpglobal') return { title: 'COLISEU AETERNUS · RANK XP GLOBAL', economy: false, color: 0xc9a227, tip: 'Continue evoluindo para subir no ranking global de XP!' };
    if (mode === 'xp') return { title: 'COLISEU AETERNUS · RANK XP', economy: false, color: 0xa78bfa, tip: 'Continue interagindo para subir no ranking de XP!' };
    if (mode === 'local') return { title: 'AETERNUS · RANK ÉTER (SERVIDOR)', economy: true, color: 0xa78bfa, tip: 'Acumule éter neste servidor!' };
    return { title: 'AETERNUS · RANK GERAL', economy: true, color: 0xc9a227, tip: 'Acumule éter para dominar o ranking geral!' };
}

function isKnownBot(client, id) {
    return Boolean(client?.users?.cache?.get(String(id))?.bot);
}

async function resolveUsers(client, entries) {
    // Resolve IDs provenientes dos arquivos de economia/XP para nome e avatar do Discord.
    // IDs vêm do banco; não dependemos de o usuário estar no cache local.
    const uniqueIds = [...new Set(entries.map(e => String(e.id)).filter(id => /^\d{17,20}$/.test(id)))];
    let cursor = 0;
    const workers = Array.from({ length: Math.min(USER_FETCH_CONCURRENCY, uniqueIds.length) }, async () => {
        while (cursor < uniqueIds.length) {
            const id = uniqueIds[cursor++];
            if (client.users.cache.has(id)) continue;
            try { await client.users.fetch(id); }
            catch (err) { console.warn('[rank] Não foi possível buscar usuário ' + id + ':', err?.message || err); }
        }
    });
    await Promise.all(workers);
}

async function buildList(mode, guild, client) {
    let entries;
    if (mode === 'xp' || mode === 'xpglobal') {
        const data = xp.all() || {};
        entries = Object.entries(data).map(([id, v]) => {
            const level = Number(v?.level || 0);
            const value = xp.totalXpForLevel(level) + Math.max(0, Number(v?.xp || 0));
            return { id: String(id), value, level };
        });
    } else {
        const data = eter.all() || {};
        const xpData = xp.all() || {};
        entries = Object.entries(data).map(([id, v]) => ({
            id: String(id), value: Number(v || 0), level: Number(xpData[id]?.level || 0)
        }));
    }

    if ((mode === 'local' || mode === 'xp') && guild) {
        const memberIds = new Set();
        guild.members.cache.forEach(m => { if (m.user && !m.user.bot) memberIds.add(m.id); });
        // Não busca todos os membros da API: isso pode gerar uso alto de memória/rede.
        if (memberIds.size) entries = entries.filter(e => memberIds.has(e.id));
    }

    return entries.filter(e => e.value > 0 && !isKnownBot(client, e.id))
        .sort((a, b) => b.value - a.value || b.level - a.level);
}

function findMyRank(list, userId) {
    const idx = list.findIndex(e => e.id === String(userId));
    return idx < 0 ? { rank: null, value: 0, level: 0 } : { rank: idx + 1, value: list[idx].value, level: list[idx].level || 0 };
}

function helpEmbed() {
    return new EmbedBuilder().setColor(0xc9a227).setTitle('👑 COMANDO RANK · AETERNUS')
        .setDescription(['Veja o ranking dos aventureiros mais ativos!', '', '**Como usar**',
            '`O.rank` — rank geral de éter', '`O.rank local` — éter deste servidor',
            '`O.rank xp` — XP deste servidor', '`O.rank xp global` — XP global',
            '', '⬅️ Voltar · 👤 Meu rank · ➡️ Próximo'].join('\n'))
        .setFooter({ text: 'Aeternus Bot · Rank' });
}

function navRow(mode, page, totalPages) {
    const maxPage = Math.max(0, totalPages - 1);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rank:prev:${mode}:${page}`).setLabel('Voltar').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
        new ButtonBuilder().setCustomId(`rank:me:${mode}:${page}`).setLabel('Meu rank').setEmoji('👤').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`rank:next:${mode}:${page}`).setLabel('Próximo').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page >= maxPage)
    );
}

function buildTextEmbed(meta, rows, page, totalPages, total) {
    const description = rows.length ? rows.map((r, i) => {
        const medal = ['🥇', '🥈', '🥉', '🏅', '🏅'][i] || '▫️';
        const barSize = 10;
        const filled = Math.max(0, Math.min(barSize, Math.round((r.value / Math.max(1, rows[0].value)) * barSize)));
        const bar = '▰'.repeat(filled) + '▱'.repeat(barSize - filled);
        return `${medal} **#${r.rank} · ${r.name}**\n└ ${meta.economy ? '✨ Éter' : '⭐ XP'}: **${fmt(r.value)}** · Nível **${r.level}**\n└ ${bar}`;
    }).join('\n\n') : '_Ainda não há registros neste ranking._';
    return new EmbedBuilder().setColor(meta.color).setTitle(meta.title)
        .setDescription(description)
        .addFields({ name: 'Página', value: `${page + 1}/${totalPages}`, inline: true }, { name: 'Participantes', value: fmt(total), inline: true })
        .setFooter({ text: meta.tip });
}

async function sendRank(ctx, mode, page = 0) {
    const guild = ctx.guild;
    if ((mode === 'local' || mode === 'xp') && !guild) return { content: '❌ Este ranking é por servidor. Use em um servidor.', ephemeral: true };

    const list = await buildList(mode, guild, ctx.client);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const meta = modeMeta(mode);
    const start = p * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);

    const rows = slice.map((e, i) => {
        const user = ctx.client.users.cache.get(e.id);
        return {
            id: e.id,
            name: user ? (user.globalName || user.username) : ('Aventureiro ' + e.id.slice(-4)),
            avatarURL: user ? user.displayAvatarURL({ extension: 'png', size: 128 }) : null,
            rank: start + i + 1, value: e.value, level: e.level || 0
        };
    });

    // O modelo Aeternus é rasterizado para PNG e exibido dentro do embed do Discord.
    // SVG puro não é anexado como imagem, pois o Discord não o pré-visualiza consistentemente.
    try {
        const card = await rankCard.render({ title: meta.title, subtitle: meta.economy ? 'Ranking de éter' : 'Ranking de XP', rows, economy: meta.economy, page: p + 1, totalPages, tip: meta.tip });
        if (card?.buffer && /\.png$/i.test(card.name || '')) {
            const filename = 'aeternus-rank.png';
            const imageEmbed = new EmbedBuilder().setColor(meta.color).setImage(`attachment://${filename}`);
            return {
                files: [new AttachmentBuilder(card.buffer, { name: filename })],
                embeds: [imageEmbed],
                components: [navRow(mode, p, totalPages)]
            };
        }
    } catch (err) {
        console.warn('[rank] Falha ao gerar imagem; usando embed:', err?.message || err);
    }

    return { embeds: [buildTextEmbed(meta, rows, p, totalPages, list.length)], components: [navRow(mode, p, totalPages)] };
}

async function editRankMessage(interaction, payload, action) {
    const attempts = [() => interaction.editReply(payload), () => interaction.message.edit(payload)];
    let lastError;
    for (let i = 0; i < attempts.length; i++) {
        try { return await attempts[i](); }
        catch (err) {
            lastError = err;
            const transient = ['UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'ECONNRESET'].includes(err?.code) || [502,503,504].includes(err?.status);
            if (!transient || i === attempts.length - 1) break;
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
        }
    }
    console.error('[rank] Falha ao ' + action + ':', lastError?.message || lastError);
    return null;
}

module.exports = {
    name: 'rank',
    aliases: ['top', 'leaderboard', 'lb', 'ranking', 'rankxp', 'topxp', 'xpglobal'],
    description: 'Ranking de economia (éter) e XP',
    async execute(message, args) {
        if (['ajuda', 'help', '?'].includes(String(args[0] || '').toLowerCase())) return message.reply({ embeds: [helpEmbed()] });
        let mode = parseMode(args);
        const invoked = String(message.content || '').trim().split(/\s+/)[0].toLowerCase().replace(/^[oO]\./, '').replace(/^!/, '');
        if (['topxp', 'rankxp', 'xpglobal'].includes(invoked) && !args[0]) mode = 'xpglobal';
        return message.reply(await sendRank(message, mode, 0));
    },
    async handleComponent(interaction) {
        if (!String(interaction.customId || '').startsWith('rank:')) return;
        const [, action, mode = 'global', rawPage] = interaction.customId.split(':');
        let page = parseInt(rawPage, 10) || 0;
        if (!['global', 'local', 'xp', 'xpglobal'].includes(mode)) return interaction.reply({ content: 'Modo inválido.' }).catch(() => {});
        await interaction.deferUpdate().catch(() => {});
        if (interaction.replied) return;

        const guild = interaction.guild;
        if (action === 'me') {
            if ((mode === 'local' || mode === 'xp') && !guild) return interaction.followUp({ content: '❌ Ranking local só funciona em servidor.', ephemeral: true }).catch(() => {});
            const list = await buildList(mode, guild, interaction.client);
            const mine = findMyRank(list, interaction.user.id);
            if (!mine.rank) return interaction.followUp({ content: 'Você ainda não aparece neste ranking. Ganhe éter/XP para entrar!', ephemeral: true }).catch(() => {});
            page = Math.floor((mine.rank - 1) / PAGE_SIZE);
        } else if (action === 'prev') page = Math.max(0, page - 1);
        else if (action === 'next') page += 1;
        else return;

        // Aviso fora do card com animação enquanto o PNG é preparado.
        const frames = ['⏳', '⌛', '✨', '🔄'];
        let frame = 0;
        const makeLoading = () => new EmbedBuilder()
            .setColor(0xa78bfa)
            .setDescription(`${frames[frame % frames.length]} **Estou editando o rank, aguarde...**`);
        await interaction.editReply({ embeds: [makeLoading()], components: [] }).catch(() => {});
        const animation = setInterval(() => {
            frame++;
            interaction.editReply({ embeds: [makeLoading()], components: [] }).catch(() => {});
        }, 850);
        let payload;
        try {
            payload = await sendRank(interaction, mode, page);
        } finally {
            clearInterval(animation);
        }
        return editRankMessage(interaction, payload, 'atualizar ranking');
    }
};
