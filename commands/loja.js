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
    return items.filter((i) => i.type !== 'decoration');
}

function shopEmbed(user, guildId, cat = 'item') {
    const items = filterCat(shop.catalog(guildId), cat);
    const inv = shop.getInv(user.id);
    const lines = items.length
        ? items.slice(0, 12).map((i) => {
              const owned = inv.owned.includes(i.id) ? ' ✅' : '';
              return `**${i.name}**${owned}\n└ ${coin(i.currency)} **${fmt(i.price)}** · ${i.desc}`;
          })
        : ['_Nenhum item nesta categoria._'];

    const title =
        cat === 'vip' ? '👑  Loja · VIP' : cat === 'item' ? '🎁  Loja · Itens' : '🛒  Aeternus Loja';

    return new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setAuthor({ name: 'Aeternus Boutique' })
        .setTitle(title)
        .setDescription(
            [
                `👤 ${user}`,
                `❄️ **${fmt(flocos.get(user.id))}** · 💠 **${fmt(cristais.get(user.id))}**`,
                '',
                '🎨 **Decorações** ficam no **painel** (imagens reais).',
                'Clique em **Decoração** ou na **foto de perfil** para gerenciar.',
                '',
                ...lines
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'VIP · Itens no Discord · Decorações no painel' })
        .setTimestamp();
}

function catRow(guildId) {
    const decorUrl = shop.decorPanelUrl(guildId);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('loja:cat:vip')
            .setLabel('VIP')
            .setEmoji('👑')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setLabel('Decoração')
            .setEmoji('🎨')
            .setStyle(ButtonStyle.Link)
            .setURL(decorUrl),
        new ButtonBuilder()
            .setCustomId('loja:cat:item')
            .setLabel('Itens')
            .setEmoji('🎁')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('loja:perfil')
            .setLabel('Meu perfil')
            .setEmoji('🖼️')
            .setStyle(ButtonStyle.Success)
    );
}

function buySelect(guildId, cat) {
    const items = filterCat(shop.catalog(guildId), cat).slice(0, 25);
    if (!items.length) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('loja:noop')
                .setLabel('Sem itens')
                .setDisabled(true)
                .setStyle(ButtonStyle.Secondary)
        );
    }
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`loja:buy:${cat}`)
            .setPlaceholder('Comprar…')
            .addOptions(
                items.map((i) => ({
                    label: i.name.slice(0, 100),
                    value: i.id,
                    description: `${i.price} ${i.currency}`.slice(0, 100),
                    emoji: i.type === 'vip' ? '👑' : '🎁'
                }))
            )
    );
}

function profileMenu() {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('loja:perfilmenu')
            .setPlaceholder('Sistemas do perfil…')
            .addOptions([
                {
                    label: 'Alterar perfil (decorações)',
                    value: 'alterar',
                    emoji: '🎨',
                    description: 'Ver e equipar imagens que você já comprou'
                },
                {
                    label: 'Ver perfil',
                    value: 'ver',
                    emoji: '👤',
                    description: 'Abrir O.perfil'
                },
                {
                    label: 'Loja de decorações (painel)',
                    value: 'painel',
                    emoji: '🛒',
                    description: 'Comprar novas imagens'
                }
            ])
    );
}

function equipOwnedSelect(userId) {
    const owned = shop.ownedDecorations(userId);
    if (!owned.length) return null;
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('loja:equip')
            .setPlaceholder('Equipar decoração comprada…')
            .addOptions(
                owned.slice(0, 25).map((i) => ({
                    label: i.name.slice(0, 100),
                    value: i.id,
                    description: (i.desc || '').slice(0, 100)
                }))
            )
    );
}

function components(user, guildId, cat) {
    return [catRow(guildId), buySelect(guildId, cat), profileMenu()];
}

async function applyVipRole(interaction, item) {
    if (item.type !== 'vip' || !item.roleId) return { ok: true };
    try {
        const role = interaction.guild.roles.cache.get(item.roleId);
        if (!role) return { ok: false, error: 'Cargo VIP não encontrado.' };
        await interaction.member.roles.add(role, 'VIP loja Aeternus');
        return { ok: true };
    } catch {
        return { ok: false, error: 'Falha ao entregar cargo (hierarquia).' };
    }
}

module.exports = {
    name: 'loja',
    aliases: ['shop', 'store', 'buy'],
    description: 'Loja Aeternus',
    data: new SlashCommandBuilder()
        .setName('loja')
        .setDescription('Abre a loja')
        .addStringOption((o) =>
            o
                .setName('categoria')
                .setRequired(false)
                .addChoices(
                    { name: 'VIP', value: 'vip' },
                    { name: 'Itens', value: 'item' }
                )
        ),

    async execute(message, args) {
        const cat = args[0] === 'vip' ? 'vip' : 'item';
        await message.reply({
            embeds: [shopEmbed(message.author, message.guild.id, cat)],
            components: components(message.author, message.guild.id, cat)
        });
    },

    async executeSlash(interaction) {
        const cat = interaction.options.getString('categoria') || 'item';
        await interaction.reply({
            embeds: [shopEmbed(interaction.user, interaction.guild.id, cat)],
            components: components(interaction.user, interaction.guild.id, cat)
        });
    },

    async handleComponent(interaction) {
        const id = interaction.customId;

        if (id === 'loja:noop') {
            return interaction.reply({ content: 'Sem itens.', ephemeral: true });
        }

        if (id === 'loja:cat:vip' || id === 'loja:cat:item') {
            const cat = id.split(':')[2];
            return interaction.update({
                embeds: [shopEmbed(interaction.user, interaction.guild.id, cat)],
                components: components(interaction.user, interaction.guild.id, cat)
            });
        }

        if (id === 'loja:perfil') {
            return interaction.reply({
                content: '🖼️ **Sistemas do perfil** — escolha abaixo:',
                components: [profileMenu()],
                ephemeral: true
            });
        }

        if (id === 'loja:perfilmenu') {
            const v = interaction.values?.[0];
            if (v === 'painel') {
                return interaction.reply({
                    content: `🎨 Decorações (imagens): ${shop.decorPanelUrl(interaction.guild.id)}`,
                    ephemeral: true
                });
            }
            if (v === 'ver') {
                const cmd = interaction.client.commands.get('perfil');
                if (cmd?.executeSlash) {
                    // fake minimal — reply with tip
                    return interaction.reply({
                        content: 'Use `O.perfil` ou `/perfil` para ver o card com a imagem.',
                        ephemeral: true
                    });
                }
            }
            if (v === 'alterar') {
                const owned = shop.ownedDecorations(interaction.user.id);
                if (!owned.length) {
                    return interaction.reply({
                        content: `Você ainda não comprou decorações.\nCompre aqui: ${shop.decorPanelUrl(interaction.guild.id)}`,
                        ephemeral: true
                    });
                }
                const eq = equipOwnedSelect(interaction.user.id);
                const list = owned.map((o) => `• **${o.name}**`).join('\n');
                return interaction.reply({
                    content: `🎨 **Suas decorações**\n${list}\n\nEscolha uma para equipar no perfil:`,
                    components: eq ? [eq] : [],
                    ephemeral: true
                });
            }
        }

        if (id.startsWith('loja:buy:')) {
            const itemId = interaction.values?.[0];
            const cat = id.split(':')[2] || 'item';
            const result = shop.buy(interaction.user.id, interaction.guild.id, itemId);
            if (!result.ok) {
                return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }
            let extra = '';
            if (result.item.type === 'vip') {
                const r = await applyVipRole(interaction, result.item);
                extra = r.ok ? '\n👑 Cargo VIP ok!' : `\n⚠️ ${r.error}`;
            }
            if (result.gain) extra += `\n❄️ +${fmt(result.gain)}`;
            await interaction.update({
                embeds: [shopEmbed(interaction.user, interaction.guild.id, cat)],
                components: components(interaction.user, interaction.guild.id, cat)
            });
            return interaction.followUp({
                content: `✅ **${result.item.name}** · ${coin(result.item.currency)} **${fmt(result.item.price)}**${extra}`,
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
                content: `✅ Decoração **${result.item.name}** equipada no perfil.\nVeja com \`O.perfil\`.`,
                ephemeral: true
            });
        }
    }
};
