const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

const OK_PHRASES = [
    'Saque liberado. Use com sabedoria.',
    'O cofre abriu — o éter voltou às suas mãos.',
    'Retirada concluída. Boa sorte nas próximas jogadas.',
    'Transação aprovada. O restante permanece protegido.'
];

function phrase(userId) {
    const n = Number(String(userId).slice(-3)) || 0;
    return OK_PHRASES[n % OK_PHRASES.length];
}

async function run(user, amountRaw, reply) {
    const userId = user.id;
    const bankBal = bank.get(userId);
    const bet = resolveBet(amountRaw, bankBal, { label: '✨' });
    if (!bet.ok) {
        return reply({ content: `❌ ${bet.error}`, flags: 64 });
    }

    const result = bank.withdraw(userId, bet.amount, eter);
    if (!result.ok) {
        return reply({ content: `❌ ${result.error}`, flags: 64 });
    }

    const emb = new EmbedBuilder()
        .setColor(0x38bdf8)
        .setAuthor({
            name: '🔮 AETERNUS BANCO',
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('📤 Saque Realizado')
        .setDescription(
            [
                phrase(userId),
                '',
                `💰 **Valor retirado:** − ${fmt(result.amount)} Éter`,
                `👛 **Em Mãos agora:** ${fmt(result.wallet)} Éter`,
                `🏦 **No Cofre agora:** ${fmt(result.bank)} Éter`,
                `💎 **Fortuna total:** ${fmt(result.wallet + result.bank)} Éter`
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'Aeternus · saque confirmado' })
        .setTimestamp();

    return reply({ embeds: [emb] });
}

module.exports = {
    name: 'sacar',
    aliases: ['with', 'withdraw'],
    description: 'Sacar éter do cofre',
    data: new SlashCommandBuilder()
        .setName('sacar-eter')
        .setDescription('Sacar éter do banco')
        .addStringOption((o) =>
            o
                .setName('valor')
                .setDescription('Valor, all ou half')
                .setRequired(true)
        ),

    async execute(message, args) {
        await run(message.author, args[0], (p) => message.reply(p));
    },

    async executeSlash(i) {
        await run(i.user, i.options.getString('valor', true), (p) => {
            if (typeof p === 'string') return i.reply({ content: p, flags: 64 });
            if (p.content && !p.embeds) return i.reply({ ...p, flags: p.flags ?? 64 });
            return i.reply(p);
        });
    }
};
