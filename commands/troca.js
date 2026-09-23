const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    MessageFlags
} = require('discord.js');
const trade = require('../utils/trade');
const player = require('../utils/player');
const eter = require('../utils/eter');
const xp = require('../utils/xp');

const COLOR = 0x22d3ee;

function panelBase() {
    const base =
        process.env.RENDER_EXTERNAL_URL ||
        process.env.PANEL_URL ||
        process.env.WEB_URL ||
        '';
    return String(base || '').replace(/\/$/, '');
}

function panelLink(tradeId) {
    const base = panelBase();
    if (!base) return null;
    return `${base}/troca?id=${encodeURIComponent(tradeId)}`;
}

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function sideBlock(label, userId, side) {
    const sum = trade.summarizeSide(userId, side);
    return (
        `**${label}** <@${userId}> ${side.confirmed ? '✅' : '⏳'}\n` +
        `✨ Éter: **${fmt(sum.eter)}**\n` +
        `⚡ Intensidade: **${fmt(sum.intensity)}**\n` +
        `🎒 Itens:\n${sum.itemsText}`
    );
}

function tradeEmbed(session) {
    const link = panelLink(session.id);
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'Troca entre jogadores · Aeternus' })
        .setTitle(`🔄 Troca \`${session.id}\``)
        .setDescription(
            [
                sideBlock('Lado A', session.aId, session.a),
                '',
                sideBlock('Lado B', session.bId, session.b),
                '',
                link
                    ? `🖥️ **Painel (recomendado):** [abrir troca](${link})`
                    : '_Configure PANEL_URL / RENDER_EXTERNAL_URL para o link do painel._',
                '',
                '_Os dois precisam confirmar. Qualquer mudança na oferta reseta as confirmações._'
            ].join('\n')
        )
        .setFooter({ text: 'Expira em ~30 min · O.troca' })
        .setTimestamp();
    return emb;
}

function tradeRows(session) {
    const link = panelLink(session.id);
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`troca:confirm:${session.id}`)
                .setLabel('Confirmar')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`troca:cancel:${session.id}`)
                .setLabel('Cancelar')
                .setEmoji('✖️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`troca:refresh:${session.id}`)
                .setLabel('Atualizar')
                .setStyle(ButtonStyle.Secondary)
        )
    ];
    if (link) {
        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Abrir no painel')
                    .setStyle(ButtonStyle.Link)
                    .setURL(link)
            )
        );
    }
    return rows;
}

function resolveUser(message, args) {
    const mentioned = message.mentions.users.first();
    if (mentioned) return mentioned;
    const raw = String(args[0] || '').replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(raw)) {
        return message.client.users.fetch(raw).catch(() => null);
    }
    return null;
}

module.exports = {
    name: 'troca',
    aliases: ['trade', 'trocar'],
    description: 'Troca éter, itens e intensidade com outro jogador (painel)',
    category: 'economia',

    data: new SlashCommandBuilder()
        .setName('troca')
        .setDescription('Inicia troca com outro jogador')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Com quem trocar').setRequired(true)
        ),

    async execute(message, args) {
        const target = await resolveUser(message, args);
        if (!target || target.bot) {
            return message.reply(
                'Use: `O.troca @usuário`\n' +
                    'A troca é **entre jogadores** (éter, itens e intensidade).\n' +
                    'O painel web deixa mais confortável montar a oferta.'
            );
        }
        if (target.id === message.author.id) {
            return message.reply('Você não pode trocar consigo mesmo.');
        }

        const res = trade.createTrade(message.author.id, target.id);
        if (!res.ok) {
            return message.reply(`❌ ${res.error}`);
        }

        return message.reply({
            content: `${message.author} ↔ ${target} — montem a oferta no **painel** ou pelos botões.`,
            embeds: [tradeEmbed(res.session)],
            components: tradeRows(res.session)
        });
    },

    async executeSlash(i) {
        const target = i.options.getUser('usuario', true);
        if (target.bot) {
            return i.reply({ content: 'Não dá para trocar com bots.', flags: MessageFlags.Ephemeral });
        }
        if (target.id === i.user.id) {
            return i.reply({
                content: 'Você não pode trocar consigo mesmo.',
                flags: MessageFlags.Ephemeral
            });
        }

        const res = trade.createTrade(i.user.id, target.id);
        if (!res.ok) {
            return i.reply({ content: `❌ ${res.error}`, flags: MessageFlags.Ephemeral });
        }

        return i.reply({
            content: `${i.user} ↔ ${target} — montem a oferta no **painel** ou pelos botões.`,
            embeds: [tradeEmbed(res.session)],
            components: tradeRows(res.session)
        });
    },

    async handleComponent(interaction) {
        const id = String(interaction.customId || '');
        if (!id.startsWith('troca:')) return;

        const parts = id.split(':');
        const action = parts[1];
        const tradeId = parts[2];
        const session = trade.getTrade(tradeId);

        if (!session) {
            return interaction.reply({
                content: 'Esta troca expirou ou já foi finalizada.',
                flags: MessageFlags.Ephemeral
            });
        }

        const side = trade.sideOf(session, interaction.user.id);
        if (!side) {
            return interaction.reply({
                content: 'Só os dois participantes podem usar estes botões.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === 'refresh') {
            return interaction.update({
                embeds: [tradeEmbed(session)],
                components: tradeRows(session)
            });
        }

        if (action === 'cancel') {
            trade.cancelTrade(tradeId, interaction.user.id);
            return interaction.update({
                content: `✖️ Troca cancelada por <@${interaction.user.id}>.`,
                embeds: [],
                components: []
            });
        }

        if (action === 'confirm') {
            // Atalho Discord: se oferta vazia, avisa para usar o painel
            const mine = session[side];
            const other = side === 'a' ? session.b : session.a;
            const empty =
                !mine.eter &&
                !mine.intensity &&
                !(mine.itemIndexes || []).length &&
                !other.eter &&
                !other.intensity &&
                !(other.itemIndexes || []).length;

            if (empty && !mine.confirmed) {
                const link = panelLink(session.id);
                return interaction.reply({
                    content:
                        'Monte a oferta no **painel** (éter, itens, intensidade) antes de confirmar.' +
                        (link ? `\n${link}` : ''),
                    flags: MessageFlags.Ephemeral
                });
            }

            const res = trade.toggleConfirm(tradeId, interaction.user.id);
            if (!res.ok) {
                return interaction.reply({
                    content: `❌ ${res.error}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (res.executed) {
                return interaction.update({
                    content: `✅ **Troca concluída!** ${session.aId === interaction.user.id ? `<@${session.aId}> ↔ <@${session.bId}>` : `<@${session.aId}> ↔ <@${session.bId}>`}`,
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x34d399)
                            .setTitle('Troca finalizada')
                            .setDescription('Éter, itens e intensidade foram transferidos.')
                    ],
                    components: []
                });
            }

            const fresh = trade.getTrade(tradeId) || res.session;
            return interaction.update({
                embeds: [tradeEmbed(fresh)],
                components: tradeRows(fresh)
            });
        }
    }
};
