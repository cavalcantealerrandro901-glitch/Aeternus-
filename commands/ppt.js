const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

const OPS = { pedra: 'papel', papel: 'tesoura', tesoura: 'pedra' };
const EMOJI = { pedra: '✊', papel: '🖐️', tesoura: '✌️' };

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, choice, amountRaw, reply) {
    const c = String(choice || '').toLowerCase();
    if (!OPS[c]) return reply('Uso: `ppt pedra|papel|tesoura <valor>`');
    const bal = eter.get(userId);
    const bet = resolveBet(amountRaw, bal, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    eter.remove(userId, bet.amount, { reason: 'ppt' });
    const bot = Object.keys(OPS)[Math.floor(Math.random() * 3)];
    let result = 'empate';
    if (c === bot) result = 'empate';
    else if (OPS[c] === bot) result = 'perda';
    else result = 'vitoria';
    if (result === 'vitoria') eter.add(userId, bet.amount * 2, { reason: 'ppt win' });
    else if (result === 'empate') eter.add(userId, bet.amount, { reason: 'ppt draw' });
    const title = result === 'vitoria' ? 'Vitória' : result === 'empate' ? 'Empate' : 'Derrota';
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(result === 'vitoria' ? 0x22c55e : result === 'empate' ? 0xf59e0b : 0xef4444)
                .setTitle(title)
                .setDescription(
                    `Você ${EMOJI[c]} · Bot ${EMOJI[bot]}\nSaldo: ✨ **${fmt(eter.get(userId))}**`
                )
        ]
    });
}

module.exports = {
    name: 'ppt',
    aliases: ['jokenpo', 'rps'],
    description: 'Pedra papel tesoura',
    data: new SlashCommandBuilder()
        .setName('jokenpo')
        .setDescription('Pedra papel tesoura')
        .addStringOption((o) =>
            o
                .setName('escolha')
                .setDescription('Sua jogada')
                .setRequired(true)
                .addChoices(
                    { name: 'Pedra', value: 'pedra' },
                    { name: 'Papel', value: 'papel' },
                    { name: 'Tesoura', value: 'tesoura' }
                )
        )
        .addStringOption((o) => o.setName('valor').setDescription('Valor').setRequired(true)),

    async execute(message, args) {
        await run(message.author.id, args[0], args[1], (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(
            i.user.id,
            i.options.getString('escolha', true),
            i.options.getString('valor', true),
            (p) => (typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p))
        );
    }
};
