
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
const PER_PAGE = 6;

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

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function effectsLine(it) {
    if (!it?.effects || typeof it.effects !== 'object') return '';
    const fx = Object.entries(it.effects)
        .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
        .map(([k, v]) => '+' + v + ' ' + k)
        .join(' · ');
    return fx ? '\n' + fx : '';
}

function listWithIndex(userId, category) {
    const full = player.getInventory(userId, 'todos');
    const mapped = full.map((it, i) => ({ ...it, globalIndex: i + 1 }));
    if (!category || category === 'todos') return mapped;
    return mapped.filter((it) => String(it.category) === String(category));
}

function buildEmbed(user, category, page, selectedIndex) {
    const profile = player.get(user.id);
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: user.username + ' · Inventário',
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setThumbnail(profile?.photoUrl || user.displayAvatarURL({ size: 128, extension: 'png' }));

    if (!profile || !profile.name) {
        emb.setTitle('🎒 Inventário');
        emb.setDescription(user + ' ainda não tem perfil de jogador.\nUse O.j criar para começar.');
        return emb;
    }

    const cat = CAT_LABEL[category] ? category : 'todos';
    const list = listWithIndex(user.id, cat);
    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    const p = Math.min(Math.max(0, Number(page) || 0), totalPages - 1);
    const slice = list.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE);
    const space = player.getInventorySpace(user.id);

    emb.setTitle('🎒 ' + profile.name + ' · Inventário');
    emb.setDescription(
        '**📦 Mochila · ' + space.used + '/' + space.capacity + ' espaços**\n' +
        'Nível **' + space.level + '** · +5 espaços a cada 20 níveis\n\n' +
        '**⚔️ Equipamentos**'
    );

    const eq = player.getEquipped(user.id);
    for (const [slot, label, emoji] of [
        ['arma', 'Arma', '⚔️'],
        ['armadura', 'Armadura', '🛡️'],
        ['acessorio', 'Acessório', '💍']
    ]) {
        const it = eq[slot];
        emb.addFields({
            name: emoji + ' ' + label,
            value: it ? '**' + it.name + '**\n_' + rarityTag(it) + '_' : '_Vazio_',
            inline: true
        });
    }

    emb.addFields({ name: '📦 Mochila', value: slice.length ? 'Cada item ocupa uma caixa/slot abaixo.' : '_Inventário vazio._', inline: false });

    for (const it of slice) {
        const selected = Number(selectedIndex) === Number(it.globalIndex);
        const unit = player.getSellValue(it);
        emb.addFields({
            name: '#' + String(it.globalIndex).padStart(2, '0') + ' · ' + (selected ? '🔹 ' : '▫️ ') + (it.emoji || '🎁') + ' ' + it.name,
            value: '╭──────────────────╮\n' +
                '│ **×' + (it.quantity || 1) + '** · _' + rarityTag(it) + '_\n' +
                '│ 💰 ✨ ' + fmt(unit) + ' cada' + effectsLine(it) + '\n' +
                '╰──────────────────╯',
            inline: true
        });
    }

    if (selectedIndex) {
        const selected = list.find((it) => Number(it.globalIndex) === Number(selectedIndex));
        if (selected) {
            const ability = selected.uniqueAbility;
            const abilityLine = ability?.name
                ? '\n\n✨ **Habilidade única · ' + ability.name + '**\n' + String(ability.description || '')
                : '';
            emb.addFields({
                name: '🔎 Item selecionado',
                value: (selected.emoji || '🎁') + ' **' + selected.name + '** · ×' + (selected.quantity || 1) +
                    '\nVenda total: **✨ ' + fmt(player.getSellValue(selected) * (selected.quantity || 1)) + ' Éter**' +
                    abilityLine,
                inline: false
            });
        }
    }

    emb.setFooter({ text: 'Página ' + (p + 1) + '/' + totalPages + ' · selecione um item para usar as ações abaixo' });
    return emb;
}

function components(ownerId, category, page, totalPages, selectedIndex) {
    const cat = CAT_LABEL[category] ? category : 'todos';
    const list = listWithIndex(ownerId, cat);
    const p = Math.min(Math.max(0, Number(page) || 0), Math.max(0, totalPages - 1));
    const slice = list.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE);
    const rows = [];

    rows.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('inv:cat:' + ownerId)
            .setPlaceholder('📂 Categoria')
            .addOptions(CAT_ORDER.map((c) => ({
                label: CAT_LABEL[c],
                value: c,
                default: c === cat
            })))
    ));

    if (slice.length) {
        rows.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('inv:item:' + ownerId + ':' + cat + ':' + p)
                .setPlaceholder('🎒 Selecione um item')
                .addOptions(slice.map((it) => ({
                    label: '#' + String(it.globalIndex).padStart(2, '0') + ' · ' + String(it.name).slice(0, 88),
                    value: String(it.globalIndex),
                    description: ('×' + (it.quantity || 1) + ' · ' + rarityTag(it) + ' · ✨ ' + fmt(player.getSellValue(it)) + ' cada').slice(0, 100),
                    default: Number(selectedIndex) === Number(it.globalIndex)
                })))
        ));
    }

    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('inv:equip:' + ownerId + ':' + cat + ':' + p + ':' + (selectedIndex || 0))
            .setLabel('Equipar')
            .setEmoji('⚔️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!selectedIndex),
        new ButtonBuilder()
            .setCustomId('inv:sell:' + ownerId + ':' + cat + ':' + p + ':' + (selectedIndex || 0))
            .setLabel('Vender')
            .setEmoji('💰')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!selectedIndex)
    ));

    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('inv:prev:' + ownerId + ':' + cat + ':' + p)
            .setLabel('Voltar')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(p <= 0),
        new ButtonBuilder()
            .setCustomId('inv:page:' + ownerId + ':' + cat + ':' + p)
            .setLabel((p + 1) + '/' + Math.max(1, totalPages))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId('inv:next:' + ownerId + ':' + cat + ':' + p)
            .setLabel('Próximo')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(p >= totalPages - 1)
    ));

    return rows;
}

function payload(user, category, page, selectedIndex) {
    const cat = CAT_LABEL[category] ? category : 'todos';
    const list = listWithIndex(user.id, cat);
    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    const p = Math.min(Math.max(0, Number(page) || 0), totalPages - 1);
    return {
        embeds: [buildEmbed(user, cat, p, selectedIndex || null)],
        components: components(user.id, cat, p, totalPages, selectedIndex || null)
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
                o.setName('categoria').setDescription('Filtrar por categoria').setRequired(false);
                for (const c of CAT_ORDER) o.addChoices({ name: CAT_LABEL[c], value: c });
                return o;
            })
            .addUserOption((o) => o.setName('usuario').setDescription('Ver inventário de outro').setRequired(false));
        return b;
    })(),

    async execute(message, args) {
        let category = 'todos';
        const a0 = String(args[0] || '').toLowerCase();
        if (a0 && !a0.startsWith('<@')) {
            if (CAT_LABEL[a0]) category = a0;
            else {
                const known = Object.entries(CAT_LABEL).find(([, name]) => name.toLowerCase() === a0);
                if (known) category = known[0];
            }
        }
        const user = message.mentions.users.first() || message.author;
        return message.reply(payload(user, category, 0, null));
    },

    async executeSlash(i) {
        const category = i.options.getString('categoria') || 'todos';
        const user = i.options.getUser('usuario') || i.user;
        return i.reply(payload(user, category, 0, null));
    },

    async handleComponent(interaction) {
        const id = interaction.customId || '';
        if (!id.startsWith('inv:')) return;

        const parts = id.split(':');
        const action = parts[1];
        const ownerId = parts[2];

        if (String(interaction.user.id) !== String(ownerId)) {
            return interaction.reply({
                content: 'Só quem abriu o inventário pode usar estes controles.',
                flags: MessageFlags.Ephemeral
            });
        }

        const user = interaction.user;

        if (action === 'cat' && interaction.isStringSelectMenu()) {
            return interaction.update(payload(user, interaction.values[0] || 'todos', 0, null));
        }

        if (action === 'item' && interaction.isStringSelectMenu()) {
            const category = parts[3] || 'todos';
            const page = Math.max(0, Number(parts[4]) || 0);
            const selectedIndex = Number(interaction.values[0]) || null;
            return interaction.update(payload(user, category, page, selectedIndex));
        }

        if (action === 'equip' || action === 'sell') {
            const category = parts[3] || 'todos';
            const page = Math.max(0, Number(parts[4]) || 0);
            const selectedIndex = Number(parts[5]) || 0;

            if (!selectedIndex) {
                return interaction.reply({ content: 'Selecione um item primeiro.', flags: MessageFlags.Ephemeral });
            }

            if (action === 'equip') {
                const result = player.equipItem(user.id, selectedIndex);
                if (!result.ok) {
                    return interaction.reply({ content: result.error || 'Não foi possível equipar.', flags: MessageFlags.Ephemeral });
                }
                return interaction.update(payload(user, category, page, null));
            }

            const result = player.sellItem(user.id, selectedIndex);
            if (!result.ok) {
                return interaction.reply({ content: result.error || 'Não foi possível vender.', flags: MessageFlags.Ephemeral });
            }

            const msg = '💰 ' + (result.item.emoji || '📦') + ' **' + result.item.name +
                '** ×' + result.quantity + ' vendido por **✨ ' + fmt(result.totalValue) + ' Éter**.';
            return interaction.update({ ...payload(user, category, page, null), content: msg });
        }

        if (action === 'prev' || action === 'next' || action === 'page') {
            const category = parts[3] || 'todos';
            let page = Math.max(0, Math.floor(Number(parts[4]) || 0));
            if (action === 'prev') page -= 1;
            if (action === 'next') page += 1;
            return interaction.update(payload(user, category, page, null));
        }
    }
};
