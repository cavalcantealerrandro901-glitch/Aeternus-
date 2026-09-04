const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(fromId, toUser, amountRaw, reply) {
    if (!toUser) return reply('❌ Mencione o usuário.');
    if (toUser.bot) return reply('❌ Não pode pagar bots.');
    if (toUser.id === fromId) return reply('❌ Não pode pagar a si mesmo.');
    if (!amountRaw) return reply('❌ Informe o valor.');
    const wallet = eter.get(fromId);
    const bet = resolveBet(amountRaw, wallet, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    const res = eter.transfer(fromId, toUser.id, bet.amount);
    if (res?.ok === false || res === false) return reply(`❌ ${res?.error || 'Saldo insuficiente.'}`);
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xa78bfa)
                .setTitle('Transferência')
                .setDescription(`Você enviou ✨ **${fmt(bet.amount)}** para **${toUser.username}**`)
        ]
    });
}

module.exports = {
    name: 'pay',
    aliases: ['pagar', 'enviar', 'pix'],
    description: 'Transferir éter',
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Transferir éter')
        .addUserOption((o) => o.setName('usuario').setDescription('Destino').setRequired(true))
        .addStringOption((o) => o.setName('valor').setDescription('Valor').setRequired(true)),
    async execute(message, args) {
        const user = message.mentions.users.first();
        const amountRaw = args.find((a) => !a.startsWith('<@')) || args[1];
        await run(message.author.id, user, amountRaw, (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(i.user.id, i.options.getUser('usuario'), i.options.getString('valor'), (p) =>
            typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p)
        );
    }
};
