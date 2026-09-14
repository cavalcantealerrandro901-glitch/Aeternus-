const {
    EmbedBuilder,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');
const tx = require('../utils/transactions');

const PAGE = 8;

const CATEGORIES = {
    geral: {
        label: 'Categoria geral',
        emoji: '📂',
        match: () => true
    },
    jogos: {
        label: 'Jogos & apostas',
        emoji: '🎮',
        match: (h) =>
            /mines|mina|blackjack|bj|roleta|emojibet|dado|ppt|quiz|crime|roubo|rob/i.test(
                String(h.reason || '')
            )
    },
    transferencias: {
        label: 'Transferências',
        emoji: '💸',
        match: (h) => /pix|pay|transfer/i.test(String(h.reason || '')) || !!(h.from || h.to)
    },
    recompensas: {
        label: 'Recompensas',
        emoji: '🎁',
        match: (h) => /daily|work|trabalho|beg|pedir|drop|nivel|xp/i.test(String(h.reason || ''))
    },
    banco: {
        label: 'Banco',
        emoji: '🏦',
        match: (h) => /deposit|withdraw|saque|dep[oó]sito/i.test(String(h.reason || ''))
    },
    outros: {
        label: 'Outros',
        emoji: '📌',
        match: (h) => {
            const r = String(h.reason || '');
            if (CATEGORIES.jogos.match(h)) return false;
            if (CATEGORIES.transferencias.match(h)) return false;
            if (CATEGORIES.recompensas.match(h)) return false;
            if (CATEGORIES.banco.match(h)) return false;
            return true;
        }
    }
};

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function when(h) {
    if (!h.at) return '';
    return `📅 <t:${Math.floor(h.at / 1000)}:d>`;
}

function mention(id) {
    if (!id) return '@alguém';
    return `<@${id}>`;
}

function line(h, ownerId) {
    const amount = fmt(h.amount);
    const date = when(h);
    const reason = String(h.reason || '').toLowerCase();

    // Transferências
    if (/pix|pay|transfer/i.test(reason) || h.from || h.to) {
        if (h.type === 'in') {
            return `🟢 ${mention(ownerId)} recebeu ✨ **${amount}** de ${mention(h.from)} ${date}`.trim();
        }
        return `🔴 ${mention(ownerId)} transferiu ✨ **${amount}** para ${mention(h.to)} ${date}`.trim();
    }

    // Banco
    if (/deposit|dep[oó]sito/i.test(reason)) {
        return `🏦 ${mention(ownerId)} depositou ✨ **${amount}** ${date}`.trim();
    }
    if (/withdraw|saque/i.test(reason)) {
        return `🏦 ${mention(ownerId)} sacou ✨ **${amount}** ${date}`.trim();
    }

    // Entrada / saída genérica
    if (h.type === 'in') {
        return `🟢 ${mention(ownerId)} recebeu ✨ **${amount}** · ${reason || 'movimento'} ${date}`.trim();
    }
    return `🔴 ${mention(ownerId)} gastou ✨ **${amount}** · ${reason || 'movimento'} ${date}`.trim();
}

function filterList(userId, category) {
    const all = tx.list(userId, 50);
    const cat = CATEGORIES[category] || CATEGORIES.geral;
    return all.filter((h) => cat.match(h));
}

function buildEmbed(user, category, page) {
    const cat = CATEGORIES[category] || CATEGORIES.geral;
    const list = filterList(user.id, category);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const slice = list.slice(p * PAGE, p * PAGE + PAGE);

    const body = slice.length
        ? slice.map((h) => line(h, user.id)).join('\n\n')
        : '_Nenhuma movimentação nesta categoria._';

    const emb = new EmbedBuilder()
        .setColor(0xa78bfa)
        .setTitle('📜 Transações Aeternus')
        .setDescription(
            [
                '----------------------------------------',
                `|  ${cat.emoji} **${cat.label}**`,
                '_____________________________________',
                '',
                body
            ].join('\n')
        )
        .setFooter({ text: `Página ${p + 1}/${totalPages}` });

    return { embed: emb, page: p, totalPages, category };
}

function categorySelect(userId, category, page) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`transacoes:cat:${userId}:${page}`)
        .setPlaceholder('Categorias')
        .addOptions(
            Object.entries(CATEGORIES).map(([key, c]) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(c.label)
                    .setValue(key)
                    .setEmoji(c.emoji)
                    .setDefault(key === category)
            )
        );
    return new ActionRowBuilder().addComponents(menu);
}

function nav(userId, category, page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`transacoes:prev:${userId}:${category}:${page}`)
            .setLabel('Voltar')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`transacoes:next:${userId}:${category}:${page}`)
            .setLabel('Próximo')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
    );
}

function components(userId, category, page, totalPages) {
    return [categorySelect(userId, category, page), nav(userId, category, page, totalPages)];
}

async function show(user, reply, category = 'geral', page = 0) {
    const { embed, page: p, totalPages } = buildEmbed(user, category, page);
    return reply({
        embeds: [embed],
        components: components(user.id, category, p, totalPages),
        allowedMentions: { parse: [] }
    });
}

module.exports = {
    name: 'transacoes',
    aliases: ['extrato', 'history', 'tx', 'transacao', 'transação'],
    description: 'Extrato de éter por categoria',
    data: new SlashCommandBuilder()
        .setName('transacoes')
        .setDescription('Ver extrato de éter')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Ver extrato de outro (opcional)').setRequired(false)
        ),

    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        await show(target, (p) => message.reply(p), 'geral', 0);
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario') || i.user;
        await show(target, (p) => i.reply(p), 'geral', 0);
    },

    async handleComponent(interaction) {
        const id = String(interaction.customId || '');
        if (!id.startsWith('transacoes:')) return;

        const parts = id.split(':');
        const action = parts[1];

        // select: transacoes:cat:userId:page
        if (action === 'cat' && interaction.isStringSelectMenu()) {
            const userId = parts[2];
            const category = interaction.values[0] || 'geral';
            const user = await interaction.client.users.fetch(userId).catch(() => interaction.user);
            const { embed, page: p, totalPages } = buildEmbed(user, category, 0);
            return interaction.update({
                embeds: [embed],
                components: components(userId, category, p, totalPages),
                allowedMentions: { parse: [] }
            });
        }

        // buttons: transacoes:prev|next:userId:category:page
        const userId = parts[2];
        const category = parts[3] || 'geral';
        let page = parseInt(parts[4], 10) || 0;
        if (action === 'prev') page = Math.max(0, page - 1);
        if (action === 'next') page = page + 1;

        const user = await interaction.client.users.fetch(userId).catch(() => interaction.user);
        const { embed, page: p, totalPages } = buildEmbed(user, category, page);

        return interaction.update({
            embeds: [embed],
            components: components(userId, category, p, totalPages),
            allowedMentions: { parse: [] }
        });
    }
};
