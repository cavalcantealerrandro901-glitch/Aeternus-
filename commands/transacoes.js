const {
    EmbedBuilder,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const tx = require('../utils/transactions');
const eter = require('../utils/eter');

const PAGE = 8;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function reasonLabel(r) {
    const s = String(r || 'movimento').toLowerCase();
    const map = {
        pix: 'Pix',
        roubo: 'Roubo',
        'roubo falhou': 'Roubo falhou',
        'multa de roubo': 'Multa de roubo',
        deposit: 'Depósito',
        withdraw: 'Saque',
        daily: 'Daily',
        work: 'Trabalho',
        crime: 'Crime',
        beg: 'Pedir',
        pay: 'Pix'
    };
    return map[s] || r || 'Movimento';
}

function line(h) {
    const sign = h.type === 'in' ? '+' : '−';
    const color = h.type === 'in' ? '🟢' : '🔴';
    const when = h.at ? `<t:${Math.floor(h.at / 1000)}:R>` : '';
    return `${color} ✨ **${sign}${fmt(h.amount)}** · ${reasonLabel(h.reason)} ${when}`;
}

function buildEmbed(user, page) {
    const all = tx.list(user.id, 50);
    const totalPages = Math.max(1, Math.ceil(all.length / PAGE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const slice = all.slice(p * PAGE, p * PAGE + PAGE);

    const body = slice.length
        ? slice.map(line).join('\n')
        : '_Nenhuma movimentação registrada._';

    return {
        embed: new EmbedBuilder()
            .setColor(0xa78bfa)
            .setAuthor({
                name: user.username,
                iconURL: user.displayAvatarURL({ size: 64 })
            })
            .setTitle('Extrato')
            .setDescription(body)
            .addFields({
                name: 'Carteira',
                value: `✨ **${fmt(eter.get(user.id))}**`,
                inline: true
            })
            .setFooter({ text: `Página ${p + 1}/${totalPages}` }),
        page: p,
        totalPages
    };
}

function nav(userId, page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`transacoes:prev:${userId}:${page}`)
            .setLabel('Voltar')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`transacoes:next:${userId}:${page}`)
            .setLabel('Próximo')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
    );
}

async function show(user, reply, page = 0) {
    const { embed, page: p, totalPages } = buildEmbed(user, page);
    return reply({
        embeds: [embed],
        components: totalPages > 1 ? [nav(user.id, p, totalPages)] : []
    });
}

module.exports = {
    name: 'transacoes',
    aliases: ['extrato', 'history', 'tx'],
    description: 'Extrato de éter',
    data: new SlashCommandBuilder()
        .setName('transacoes')
        .setDescription('Ver extrato de éter')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Ver extrato de outro (opcional)').setRequired(false)
        ),

    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        await show(target, (p) => message.reply(p), 0);
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario') || i.user;
        await show(target, (p) => i.reply(p), 0);
    },

    async handleComponent(interaction) {
        const id = String(interaction.customId || '');
        if (!id.startsWith('transacoes:')) return;

        const [, action, userId, pageStr] = id.split(':');
        let page = parseInt(pageStr, 10) || 0;
        if (action === 'prev') page = Math.max(0, page - 1);
        if (action === 'next') page = page + 1;

        const user = await interaction.client.users.fetch(userId).catch(() => interaction.user);
        const { embed, page: p, totalPages } = buildEmbed(user, page);

        return interaction.update({
            embeds: [embed],
            components: totalPages > 1 ? [nav(userId, p, totalPages)] : []
        });
    }
};
