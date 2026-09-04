const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, amountRaw, reply) {
    const bal = eter.get(userId);
    const bet = resolveBet(amountRaw, bal, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    if (typeof eter.deposit === 'function') eter.deposit(userId, bet.amount);
    else {
        eter.remove(userId, bet.amount, { reason: 'deposit' });
        eter.addBank?.(userId, bet.amount);
    }
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x22c55e)
                .setTitle('Depósito')
                .setDescription(`✨ **${fmt(bet.amount)}** guardados no cofre.`)
        ]
    });
}

module.exports = {
    name: 'depositar',
    aliases: ['dep', 'deposit'],
    description: 'Depositar éter',
    data: new SlashCommandBuilder()
        .setName('depositar-eter')
        .setDescription('Depositar eter')
        .addStringOption((o) => o.setName('valor').setDescription('Valor, all ou half').setRequired(true)),

    async execute(message, args) {
        await run(message.author.id, args[0], (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.user.id, i.options.getString('valor', true), (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    }
};
