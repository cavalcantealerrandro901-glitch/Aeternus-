const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    SlashCommandBuilder
} = require('discord.js');
const { getPrefix } = require('../utils/settings');
const {
    listCategories,
    getCategory,
    findCommand
} = require('../utils/commandCatalog');

function introEmbed(client, prefix, guild) {
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setAuthor({
            name: `${client.user.username} · Ajuda`,
            iconURL: client.user.displayAvatarURL({ size: 64 })
        })
        .setTitle('Central de ajuda')
        .setDescription(
            [
                `Prefixo: \`${prefix}\` · também funciona com **/**`,
                guild ? `Servidor: **${guild.name}**` : null,
                '',
                'Escolha uma **categoria** no menu.',
                `Detalhe de um comando: \`${prefix}ajuda <comando>\``,
                `Ex.: \`${prefix}ajuda saldo\``
            ]
                .filter((x) => x != null)
                .join('\n')
        )
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }));
}

function categoryEmbed(cat, prefix) {
    const lines = cat.commands.map(
        (c) => `• **${prefix}${c.name}** · /${c.name} — ${c.desc}`
    );
    return new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`${cat.emoji}  ${cat.label}`)
        .setDescription(
            [cat.description, '', lines.join('\n'), '', `Detalhe: \`${prefix}ajuda <comando>\``].join(
                '\n'
            )
        );
}

function commandEmbed(cmd, prefix, liveCmd) {
    const usage = cmd.usage || cmd.name;
    const example = cmd.example || `${prefix}${cmd.name}`;
    const about = cmd.about || cmd.desc || liveCmd?.description || '—';
    const aliases =
        Array.isArray(liveCmd?.aliases) && liveCmd.aliases.length
            ? liveCmd.aliases.map((a) => `\`${prefix}${a}\``).join(', ')
            : null;

    const emb = new EmbedBuilder()
        .setColor(0x38bdf8)
        .setTitle(`Comando · ${cmd.name}`)
        .setDescription(about)
        .addFields(
            {
                name: 'Uso (prefixo)',
                value: `\`${prefix}${usage}\``,
                inline: false
            },
            {
                name: 'Slash',
                value: `\`/${cmd.name}\``,
                inline: true
            },
            {
                name: 'Categoria',
                value: `${cmd.category?.emoji || ''} ${cmd.category?.label || '—'}`,
                inline: true
            },
            {
                name: 'Exemplo',
                value: `\`${example.replace(/^O\./, prefix)}\``,
                inline: false
            }
        );
    if (aliases) emb.setFooter({ text: `Aliases: ${liveCmd.aliases.join(', ')}` });
    return emb;
}

function menuRow(selected) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help:category')
            .setPlaceholder('Ver categorias…')
            .addOptions(
                listCategories().map((c) => ({
                    label: c.label,
                    value: c.id,
                    emoji: c.emoji,
                    description: String(c.description || '').slice(0, 100),
                    default: selected === c.id
                }))
            )
    );
}

async function sendHelp(ctx, args = []) {
    const isSlash = Boolean(ctx.isChatInputCommand && ctx.isChatInputCommand());
    const guild = ctx.guild;
    const client = ctx.client;
    const prefix = getPrefix(guild?.id);
    const sub = (
        args[0] ||
        (isSlash
            ? ctx.options?.getString?.('comando') || ctx.options?.getString?.('categoria')
            : '') ||
        ''
    )
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
        const found = findCommand(sub);
        if (found) {
            const live =
                client.commands?.get(found.name) ||
                client.commands?.get(sub) ||
                null;
            return reply({
                embeds: [commandEmbed(found, prefix, live)],
                components: [menuRow(found.category?.id)]
            });
        }

        const cat = getCategory(sub);
        if (cat) {
            return reply({
                embeds: [categoryEmbed(cat, prefix)],
                components: [menuRow(cat.id)]
            });
        }

        const liveOnly = client.commands?.get(sub);
        if (liveOnly) {
            const fake = {
                name: liveOnly.name,
                desc: liveOnly.description || liveOnly.name,
                usage: liveOnly.name,
                example: `${prefix}${liveOnly.name}`,
                about: liveOnly.description || 'Comando do bot.',
                category: null
            };
            return reply({
                embeds: [commandEmbed(fake, prefix, liveOnly)],
                components: [menuRow(null)]
            });
        }

        return reply({
            content: `Não encontrei \`${sub}\`.\nUse \`${prefix}ajuda\` ou uma categoria: ${listCategories()
                .map((c) => c.id)
                .join(', ')}.`,
            ephemeral: isSlash
        });
    }

    return reply({
        embeds: [introEmbed(client, prefix, guild)],
        components: [menuRow(null)]
    });
}

module.exports = {
    name: 'help',
    aliases: ['ajuda', 'comandos', 'cmds'],
    description: 'Central de ajuda',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Central de ajuda')
        .addStringOption((o) =>
            o
                .setName('comando')
                .setDescription('Comando ou categoria (ex: saldo, economia)')
                .setRequired(false)
        ),

    async execute(message, args) {
        await sendHelp(message, args);
    },

    async executeSlash(interaction) {
        await sendHelp(interaction, []);
    },

    async handleComponent(interaction) {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'help:category') return;

        const prefix = getPrefix(interaction.guild?.id);
        const cat = getCategory(interaction.values?.[0]);
        if (!cat) {
            return interaction.reply({ content: 'Categoria inválida.', ephemeral: true });
        }
        return interaction.update({
            embeds: [categoryEmbed(cat, prefix)],
            components: [menuRow(cat.id)]
        });
    }
};
