const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, amountRaw, reply) {
    if (!amountRaw) return reply('❌ Informe o valor (`1k`, `all`, `half`).');
    const wallet = eter.get(userId);
    if (wallet <= 0) return reply('❌ Carteira vazia.');
    const bet = resolveBet(amountRaw, wallet, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    const res = bank.deposit(userId, bet.amount, eter);
    if (!res.ok) return reply(`❌ ${res.error}`);
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x34d399)
                .setTitle('Depósito')
                .setDescription(`✨ **${fmt(res.amount)}** guardados`)
                .addFields(
                    { name: 'Carteira', value: `✨ **${fmt(res.wallet)}**`, inline: true },
                    { name: 'Cofre', value: `✨ **${fmt(res.bank)}**`, inline: true }
                )
        ]
    });
}

module.exports = {
    name: 'depositar',
    aliases: ['dep', 'deposit', 'guardar'],
    description: 'Depositar éter no banco',
    data: new SlashCommandBuilder()
        .setName('depositar')
        .setDescription('Depositar éter no banco')
        .addStringOption((o) =>
            o.setName('valor').setDescription('Valor, all ou half').setRequired(true)
        ),
    async execute(message, args) {
        await run(message.author.id, args[0], (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.user.id, i.options.getString('valor'), (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    }
};
