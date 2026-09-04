const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, amountRaw, reply) {
    const bank = eter.getBank?.(userId) ?? 0;
    const bet = resolveBet(amountRaw, bank, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    if (typeof eter.withdraw === 'function') eter.withdraw(userId, bet.amount);
    else {
        eter.removeBank?.(userId, bet.amount);
        eter.add(userId, bet.amount, { reason: 'withdraw' });
    }
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x38bdf8)
                .setTitle('Saque')
                .setDescription(`✨ **${fmt(bet.amount)}** retirados do cofre.`)
        ]
    });
}

module.exports = {
    name: 'sacar',
    aliases: ['with', 'withdraw'],
    description: 'Sacar éter',
    data: new SlashCommandBuilder()
        .setName('sacar-eter')
        .setDescription('Sacar eter')
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
