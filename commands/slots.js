const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const { crystalResult, againRow } = require('../utils/gameStyle');

const SYM = ['🍒', '🍋', '🍇', '💎', '7️⃣', '❄️'];

function spin(amount, userId) {
    flocos.remove(userId, amount, { reason: 'slots' });
    const a = SYM[Math.floor(Math.random() * SYM.length)];
    const b = SYM[Math.floor(Math.random() * SYM.length)];
    const c = SYM[Math.floor(Math.random() * SYM.length)];
    let mult = 0;
    if (a === b && b === c) mult = a === '7️⃣' ? 12 : a === '💎' ? 8 : a === '❄️' ? 6 : 4;
    else if (a === b || b === c || a === c) mult = 1.5;
    const payout = Math.floor(amount * mult);
    if (payout > 0) flocos.add(userId, payout, { reason: 'slots win' });
    return { a, b, c, mult, payout, win: payout > 0 };
}

function payload(r, amount, user, userId) {
    return {
        embeds: [
            crystalResult({
                title: r.win ? '🎰  Slots · Vitória' : '🎰  Slots · Derrota',
                win: r.win,
                amount,
                payout: r.payout,
                balance: flocos.get(userId),
                user,
                extra: `**${r.a} | ${r.b} | ${r.c}**${r.mult ? ` · ×${r.mult}` : ''}`
            })
        ],
        components: [againRow(`slots:again:${amount}:${userId}`)]
    };
}

module.exports = {
    name: 'slots',
    aliases: ['slot', 'caça', 'caca'],
    description: 'Caça-níqueis (flocos)',
    async execute(message, args) {
        const bet = resolveBet(args[0], flocos.get(message.author.id), { label: '❄️' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}\nUso: \`O.slots <valor|all|half>\``);
        const r = spin(bet.amount, message.author.id);
        await message.reply(payload(r, bet.amount, message.author, message.author.id));
    },
    async handleComponent(interaction) {
        const [, , amountStr, owner] = interaction.customId.split(':');
        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'Não é sua partida.', ephemeral: true });
        const bet = resolveBet(amountStr, flocos.get(owner), { label: '❄️' });
        if (!bet.ok) return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
        const r = spin(bet.amount, owner);
        await interaction.update(payload(r, bet.amount, interaction.user, owner));
    }
};
