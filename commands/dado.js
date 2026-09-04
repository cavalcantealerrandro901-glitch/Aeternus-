const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

async function run(userId, num, amountRaw, reply) {
    const choice = parseInt(num, 10);
    if (!(choice >= 1 && choice <= 6)) return reply('Uso: `dado <1-6> <valor>`');
    const bal = eter.get(userId);
    const bet = resolveBet(amountRaw, bal, { label: '✨' });
    if (!bet.ok) return reply(`❌ ${bet.error}`);
    eter.remove(userId, bet.amount, { reason: 'dado' });
    const roll = 1 + Math.floor(Math.random() * 6);
    const win = roll === choice;
    if (win) eter.add(userId, bet.amount * 6, { reason: 'dado win' });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(win ? 0x22c55e : 0xef4444)
                .setTitle(win ? 'Acertou' : 'Errou')
                .setDescription(
                    `🎲 Saiu **${roll}** (você: **${choice}**)\n${win ? `✨ **+${fmt(bet.amount * 5)}**` : `✨ **-${fmt(bet.amount)}**`}\nSaldo: ✨ **${fmt(eter.get(userId))}**`
                )
        ]
    });
}

module.exports = {
    name: 'dado',
    aliases: ['dice'],
    description: 'Apostar no dado',
    data: new SlashCommandBuilder()
        .setName('apostar-dado')
        .setDescription('Apostar no dado')
        .addIntegerOption((o) =>
            o.setName('numero').setDescription('1 a 6').setRequired(true).setMinValue(1).setMaxValue(6)
        )
        .addStringOption((o) => o.setName('valor').setDescription('Valor').setRequired(true)),

    async execute(message, args) {
        await run(message.author.id, args[0], args[1], (p) => message.reply(p));
    },
    async executeSlash(i) {
        await run(
            i.user.id,
            i.options.getInteger('numero', true),
            i.options.getString('valor', true),
            (p) => (typeof p === 'string' ? i.reply({ content: p, ephemeral: true }) : i.reply(p))
        );
    }
};
