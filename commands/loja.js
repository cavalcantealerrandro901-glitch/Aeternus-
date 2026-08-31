const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const shop = require('../utils/shop');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function coin(c) {
    return c === 'flocos' ? '❄️' : '💠';
}

function filterCat(items, cat) {
    if (cat === 'vip') return items.filter((i) => i.type === 'vip');
    if (cat === 'item') return items.filter((i) => i.type === 'item');
    if (cat === 'decoration') return items.filter((i) => i.type === 'decoration');
    return items;
}

function shopEmbed(user, guildId, cat = 'all') {
    const items = filterCat(shop.catalog(guildId), cat);
    const inv = shop.getInv(user.id);

    const lines = items.length
        ? items.slice(0, 12).map((i) => {
              const owned = inv.owned.includes(i.id) ? ' ✅' : '';
              return `**${i.name}**${owned}\n└ ${coin(i.currency)} **${fmt(i.price)}** · ${i.desc}`;
          })
        : ['_Nenhum item nesta categoria. VIPs são configurados no painel._'];

    const title =
        cat === 'vip'
            ? '👑  Loja · VIP'
            : cat === 'item'
              ? '🎁  Loja · Itens'
              : cat === 'decoration'
                ? '🎨  Loja · Decorações'
                : '🛒  Aeternus Loja';

    return new EmbedBuilder()
        .setColor(0xf0abfc)
        .setAuthor({
            name: 'Aeternus Boutique',
            iconURL: user.client?.user?.displayAvatarURL?.({ size: 64 })
        })
        .setTitle(title)
        .setDescription(
            [
                '```',
                '  ╔════════════════════════════╗',
                '  ║     AETERNUS  ·  SHOP      ║',
                '  ╚════════════════════════════╝',
                '```',
                `👤 ${user}`,
                `❄️ **${fmt(flocos.get(user.id))}** · 💠 **${fmt(cristais.get(user.id))}**`,
                '',
                ...lines
            ].join('\n')
        )
        .setFooter({ text: 'Compre · Equipe no perfil · VIP no painel web' })
        .setTimestamp();
}

function catRow(cat) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('loja:cat:all')
            .setLabel('Tudo')
            .setStyle(cat === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('loja:cat:vip')
            .setLabel('VIP')
            .setEmoji('👑')
            .setStyle(cat === 'vip' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('loja:cat:decoration')
            .setLabel('Decoração')
            .setEmoji('🎨')
            .setStyle(cat === 'decoration' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('loja:cat:item')
            .setLabel('Itens')
            .setEmoji('🎁')
            .setStyle(cat === 'item' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
}

function buySelect(guildId, cat) {
    const items = filterCat(shop.catalog(guildId), cat).slice(0, 25);
    if (!items.length) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('loja:noop')
                .setLabel('Sem itens')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
    }
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`loja:buy:${cat}`)
            .setPlaceholder('Escolha um item para comprar…')
            .addOptions(
                items.map((i) => ({
                    label: i.name.slice(0, 100),
                    value: i.id,
                    description: `${i.price} ${i.currency}`.slice(0, 100),
                    emoji: i.type === 'vip' ? '👑' : i.type === 'decoration' ? '🎨' : '🎁'
                }))
            )
    );
}

function equipSelect(userId) {
    const inv = shop.getInv(userId);
    const owned = shop.GLOBAL_ITEMS.filter(
        (i) => inv.owned.includes(i.id) && (i.type === 'decoration' || i.title)
    ).slice(0, 25);

    if (!owned.length) return null;

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('loja:equip')
            .setPlaceholder('Equipar decoração / título…')
            .addOptions(
                owned.map((i) => ({
                    label: i.name.slice(0, 100),
                    value: i.id,
                    description: (i.desc || i.type).slice(0, 100)
                }))
            )
    );
}

function components(user, guildId, cat) {
    const rows = [catRow(cat), buySelect(guildId, cat)];
    const eq = equipSelect(user.id);
    if (eq) rows.push(eq);
    return rows;
}

async function applyVipRole(interaction, item) {
    if (item.type !== 'vip' || !item.roleId) return { ok: true };
    try {
        const member = interaction.member;
        const role = interaction.guild.roles.cache.get(item.roleId);
        if (!role) return { ok: false, error: 'Cargo VIP não encontrado no servidor.' };
        await member.roles.add(role, 'Compra VIP na loja Aeternus');
        return { ok: true };
    } catch (e) {
        return { ok: false, error: 'Não consegui entregar o cargo (hierarquia/permissões).' };
    }
}

module.exports = {
    name: 'loja',
    aliases: ['shop', 'store', 'buy'],
    description: 'Loja Aeternus — VIP, itens e decorações',
    data: new SlashCommandBuilder()
        .setName('loja')
        .setDescription('Abre a loja Aeternus')
        .addStringOption((o) =>
            o
                .setName('categoria')
                .setDescription('Categoria')
                .setRequired(false)
                .addChoices(
                    { name: 'Tudo', value: 'all' },
                    { name: 'VIP', value: 'vip' },
                    { name: 'Decorações', value: 'decoration' },
                    { name: 'Itens', value: 'item' }
                )
        ),

    async execute(message, args) {
        const cat = (args[0] || 'all').toLowerCase();
        const c = ['all', 'vip', 'item', 'decoration', 'decoracao'].includes(cat)
            ? cat === 'decoracao'
                ? 'decoration'
                : cat
            : 'all';
        await message.reply({
            embeds: [shopEmbed(message.author, message.guild.id, c)],
            components: components(message.author, message.guild.id, c)
        });
    },

    async executeSlash(interaction) {
        const c = interaction.options.getString('categoria') || 'all';
        await interaction.reply({
            embeds: [shopEmbed(interaction.user, interaction.guild.id, c)],
            components: components(interaction.user, interaction.guild.id, c)
        });
    },

    async handleComponent(interaction) {
        const id = interaction.customId;
        if (id === 'loja:noop') {
            return interaction.reply({ content: 'Sem itens.', ephemeral: true });
        }

        if (id.startsWith('loja:cat:')) {
            const cat = id.split(':')[2];
            return interaction.update({
                embeds: [shopEmbed(interaction.user, interaction.guild.id, cat)],
                components: components(interaction.user, interaction.guild.id, cat)
            });
        }

        if (id.startsWith('loja:buy:')) {
            const itemId = interaction.values?.[0];
            const cat = id.split(':')[2] || 'all';
            const result = shop.buy(interaction.user.id, interaction.guild.id, itemId);
            if (!result.ok) {
                return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }

            let extra = '';
            if (result.item.type === 'vip') {
                const roleRes = await applyVipRole(interaction, result.item);
                extra = roleRes.ok
                    ? '\n👑 Cargo VIP entregue!'
                    : `\n⚠️ Compra ok, mas: ${roleRes.error}`;
            }
            if (result.gain) extra += `\n❄️ Você recebeu **${fmt(result.gain)}** flocos!`;
            if (result.boost) extra += `\n⚡ Boost de daily **+${result.boost}%** por 24h.`;

            await interaction.update({
                embeds: [shopEmbed(interaction.user, interaction.guild.id, cat)],
                components: components(interaction.user, interaction.guild.id, cat)
            });
            return interaction.followUp({
                content: `✅ Comprou **${result.item.name}** por ${coin(result.item.currency)} **${fmt(result.item.price)}**.${extra}`,
                ephemeral: true
            });
        }

        if (id === 'loja:equip') {
            const itemId = interaction.values?.[0];
            const result = shop.equip(interaction.user.id, itemId);
            if (!result.ok) {
                return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }
            return interaction.reply({
                content: `✅ Equipado: **${result.item.name}**. Veja em \`O.perfil\`.`,
                ephemeral: true
            });
        }
    }
};
