const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder
} = require('discord.js');
const items = require('../utils/items');
const craft = require('../utils/craft');
const player = require('../utils/player');
const eter = require('../utils/eter');

const COLOR = 0x22d3ee;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function shopEmbed(user) {
    const bal = eter.get(user.id);
    const lines = items.TRADE_SHOP.map((e, i) => {
        const tag = e.mode === 'buy' ? '🛒 Comprar' : '💰 Vender';
        return `**${i + 1}.** ${e.emoji} ${e.name}\n└ ${tag} · ✨ **${fmt(e.priceEter)}** éter · id \`${e.id}\``;
    });

    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'Loja de Troca · Aeternus' })
        .setTitle('🔄 Mercado de Materiais')
        .setDescription(
            [
                `👤 ${user}`,
                `✨ Saldo: **${fmt(bal)}** éter`,
                '',
                ...lines,
                '',
                '_Use os botões ou `O.troca comprar/vender <id>`._'
            ].join('\n')
        )
        .setFooter({ text: 'O.troca · O.materiais · O.craft' })
        .setTimestamp();
}

function shopRows(userId) {
    const rows = [];
    let row = new ActionRowBuilder();
    let count = 0;

    for (const e of items.TRADE_SHOP.slice(0, 20)) {
        const btn = new ButtonBuilder()
            .setCustomId(`troca:do:${userId}:${e.id}`)
            .setLabel(
                `${e.mode === 'buy' ? 'Comprar' : 'Vender'} ${e.name}`.slice(0, 80)
            )
            .setStyle(e.mode === 'buy' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji(e.emoji);

        row.addComponents(btn);
        count++;
        if (count % 5 === 0) {
            rows.push(row);
            row = new ActionRowBuilder();
        }
    }
    if (row.components.length) rows.push(row);
    return rows.slice(0, 5);
}

function doTrade(userId, offerId) {
    const offer = items.TRADE_SHOP.find((x) => x.id === offerId);
    if (!offer) return { ok: false, error: 'Oferta não encontrada.' };

    const profile = player.get(userId);
    if (!profile?.name) return { ok: false, error: 'Crie um personagem com `O.j criar`.' };

    if (offer.mode === 'buy') {
        const price = offer.priceEter * (offer.amount || 1);
        if (eter.get(userId) < price) {
            return { ok: false, error: `Éter insuficiente. Precisa de **${fmt(price)}**.` };
        }
        eter.remove(userId, price, { reason: 'loja-troca' });

        if (offer.type === 'material') {
            craft.addMaterials(userId, { [offer.materialId]: offer.amount || 1 });
        } else if (offer.type === 'item' && offer.itemId) {
            const inst = items.instantiateItem(offer.itemId);
            if (inst) player.addItem(userId, inst);
        }

        return {
            ok: true,
            message: `Comprou ${offer.emoji} **${offer.name}** por ✨ **${fmt(price)}** éter.`
        };
    }

    // sell
    if (offer.type === 'material') {
        const need = offer.amount || 1;
        const mats = craft.materialsOf(userId);
        if ((mats[offer.materialId] || 0) < need) {
            return { ok: false, error: `Você não tem ${offer.emoji} **${offer.name}** suficiente.` };
        }
        craft.removeMaterials(userId, { [offer.materialId]: need });
        const gain = offer.priceEter * need;
        eter.add(userId, gain, { reason: 'loja-troca-venda' });
        return {
            ok: true,
            message: `Vendeu ${offer.emoji} **${offer.name}** ×${need} por ✨ **${fmt(gain)}** éter.`
        };
    }

    return { ok: false, error: 'Tipo de oferta inválido.' };
}

module.exports = {
    name: 'troca',
    aliases: ['tradear', 'mercado', 'lojacraft', 'loja-troca'],
    description: 'Loja de troca de materiais e itens de craft',
    data: new SlashCommandBuilder()
        .setName('troca')
        .setDescription('Loja de troca de materiais')
        .addStringOption((o) =>
            o
                .setName('acao')
                .setDescription('mostrar | comprar | vender')
                .setRequired(false)
                .addChoices(
                    { name: 'Mostrar loja', value: 'mostrar' },
                    { name: 'Comprar', value: 'comprar' },
                    { name: 'Vender', value: 'vender' }
                )
        )
        .addStringOption((o) =>
            o.setName('id').setDescription('ID da oferta').setRequired(false)
        ),

    async execute(message, args) {
        const a0 = String(args[0] || '').toLowerCase();
        const a1 = String(args[1] || '').toLowerCase();

        if (!a0 || a0 === 'mostrar' || a0 === 'loja' || a0 === 'list') {
            return message.reply({
                embeds: [shopEmbed(message.author)],
                components: shopRows(message.author.id)
            });
        }

        let offerId = a1 || a0;
        if (['comprar', 'buy', 'vender', 'sell'].includes(a0)) {
            offerId = a1;
        }

        if (!offerId) {
            return message.reply('Informe o id da oferta. Ex: `O.troca comprar buy_po`');
        }

        const res = doTrade(message.author.id, offerId);
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(res.ok ? 0x34d399 : 0xf87171)
                    .setTitle(res.ok ? 'Troca realizada' : 'Troca falhou')
                    .setDescription(res.message || res.error)
            ]
        });
    },

    async executeSlash(i) {
        const acao = i.options.getString('acao') || 'mostrar';
        const id = i.options.getString('id');

        if (acao === 'mostrar' || !id) {
            return i.reply({
                embeds: [shopEmbed(i.user)],
                components: shopRows(i.user.id)
            });
        }

        const res = doTrade(i.user.id, id);
        return i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(res.ok ? 0x34d399 : 0xf87171)
                    .setTitle(res.ok ? 'Troca realizada' : 'Troca falhou')
                    .setDescription(res.message || res.error)
            ]
        });
    },

    async handleComponent(interaction) {
        const parts = (interaction.customId || '').split(':');
        if (parts[0] !== 'troca' || parts[1] !== 'do') return;

        const ownerId = parts[2];
        const offerId = parts[3];

        if (interaction.user.id !== ownerId) {
            return interaction.reply({
                content: 'Abra a loja com `O.troca` para usar os botões.',
                flags: 64
            });
        }

        const res = doTrade(interaction.user.id, offerId);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(res.ok ? 0x34d399 : 0xf87171)
                    .setTitle(res.ok ? 'Troca realizada' : 'Troca falhou')
                    .setDescription(res.message || res.error)
            ],
            flags: 64
        });

        // atualiza embed da loja com saldo novo
        try {
            await interaction.message.edit({
                embeds: [shopEmbed(interaction.user)],
                components: shopRows(interaction.user.id)
            });
        } catch (_) {}
    }
};
