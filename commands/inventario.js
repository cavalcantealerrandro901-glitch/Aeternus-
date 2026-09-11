const {
    EmbedBuilder,
    SlashCommandBuilder
} = require('discord.js');
const player = require('../utils/player');

const COLOR = 0x34d399;

const CAT_LABEL = {
    arma: 'Armas',
    armadura: 'Armaduras',
    acessorio: 'Acessórios',
    consumivel: 'Consumíveis',
    especial: 'Especiais',
    todos: 'Todos'
};

module.exports = {
    name: 'inventario',
    aliases: ['inv', 'itens', 'bag', 'mochila', 'inventory'],
    description: 'Ver inventário / itens por categoria',
    data: (() => {
        const b = new SlashCommandBuilder()
            .setName('inventario')
            .setDescription('Ver inventário de itens')
            .addStringOption((o) => {
                o.setName('categoria')
                    .setDescription('Filtrar por categoria')
                    .setRequired(false);
                for (const c of player.ITEM_CATEGORIES || []) {
                    o.addChoices({ name: c.name, value: c.value });
                }
                return o;
            })
            .addUserOption((o) =>
                o.setName('usuario').setDescription('Ver inventário de outro').setRequired(false)
            );
        return b;
    })(),

    async execute(message, args) {
        let category = 'todos';
        const a0 = String(args[0] || '').toLowerCase();
        if (a0 && !a0.startsWith('<@')) {
            const known = (player.ITEM_CATEGORIES || []).find(
                (c) => c.value === a0 || c.name.toLowerCase() === a0
            );
            if (known) category = known.value;
            else if (CAT_LABEL[a0]) category = a0;
        }
        const user = message.mentions.users.first() || message.author;
        return message.reply({ embeds: [buildEmbed(user, category)] });
    },

    async executeSlash(i) {
        const category = i.options.getString('categoria') || 'todos';
        const user = i.options.getUser('usuario') || i.user;
        return i.reply({ embeds: [buildEmbed(user, category)] });
    }
};

function buildEmbed(user, category) {
    const profile = player.get(user.id);
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: `${user.username} · Inventário`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setThumbnail(user.displayAvatarURL({ size: 128 }));

    if (!profile || !profile.name) {
        emb.setTitle('Inventário');
        emb.setDescription(
            `${user} ainda não tem perfil de jogador.\nUse **\`O.j criar\`** para começar.`
        );
        return emb;
    }

    const list = player.getInventory(user.id, category);
    const catName = CAT_LABEL[category] || category;

    emb.setTitle(`🎒 ${profile.name} · ${catName}`);

    if (!list.length) {
        emb.setDescription(
            category === 'todos'
                ? '_Inventário vazio. Itens podem dropar ao subir de nível (10%)._'
                : `_Nenhum item na categoria **${catName}**._`
        );
        return emb;
    }

    if (category === 'todos') {
        const groups = {};
        for (const it of list) {
            const c = it.category || 'especial';
            if (!groups[c]) groups[c] = [];
            groups[c].push(it);
        }
        for (const [c, items] of Object.entries(groups)) {
            const lines = items.slice(0, 15).map((it, i) => {
                const when = it.gotAt
                    ? ` · <t:${Math.floor(it.gotAt / 1000)}:R>`
                    : '';
                return `**${i + 1}.** ${it.emoji || '🎁'} **${it.name}**${when}`;
            });
            emb.addFields({
                name: CAT_LABEL[c] || c,
                value: lines.join('\n').slice(0, 1020),
                inline: false
            });
        }
    } else {
        const lines = list.map((it, i) => {
            const when = it.gotAt
                ? ` · <t:${Math.floor(it.gotAt / 1000)}:R>`
                : '';
            return `**${i + 1}.** ${it.emoji || '🎁'} **${it.name}**${when}`;
        });
        emb.setDescription(lines.join('\n').slice(0, 4000));
    }

    emb.setFooter({ text: `${list.length} item(ns)` });
    return emb;
}
