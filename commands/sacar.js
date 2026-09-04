const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, amountRaw, reply) {
    if (!amountRaw) return reply('❌ Informe o valor (`1k`, `all`, `half`).');
    const bal = bank.get(userId);
    if (bal <= 0) return reply('❌ Cofre vazio.');
    const bet = resolveBet(amountRaw, bal, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    const res = bank.withdraw(userId, bet.amount, eter);
    if (!res.ok) return reply(`❌ ${res.error}`);
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xfbbf24)
                .setTitle('Saque')
                .setDescription(`✨ **${fmt(res.amount)}** sacados`)
                .addFields(
                    { name: 'Carteira', value: `✨ **${fmt(res.wallet)}**`, inline: true },
                    { name: 'Cofre', value: `✨ **${fmt(res.bank)}**`, inline: true }
                )
        ]
    });
}

module.exports = {
    name: 'sacar',
    aliases: ['with', 'withdraw'],
    description: 'Sacar éter do banco',
    data: new SlashCommandBuilder()
        .setName('sacar')
        .setDescription('Sacar éter do banco')
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
