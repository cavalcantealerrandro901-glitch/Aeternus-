const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

const SYM = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎', '7️⃣'];

function spin(amount, userId) {
    cristais.remove(userId, amount);
    const a = SYM[Math.floor(Math.random() * SYM.length)];
    const b = SYM[Math.floor(Math.random() * SYM.length)];
    const c = SYM[Math.floor(Math.random() * SYM.length)];
    let mult = 0;
    if (a === b && b === c) mult = a === '7️⃣' ? 12 : a === '💎' ? 8 : a === '⭐' ? 6 : 4;
    else if (a === b || b === c || a === c) mult = 1.6;
    const payout = Math.floor(amount * mult);
    if (payout > 0) cristais.add(userId, payout);
    return { a, b, c, mult, payout, win: payout > 0 };
}

function replyPayload(r, amount, user, userId) {
    return {
        embeds: [
            crystalResult({
                title: '🎰  S L O T S',
                win: r.win,
                amount,
                payout: r.payout,
                balance: cristais.get(userId),
                user,
                extra: [
                    '```',
                    `  [ ${r.a}  |  ${r.b}  |  ${r.c} ]`,
                    '```',
                    r.mult ? `Multiplicador **×${r.mult}**` : '_Nada alinhado…_'
                ].join('\n')
            })
        ],
        components: [againRow(`slots:again:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'slots',
    aliases: ['slot', 'caca-niqueis'],
    description: 'Caça-níqueis',
    async execute(message, args) {
        const bet = resolveBet(args[0], cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}\nUso: \`O.slots <valor|all|half>\``);
        const r = spin(bet.amount, message.author.id);
        await message.reply(replyPayload(r, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const amount = parseInt(parts[2], 10);
        const owner = parts[3];
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua jogada.', ephemeral: true });
        const bet = resolveBet(String(amount), cristais.get(owner), { label: '💠' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = spin(bet.amount, owner);
        await interaction.update(replyPayload(r, bet.amount, interaction.user, owner));
    }
};
