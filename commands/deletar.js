const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const player = require('../utils/player');

function format(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function executeSale(userId, quantityArg, slotArg) {
    const slot = Number(slotArg);
    if (!Number.isInteger(slot) || slot < 1) {
        return { error: 'Informe um número de slot válido.' };
    }

    const raw = String(quantityArg || '').toLowerCase();
    const quantity = raw === 'all' ? Infinity : Number(quantityArg);

    if (raw !== 'all' && (!Number.isInteger(quantity) || quantity < 1)) {
        return { error: 'A quantidade deve ser um número inteiro positivo ou **all**.' };
    }

    return player.sellItem(userId, slot, quantity);
}

function successMessage(result, slot) {
    return '💰 **Slot #' + String(slot).padStart(2, '0') + ' vendido.**\n' +
        (result.item.emoji || '📦') + ' **' + result.item.name + '** ×' + result.quantity +
        ' por **✨ ' + format(result.totalValue) + ' Éter**.';
}

module.exports = {
    name: 'vender',
    aliases: ['venderslot', 'sellslot'],
    description: 'Vender itens de um slot do inventário',
    data: new SlashCommandBuilder()
        .setName('vender')
        .setDescription('Vender itens do inventário')
        .addSubcommand((s) => s
            .setName('slot')
            .setDescription('Vender uma quantidade de um slot')
            .addStringOption((o) => o
                .setName('quantidade')
                .setDescription('Quantidade a vender ou all')
                .setRequired(true)
            )
            .addIntegerOption((o) => o
                .setName('numero')
                .setDescription('Número do slot')
                .setRequired(true)
                .setMinValue(1)
            )
        ),

    async execute(message, args) {
        if (String(args[0] || '').toLowerCase() !== 'slot') {
            return message.reply('Use **O.vender slot <quantidade|all> <número do slot>**. Exemplo: **O.vender slot 2 3** ou **O.vender slot all 3**.');
        }

        const result = executeSale(message.author.id, args[1], args[2]);
        if (result.error) return message.reply(result.error);
        if (!result.ok) return message.reply(result.error || 'Não foi possível vender o item.');

        return message.reply(successMessage(result, Number(args[2])));
    },

    async executeSlash(interaction) {
        const quantity = interaction.options.getString('quantidade');
        const slot = interaction.options.getInteger('numero');
        const result = executeSale(interaction.user.id, quantity, slot);

        if (result.error || !result.ok) {
            return interaction.reply({
                content: result.error || 'Não foi possível vender o item.',
                flags: MessageFlags.Ephemeral
            });
        }

        return interaction.reply(successMessage(result, slot));
    }
};
