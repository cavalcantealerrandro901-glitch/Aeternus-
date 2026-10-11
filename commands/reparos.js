const {
    EmbedBuilder,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const autoRepair = require('../utils/autoRepair');

const PAGE_SIZE = 5;
const COLOR = 0x5865F2;

function isAuthorized(userId) {
    try {
        return autoRepair.ownerIds().includes(String(userId));
    } catch (_) {
        return false;
    }
}

function safeText(value, fallback = 'Não informado', max = 180) {
    const text = String(value ?? '').replace(/`/g, "'").replace(/\s+/g, ' ').trim();
    return (text || fallback).slice(0, max);
}

function buildPage(records, page, totalPages) {
    const start = page * PAGE_SIZE;
    const visible = records.slice(start, start + PAGE_SIZE);
    const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'AETERNUS • CENTRAL DE REPARO' })
        .setTitle('📚 Histórico de reparos')
        .setDescription(visible.length
            ? visible.map((item, index) => {
                const date = item.at ? new Date(item.at) : null;
                const dateText = date && !Number.isNaN(date.getTime())
                    ? date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                    : 'Data desconhecida';
                const status = item.event === 'published' ? '✅ Publicado'
                    : item.event === 'post-publish-error' ? '⚠️ Erro após publicação'
                    : item.event === 'repair-failed' ? '❌ Falhou'
                    : 'ℹ️ ' + safeText(item.event, 'Evento', 40);
                const details = [
                    '**' + status + '** · ' + dateText,
                    'Comando: `' + safeText(item.command, '?', 80) + '`',
                    'Arquivo: `' + safeText(item.file, '—', 120) + '`',
                    'Risco: **' + safeText(item.risk, 'Não informado', 30) + '** · ' + (item.automatic ? 'Automático' : 'Manual/não automático'),
                    item.approvedBy ? 'Aprovador: <@' + safeText(item.approvedBy, '', 25) + '>' : null,
                    item.commit ? 'Commit: `' + safeText(item.commit, '', 12) + '`' : null,
                    item.summary ? 'Resumo: ' + safeText(item.summary, '', 220) : null,
                    item.reason ? 'Detalhe: ' + safeText(item.reason, '', 220) : null
                ].filter(Boolean);
                return '**' + (start + index + 1) + '.** ' + details.join('\n');
            }).join('\n\n')
            : 'Nenhum reparo foi registrado neste ambiente ainda.')
        .setFooter({ text: 'Página ' + (page + 1) + '/' + totalPages + ' • Até 100 registros recentes' })
        .setTimestamp();

    return embed;
}

function buildButtons(page, totalPages, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('aeternus_reparos_prev')
            .setLabel('Anterior')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page <= 0),
        new ButtonBuilder()
            .setCustomId('aeternus_reparos_refresh')
            .setLabel('Atualizar')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('aeternus_reparos_next')
            .setLabel('Próxima')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page >= totalPages - 1)
    );
}

async function showHistory(context) {
    const user = context.user || context.author;
    if (!isAuthorized(user?.id)) {
        const payload = { content: '⛔ Este comando é exclusivo do proprietário do Aeternus.', ephemeral: true };
        if (context.isChatInputCommand?.()) return context.reply(payload);
        return context.reply({ content: payload.content, allowedMentions: { parse: [] } });
    }

    let records = autoRepair.getRepairHistory(100);
    let page = 0;
    let totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
    const payload = {
        embeds: [buildPage(records, page, totalPages)],
        components: [buildButtons(page, totalPages)]
    };

    const sent = await context.reply(payload);
    const message = context.isChatInputCommand?.()
        ? await context.fetchReply().catch(() => null)
        : sent;
    if (!message) return;

    const collector = message.createMessageComponentCollector({
        time: 120_000,
        filter: (interaction) => interaction.user.id === user.id
    });

    collector.on('collect', async (interaction) => {
        if (!isAuthorized(interaction.user.id)) {
            await interaction.reply({ content: '⛔ Você não tem permissão para usar estes controles.', ephemeral: true }).catch(() => {});
            return;
        }

        if (interaction.customId === 'aeternus_reparos_prev') page = Math.max(0, page - 1);
        if (interaction.customId === 'aeternus_reparos_next') page = Math.min(totalPages - 1, page + 1);
        if (interaction.customId === 'aeternus_reparos_refresh') {
            records = autoRepair.getRepairHistory(100);
            totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
            page = Math.min(page, totalPages - 1);
        }

        const currentTotalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
        await interaction.update({
            embeds: [buildPage(records, page, currentTotalPages)],
            components: [buildButtons(page, currentTotalPages)]
        }).catch(() => {});
    });

    collector.on('end', async () => {
        const currentTotalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
        await message.edit({
            embeds: [buildPage(records, page, currentTotalPages)],
            components: [buildButtons(page, currentTotalPages, true)]
        }).catch(() => {});
    });
}

module.exports = {
    name: 'reparos',
    rootSlash: true,
    aliases: ['historico-reparos', 'autoreparos'],
    description: 'Consulta o histórico administrativo de autorreparos do Aeternus',
    data: new SlashCommandBuilder()
        .setName('reparos')
        .setDescription('Consulta o histórico de autorreparos do Aeternus'),
    async execute(message) {
        return showHistory(message);
    },
    async executeSlash(interaction) {
        return showHistory(interaction);
    }
};
