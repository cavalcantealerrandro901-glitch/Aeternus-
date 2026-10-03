const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    SlashCommandBuilder
} = require('discord.js');
const trade = require('../utils/trade');

const COLOR = 0x38bdf8;

function sideBlock(label, userId, side) {
    const items = (side.itemIndexes || []).length
        ? side.itemIndexes.map((i) => '#' + i).join(', ')
        : '_nenhum_';
    return [
        `**${label}** · <@${userId}> ${side.confirmed ? '✅' : '⏳'}`,
        `✨ Éter: **${side.eter || 0}**`,
        `⚡ Intensidade: **${side.intensity || 0}**`,
        `📦 Itens: ${items}`
    ].join('\n');
}

function tradeEmbed(session) {
    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'Troca entre jogadores · Aeternus' })
        .setTitle('🔄 Troca `' + session.id + '`')
        .setDescription(
            [
                sideBlock('Lado A', session.aId, session.a),
                '',
                sideBlock('Lado B', session.bId, session.b),
                '',
                '_Use os botões abaixo para montar a oferta no Discord._',
                '_Os dois precisam confirmar. Qualquer mudança reseta as confirmações._'
            ].join('\n')
        )
        .setFooter({ text: 'Expira em ~30 min · O.troca @user' })
        .setTimestamp();
}

function tradeRows(session) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('troca:eter:' + session.id)
                .setLabel('Éter')
                .setEmoji('✨')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('troca:int:' + session.id)
                .setLabel('Intensidade')
                .setEmoji('⚡')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('troca:item:' + session.id)
                .setLabel('Itens')
                .setEmoji('📦')
                .setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('troca:confirm:' + session.id)
                .setLabel('Confirmar')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('troca:cancel:' + session.id)
                .setLabel('Cancelar')
                .setEmoji('✖️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('troca:refresh:' + session.id)
                .setLabel('Atualizar')
                .setStyle(ButtonStyle.Secondary)
        )
    ];
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
    description: 'Troca éter, itens e intensidade com outro jogador (Discord)',
    category: 'economia',

    data: new SlashCommandBuilder()
        .setName('troca')
        .setDescription('Inicia troca com outro jogador')
        .addUserOption((o) =>
            o.setName('jogador').setDescription('Com quem trocar').setRequired(true)
        ),

    async execute(message, args) {
        const target = await resolveUser(message, args);
        if (!target || target.bot) {
            return message.reply(
                'Uso: `O.troca @jogador`\nTroca **éter**, **itens** e **intensidade** direto no Discord.'
            );
        }
        if (target.id === message.author.id) {
            return message.reply('Você não pode trocar consigo mesmo.');
        }

        const res = trade.createTrade(message.author.id, target.id);
        if (!res.ok) return message.reply('❌ ' + res.error);

        return message.reply({
            content: `<@${message.author.id}> ↔ <@${target.id}> — montem a oferta nos botões.`,
            embeds: [tradeEmbed(res.session)],
            components: tradeRows(res.session)
        });
    },

    async executeSlash(interaction) {
        const target = interaction.options.getUser('jogador', true);
        const reply = (p) =>
            interaction.replied || interaction.deferred
                ? interaction.editReply(p)
                : interaction.reply(p);

        if (target.bot) return reply({ content: 'Não é possível trocar com bots.', ephemeral: true });
        if (target.id === interaction.user.id) {
            return reply({ content: 'Você não pode trocar consigo mesmo.', ephemeral: true });
        }

        const res = trade.createTrade(interaction.user.id, target.id);
        if (!res.ok) return reply({ content: '❌ ' + res.error, ephemeral: true });

        return reply({
            content: `<@${interaction.user.id}> ↔ <@${target.id}> — montem a oferta nos botões.`,
            embeds: [tradeEmbed(res.session)],
            components: tradeRows(res.session)
        });
    },

    async handleComponent(interaction) {
        const parts = String(interaction.customId || '').split(':');
        const action = parts[1];
        const tradeId = parts[2];
        const session = trade.getTrade(tradeId);

        if (!session) {
            return interaction
                .reply({ content: 'Esta troca expirou ou já foi finalizada.', ephemeral: true })
                .catch(() => {});
        }

        const side = trade.sideOf(session, interaction.user.id);
        if (!side) {
            return interaction
                .reply({
                    content: 'Só os dois participantes podem usar estes botões.',
                    ephemeral: true
                })
                .catch(() => {});
        }

        if (action === 'eter' || action === 'int') {
            const isEter = action === 'eter';
            const modal = new ModalBuilder()
                .setCustomId('troca:modal:' + (isEter ? 'eter' : 'int') + ':' + tradeId)
                .setTitle(isEter ? 'Ofertar Éter' : 'Ofertar Intensidade');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('valor')
                        .setLabel(isEter ? 'Quantidade de éter' : 'Pontos de intensidade')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('Ex: 100 · 0 para zerar')
                )
            );
            return interaction.showModal(modal);
        }

        if (action === 'item') {
            const bag = trade.bagFor(interaction.user.id);
            const inv = bag.inventory || [];
            if (!inv.length) {
                return interaction
                    .reply({ content: 'Seu inventário está vazio.', ephemeral: true })
                    .catch(() => {});
            }
            const options = inv.slice(0, 25).map((it) => ({
                label: String(it.name || 'item').slice(0, 100),
                value: String(it.index),
                description: ('#' + it.index + (it.rarity ? ' · ' + it.rarity : '')).slice(0, 100),
                emoji: it.emoji && String(it.emoji).length <= 4 ? it.emoji : undefined
            }));
            const menu = new StringSelectMenuBuilder()
                .setCustomId('troca:items:' + tradeId)
                .setPlaceholder('Selecione itens para ofertar')
                .setMinValues(0)
                .setMaxValues(Math.min(options.length, 10))
                .addOptions(options);
            return interaction
                .reply({
                    content: 'Escolha os itens da oferta:',
                    components: [new ActionRowBuilder().addComponents(menu)],
                    ephemeral: true
                })
                .catch(() => {});
        }

        if (action === 'items' && interaction.isStringSelectMenu()) {
            const indexes = (interaction.values || []).map((v) => Math.floor(Number(v)));
            const res = trade.setOffer(tradeId, interaction.user.id, { itemIndexes: indexes });
            if (!res.ok) {
                return interaction
                    .reply({ content: '❌ ' + res.error, ephemeral: true })
                    .catch(() => {});
            }
            return interaction
                .update({
                    content:
                        '📦 Itens atualizados: ' +
                        (indexes.length ? indexes.map((i) => '#' + i).join(', ') : 'nenhum') +
                        '\nClique **Atualizar** na mensagem da troca.',
                    components: []
                })
                .catch(() => {});
        }

        if (action === 'refresh') {
            return interaction
                .update({ embeds: [tradeEmbed(session)], components: tradeRows(session) })
                .catch(() => {});
        }

        if (action === 'cancel') {
            trade.cancelTrade(tradeId, interaction.user.id);
            return interaction
                .update({
                    content: '✖️ Troca cancelada por <@' + interaction.user.id + '>.',
                    embeds: [],
                    components: []
                })
                .catch(() => {});
        }

        if (action === 'confirm') {
            const mine = session[side];
            const other = side === 'a' ? session.b : session.a;
            const bothEmpty =
                !mine.eter &&
                !mine.intensity &&
                !(mine.itemIndexes || []).length &&
                !other.eter &&
                !other.intensity &&
                !(other.itemIndexes || []).length;

            if (bothEmpty && !mine.confirmed) {
                return interaction
                    .reply({
                        content:
                            'Monte a oferta com **Éter**, **Intensidade** ou **Itens** antes de confirmar.',
                        ephemeral: true
                    })
                    .catch(() => {});
            }

            const res = trade.toggleConfirm(tradeId, interaction.user.id);
            if (!res.ok) {
                return interaction
                    .reply({ content: '❌ ' + res.error, ephemeral: true })
                    .catch(() => {});
            }

            if (res.executed) {
                return interaction
                    .update({
                        content:
                            '✅ **Troca concluída!** <@' +
                            session.aId +
                            '> ↔ <@' +
                            session.bId +
                            '>',
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x34d399)
                                .setTitle('Troca finalizada')
                                .setDescription('Éter, itens e intensidade foram transferidos.')
                        ],
                        components: []
                    })
                    .catch(() => {});
            }

            const fresh = trade.getTrade(tradeId) || res.session;
            return interaction
                .update({ embeds: [tradeEmbed(fresh)], components: tradeRows(fresh) })
                .catch(() => {});
        }
    },

    async handleModal(interaction) {
        const id = String(interaction.customId || '');
        if (!id.startsWith('troca:modal:')) return;

        const parts = id.split(':');
        const kind = parts[2];
        const tradeId = parts[3];
        const session = trade.getTrade(tradeId);
        if (!session) {
            return interaction.reply({ content: 'Troca expirada.', ephemeral: true }).catch(() => {});
        }
        if (!trade.sideOf(session, interaction.user.id)) {
            return interaction.reply({ content: 'Você não participa.', ephemeral: true }).catch(() => {});
        }

        const raw = interaction.fields.getTextInputValue('valor');
        const n = Math.max(
            0,
            Math.floor(Number(String(raw).replace(/[^\d.-]/g, '')) || 0)
        );
        const patch = kind === 'eter' ? { eter: n } : { intensity: n };
        const res = trade.setOffer(tradeId, interaction.user.id, patch);
        if (!res.ok) {
            return interaction.reply({ content: '❌ ' + res.error, ephemeral: true }).catch(() => {});
        }

        const fresh = trade.getTrade(tradeId) || res.session;
        return interaction
            .reply({
                content:
                    '✅ Oferta atualizada. Clique **Atualizar** na mensagem da troca para ver.',
                embeds: [tradeEmbed(fresh)],
                ephemeral: true
            })
            .catch(() => {});
    }
};
