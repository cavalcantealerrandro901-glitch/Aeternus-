const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    SlashCommandBuilder,
    MessageFlags
} = require('discord.js');
const player = require('../utils/player');
const items = require('../utils/items');

const COLOR = 0x34d399;
const PER_PAGE = 8;

const CAT_LABEL = {
    todos: 'Todos',
    arma: 'Armas',
    armadura: 'Armaduras',
    acessorio: 'Acessórios',
    consumivel: 'Consumíveis',
    especial: 'Especiais'
};

const CAT_ORDER = ['todos', 'arma', 'armadura', 'acessorio', 'consumivel', 'especial'];

function rarityTag(it) {
    const r = it.rarity || items.getItemDef(it.id)?.rarity || 'comum';
    return items.RARITY?.[r]?.name || r;
}

function effectsLine(it) {
    if (!it?.effects || typeof it.effects !== 'object') return '';
    const fx = Object.entries(it.effects)
        .filter(([, v]) => typeof v === 'number')
        .map(([k, v]) => `+${v} ${k}`)
        .join(' · ');
    return fx ? ` · _${fx}_` : '';
}

function equippedBlock(userId) {
    const eq = player.getEquipped(userId);
    const line = (slot, label) => {
        const it = eq[slot];
        if (!it) return `• **${label}:** _vazio_`;
        return `• **${label}:** ${it.emoji || '🎁'} **${it.name}**${effectsLine(it)}`;
    };
    return [
        line('arma', 'Arma'),
        line('armadura', 'Armadura'),
        line('acessorio', 'Acessório')
    ].join('\n');
}

/** Lista com índice global (1-based) igual ao usado em O.usar / O.equipar */
function listWithIndex(userId, category) {
    const full = player.getInventory(userId, 'todos');
    const mapped = full.map((it, i) => ({
        ...it,
        globalIndex: i + 1
    }));
    if (!category || category === 'todos') return mapped;
    return mapped.filter((it) => String(it.category) === String(category));
}

function buildEmbed(user, category, page) {
    const profile = player.get(user.id);
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: `${user.username} · Inventário`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setThumbnail(
            profile?.photoUrl || user.displayAvatarURL({ size: 128, extension: 'png' })
        )
        .setTimestamp();

    if (!profile || !profile.name) {
        emb.setTitle('🎒 Inventário');
        emb.setDescription(
            `${user} ainda não tem perfil de jogador.\nUse **\`O.j criar\`** para começar.`
        );
        return emb;
    }

    const cat = CAT_LABEL[category] ? category : 'todos';
    const list = listWithIndex(user.id, cat);
    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    const p = Math.min(Math.max(0, page), totalPages - 1);
    const slice = list.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE);

    emb.setTitle(`🎒 ${profile.name} · ${CAT_LABEL[cat] || cat}`);

    const parts = [];
    parts.push('**⚔️ Equipado**');
    parts.push(equippedBlock(user.id));
    parts.push('');
    parts.push('**📦 Mochila**');

    if (!list.length) {
        parts.push(
            cat === 'todos'
                ? '_Inventário vazio._\nItens podem dropar ao subir de nível · `O.craft` · `O.loja` · `O.troca`'
                : `_Nenhum item em **${CAT_LABEL[cat]}**._`
        );
    } else {
        for (const it of slice) {
            const rr = rarityTag(it);
            const desc = it.desc ? `\n└─ ${String(it.desc).slice(0, 80)}` : '';
            parts.push(
                `**#${it.globalIndex}** ${it.emoji || '🎁'} **${it.name}** · _${rr}_ · \`${it.category || '?'}\`${effectsLine(it)}${desc}`
            );
        }
    }

    emb.setDescription(parts.join('\n').slice(0, 4090));
    emb.setFooter({
        text: `${list.length} item(ns) · pág. ${p + 1}/${totalPages} · O.usar # · O.equipar # · O.desequipar <slot>`
    });

    return emb;
}

function navComponents(ownerId, category, page, totalPages) {
    const cat = CAT_LABEL[category] ? category : 'todos';
    const rows = [];

    const select = new StringSelectMenuBuilder()
        .setCustomId(`inv:cat:${ownerId}`)
        .setPlaceholder('Categoria')
        .addOptions(
            CAT_ORDER.map((c) => ({
                label: CAT_LABEL[c],
                value: c,
                default: c === cat
            }))
        );
    rows.push(new ActionRowBuilder().addComponents(select));

    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`inv:prev:${ownerId}:${cat}:${page}`)
                .setLabel('Voltar')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 0),
            new ButtonBuilder()
                .setCustomId(`inv:page:${ownerId}:${cat}:${page}`)
                .setLabel(`${page + 1}/${Math.max(1, totalPages)}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`inv:next:${ownerId}:${cat}:${page}`)
                .setLabel('Próximo')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1)
        )
    );

    return rows;
}

function payload(user, category, page) {
    const cat = CAT_LABEL[category] ? category : 'todos';
    const list = listWithIndex(user.id, cat);
    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    const p = Math.min(Math.max(0, Number(page) || 0), totalPages - 1);
    return {
        embeds: [buildEmbed(user, cat, p)],
        components: navComponents(user.id, cat, p, totalPages)
    };
}

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
                for (const c of CAT_ORDER) {
                    o.addChoices({ name: CAT_LABEL[c], value: c });
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
            if (CAT_LABEL[a0]) category = a0;
            else {
                const known = Object.entries(CAT_LABEL).find(
                    ([, name]) => name.toLowerCase() === a0
                );
                if (known) category = known[0];
            }
        }
        const user = message.mentions.users.first() || message.author;
        return message.reply(payload(user, category, 0));
    },

    async executeSlash(i) {
        const category = i.options.getString('categoria') || 'todos';
        const user = i.options.getUser('usuario') || i.user;
        return i.reply(payload(user, category, 0));
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('inv:')) return;

        const parts = id.split(':');
        const action = parts[1];
        const ownerId = parts[2];

        if (String(interaction.user.id) !== String(ownerId)) {
            return interaction.reply({
                content: 'Só quem abriu o inventário pode navegar.',
                flags: MessageFlags.Ephemeral
            });
        }

        const user = interaction.user;

        if (action === 'cat' && interaction.isStringSelectMenu()) {
            const category = interaction.values[0] || 'todos';
            return interaction.update(payload(user, category, 0));
        }

        if (action === 'prev' || action === 'next' || action === 'page') {
            const category = parts[3] || 'todos';
            let page = Math.max(0, Math.floor(Number(parts[4]) || 0));
            if (action === 'prev') page -= 1;
            if (action === 'next') page += 1;
            return interaction.update(payload(user, category, page));
        }
    }
};
