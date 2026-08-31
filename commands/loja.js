const {
    EmbedBuilder,
    ActionRowBuilder,
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

function parseCat(raw) {
    const a = String(raw || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    if (['vip', 'vips', 'premium'].includes(a)) return 'vip';
    if (['decoracao', 'decoracoes', 'decor', 'bg', 'background', 'fundo'].includes(a)) {
        return 'decoracao';
    }
    if (['item', 'itens', 'items', 'titulo', 'titulos'].includes(a)) return 'itens';
    return 'menu';
}

function balLine(user) {
    return `❄️ **${fmt(flocos.get(user.id))}** · 💠 **${fmt(cristais.get(user.id))}**`;
}

function menuEmbed(user) {
    return new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setAuthor({ name: 'Aeternus Boutique' })
        .setTitle('🛒  Loja Aeternus')
        .setDescription(
            [
                `👤 ${user}`,
                balLine(user),
                '',
                'Escolha uma categoria:',
                '',
                '👑 **`loja vip`** — cargos VIP deste servidor',
                '🎨 **`loja decoração`** — fundos de perfil (painel)',
                '🎁 **`loja itens`** — títulos, boosts e caixas (painel)',
                '',
                '_VIPs são configurados no painel de confirmação do servidor._'
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'O.loja vip · O.loja decoração · O.loja itens' })
        .setTimestamp();
}

function menuRows(guildId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('loja:show:vip')
                .setLabel('VIP')
                .setEmoji('👑')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setLabel('Decoração')
                .setEmoji('🎨')
                .setStyle(ButtonStyle.Link)
                .setURL(shop.decorPanelUrl(guildId)),
            new ButtonBuilder()
                .setLabel('Itens')
                .setEmoji('🎁')
                .setStyle(ButtonStyle.Link)
                .setURL(shop.itemsPanelUrl(guildId))
        )
    ];
}

function vipEmbed(user, guild) {
    const list = shop.guildVips(guild?.id);
    const lines = list.length
        ? list.map(
              (v, i) =>
                  `**${i + 1}. ${v.name}**\n└ ${coin(v.currency)} **${fmt(v.price)}** · ${v.desc}${v.durationDays ? ` · ${v.durationDays}d` : ''}`
          )
        : [
              '_Nenhum VIP à venda neste servidor._',
              '',
              'Um administrador pode adicionar VIPs no **painel** → configurações da loja / confirmação.'
          ];

    return new EmbedBuilder()
        .setColor(0xf59e0b)
        .setAuthor({ name: 'Aeternus · VIP' })
        .setTitle(`👑  VIP · ${guild?.name || 'Servidor'}`)
        .setDescription(
            [
                `👤 ${user}`,
                balLine(user),
                '',
                ...lines,
                '',
                list.length
                    ? 'Compre no **painel de itens** (VIPs do servidor aparecem lá) ou peça a um adm o fluxo configurado.'
                    : ''
            ]
                .filter(Boolean)
                .join('\n')
        )
        .setThumbnail(guild?.iconURL?.({ size: 128 }) || user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'VIPs vêm do painel de confirmação deste servidor' })
        .setTimestamp();
}

function vipRows(guildId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Abrir loja de itens (VIP)')
                .setEmoji('👑')
                .setStyle(ButtonStyle.Link)
                .setURL(shop.itemsPanelUrl(guildId)),
            new ButtonBuilder()
                .setCustomId('loja:show:menu')
                .setLabel('Menu loja')
                .setStyle(ButtonStyle.Secondary)
        )
    ];
}

function decorEmbed(user) {
    return new EmbedBuilder()
        .setColor(0xc4b5fd)
        .setAuthor({ name: 'Aeternus · Decorações' })
        .setTitle('🎨  Galeria de Decorações')
        .setDescription(
            [
                `👤 ${user}`,
                balLine(user),
                '',
                '✨ **Fundos exclusivos** para o seu card de perfil.',
                '🖼️ Cada arte é única — preços em **cristais**.',
                '⚡ Ao comprar, o background **vai direto** para o `O.perfil`.',
                '',
                'Abra o painel, escolha a imagem que mais combina com você',
                'e transforme seu perfil num cartão de outro nível.',
                '',
                '_Dica: use o menu ☰ no canto superior direito para trocar para Itens._'
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'Compras no painel web · sincronizado com o bot' })
        .setTimestamp();
}

function decorRows(guildId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Abrir Decorações')
                .setEmoji('🎨')
                .setStyle(ButtonStyle.Link)
                .setURL(shop.decorPanelUrl(guildId)),
            new ButtonBuilder()
                .setLabel('Itens')
                .setEmoji('🎁')
                .setStyle(ButtonStyle.Link)
                .setURL(shop.itemsPanelUrl(guildId)),
            new ButtonBuilder()
                .setCustomId('loja:show:menu')
                .setLabel('Menu')
                .setStyle(ButtonStyle.Secondary)
        )
    ];
}

function itensEmbed(user) {
    return new EmbedBuilder()
        .setColor(0x6366f1)
        .setAuthor({ name: 'Aeternus · Itens' })
        .setTitle('🎁  Loja de Itens')
        .setDescription(
            [
                `👤 ${user}`,
                balLine(user),
                '',
                '👑 **Títulos** — aparecem no seu `O.perfil` na hora',
                '⚡ **Boosts** — daily e bônus temporários',
                '📦 **Caixas** — recompensas instantâneas',
                '💎 **VIP do servidor** — se o adm configurou no painel',
                '',
                'Tudo é comprado no **painel**. Seu saldo de flocos e cristais',
                'é o mesmo do bot — seguro e sincronizado.',
                '',
                '_Após comprar um título, use `O.perfil` para ver a mudança._'
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'Painel · Itens & Títulos' })
        .setTimestamp();
}

function itensRows(guildId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Abrir Itens')
                .setEmoji('🎁')
                .setStyle(ButtonStyle.Link)
                .setURL(shop.itemsPanelUrl(guildId)),
            new ButtonBuilder()
                .setLabel('Decorações')
                .setEmoji('🎨')
                .setStyle(ButtonStyle.Link)
                .setURL(shop.decorPanelUrl(guildId)),
            new ButtonBuilder()
                .setCustomId('loja:show:menu')
                .setLabel('Menu')
                .setStyle(ButtonStyle.Secondary)
        )
    ];
}

function build(cat, user, guild) {
    const gid = guild?.id;
    if (cat === 'vip') {
        return { embeds: [vipEmbed(user, guild)], components: vipRows(gid) };
    }
    if (cat === 'decoracao') {
        return { embeds: [decorEmbed(user)], components: decorRows(gid) };
    }
    if (cat === 'itens') {
        return { embeds: [itensEmbed(user)], components: itensRows(gid) };
    }
    return { embeds: [menuEmbed(user)], components: menuRows(gid) };
}

module.exports = {
    name: 'loja',
    aliases: ['shop', 'store', 'buy'],
    description: 'Loja: vip · decoração · itens',
    data: new SlashCommandBuilder()
        .setName('loja')
        .setDescription('Abre a loja Aeternus')
        .addStringOption((o) =>
            o
                .setName('categoria')
                .setDescription('vip | decoracao | itens')
                .setRequired(false)
                .addChoices(
                    { name: 'Menu', value: 'menu' },
                    { name: 'VIP', value: 'vip' },
                    { name: 'Decoração', value: 'decoracao' },
                    { name: 'Itens', value: 'itens' }
                )
        ),

    async execute(message, args) {
        const cat = parseCat(args?.[0]);
        await message.reply(build(cat, message.author, message.guild));
    },

    async executeSlash(interaction) {
        const cat = parseCat(interaction.options.getString('categoria') || 'menu');
        await interaction.reply(build(cat, interaction.user, interaction.guild));
    },

    async handleComponent(interaction) {
        const id = interaction.customId;
        if (!id.startsWith('loja:show:')) return;

        const cat = id.split(':')[2] || 'menu';
        const payload = build(cat, interaction.user, interaction.guild);
        return interaction.update(payload);
    }
};
