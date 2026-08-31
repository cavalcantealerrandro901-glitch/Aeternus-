const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const { getPrefix } = require('../utils/settings');
const { listCategories, getCategory } = require('../utils/commandCatalog');

function introEmbed(client, prefix, guild) {
    const name = client.user.username;
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setAuthor({
            name: `${name} · Central de Ajuda`,
            iconURL: client.user.displayAvatarURL({ size: 64 })
        })
        .setTitle('Olá — é um prazer ter você por aqui')
        .setDescription(
            [
                `Eu sou o **${name}**, um bot de economia, jogos e utilidades feito para deixar o servidor mais vivo.`,
                '',
                '**Como funciono**',
                '• Comandos por **prefixo** no chat',
                '• Comandos por **barra /** (slash)',
                '• Painel web para configurações do servidor',
                '',
                `**Prefixo neste servidor:** \`${prefix}\``,
                guild ? `**Servidor:** ${guild.name}` : null,
                '',
                'Escolha uma **categoria** no menu abaixo.',
                'Use os botões para alternar entre visão **Prefixo** e **Slash**.',
                '',
                `Atalho: \`${prefix}ajuda <categoria>\` · ex: \`${prefix}ajuda economia\``
            ]
                .filter((x) => x != null)
                .join('\n')
        )
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Aeternus · cordial · elegante' })
        .setTimestamp();
}

function categoryEmbed(cat, prefix, mode) {
    const isSlash = mode === 'slash';
    const lines = cat.commands.map((c) => {
        if (isSlash) return `• **/${c.name}** — ${c.desc}`;
        return `• **${prefix}${c.name}** — ${c.desc}`;
    });

    return new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`${cat.emoji}  ${cat.label}`)
        .setDescription(
            [
                cat.description,
                '',
                isSlash ? '**Comandos slash /**' : `**Comandos com prefixo** \`${prefix}\``,
                '',
                lines.join('\n')
            ].join('\n')
        )
        .setFooter({
            text: isSlash
                ? 'Visão Slash · use / no Discord'
                : `Visão Prefixo · comece com ${prefix}`
        })
        .setTimestamp();
}

function menuRow(selected) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('help:category')
        .setPlaceholder('Escolha uma categoria…')
        .addOptions(
            listCategories().map((c) => ({
                label: c.label,
                value: c.id,
                emoji: c.emoji,
                description: c.description.slice(0, 100),
                default: selected === c.id
            }))
        );
    return new ActionRowBuilder().addComponents(menu);
}

function modeRow(mode, categoryId) {
    const cat = categoryId || 'economia';
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`help:mode:prefix:${cat}`)
            .setLabel('Prefixo')
            .setEmoji('💬')
            .setStyle(mode === 'prefix' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`help:mode:slash:${cat}`)
            .setLabel('Slash /')
            .setEmoji('⚡')
            .setStyle(mode === 'slash' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('help:home')
            .setLabel('Início')
            .setEmoji('🏠')
            .setStyle(ButtonStyle.Secondary)
    );
}

async function sendHelp(ctx, args = []) {
    const isSlash = Boolean(ctx.isChatInputCommand && ctx.isChatInputCommand());
    const guild = ctx.guild;
    const client = ctx.client;
    const prefix = getPrefix(guild?.id);
    const sub = (args[0] || (isSlash ? ctx.options?.getString?.('categoria') : '') || '')
        .toLowerCase()
        .trim();

    const reply = async (payload) => {
        if (isSlash) {
            if (ctx.deferred || ctx.replied) return ctx.editReply(payload);
            return ctx.reply(payload);
        }
        return ctx.reply(payload);
    };

    if (sub) {
        const cat = getCategory(sub);
        if (!cat) {
            return reply({
                content: `Categoria não encontrada. Use: ${listCategories()
                    .map((c) => c.id)
                    .join(', ')}`,
                ephemeral: isSlash
            });
        }
        return reply({
            embeds: [categoryEmbed(cat, prefix, 'prefix')],
            components: [menuRow(cat.id), modeRow('prefix', cat.id)]
        });
    }

    return reply({
        embeds: [introEmbed(client, prefix, guild)],
        components: [menuRow(null), modeRow('prefix', 'economia')]
    });
}

module.exports = {
    name: 'help',
    aliases: ['ajuda', 'comandos', 'cmds'],
    description: 'Central de ajuda do Aeternus',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Central de ajuda do Aeternus')
        .addStringOption((o) =>
            o
                .setName('categoria')
                .setDescription('Filtrar por categoria')
                .setRequired(false)
                .addChoices(
                    ...listCategories().map((c) => ({ name: c.label, value: c.id }))
                )
        ),

    async execute(message, args) {
        await sendHelp(message, args);
    },

    async executeSlash(interaction) {
        await sendHelp(interaction, []);
    },

    async handleComponent(interaction) {
        const prefix = getPrefix(interaction.guild?.id);
        const id = interaction.customId;

        if (id === 'help:home') {
            return interaction.update({
                embeds: [introEmbed(interaction.client, prefix, interaction.guild)],
                components: [menuRow(null), modeRow('prefix', 'economia')]
            });
        }

        if (id === 'help:category' || interaction.isStringSelectMenu()) {
            const catId = interaction.values?.[0];
            const cat = getCategory(catId);
            if (!cat) {
                return interaction.reply({ content: 'Categoria inválida.', ephemeral: true });
            }
            return interaction.update({
                embeds: [categoryEmbed(cat, prefix, 'prefix')],
                components: [menuRow(cat.id), modeRow('prefix', cat.id)]
            });
        }

        if (id.startsWith('help:mode:')) {
            const [, , mode, catId] = id.split(':');
            const cat = getCategory(catId) || getCategory('economia');
            return interaction.update({
                embeds: [categoryEmbed(cat, prefix, mode === 'slash' ? 'slash' : 'prefix')],
                components: [menuRow(cat.id), modeRow(mode === 'slash' ? 'slash' : 'prefix', cat.id)]
            });
        }
    }
};
