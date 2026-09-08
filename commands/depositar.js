const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

const OK_PHRASES = [
    'Seu éter entrou no cofre com segurança.',
    'Depósito confirmado. O patrimônio cresce em silêncio.',
    'Guardado com cuidado — longe de riscos desnecessários.',
    'Transação concluída. O banco agradece a confiança.'
];

function phrase(userId) {
    const n = Number(String(userId).slice(-3)) || 0;
    return OK_PHRASES[n % OK_PHRASES.length];
}

async function run(user, amountRaw, reply) {
    const userId = user.id;
    const wallet = eter.get(userId);
    const bet = resolveBet(amountRaw, wallet, { label: '✨' });
    if (!bet.ok) {
        return reply({ content: `❌ ${bet.error}`, flags: 64 });
    }

    const result = bank.deposit(userId, bet.amount, eter);
    if (!result.ok) {
        return reply({ content: `❌ ${result.error}`, flags: 64 });
    }

    const emb = new EmbedBuilder()
        .setColor(0x22c55e)
        .setAuthor({
            name: '🔮 AETERNUS BANCO',
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('📥 Depósito Realizado')
        .setDescription(
            [
                phrase(userId),
                '',
                `💰 **Valor guardado:** + ${fmt(result.amount)} Éter`,
                `👛 **Em Mãos agora:** ${fmt(result.wallet)} Éter`,
                `🏦 **No Cofre agora:** ${fmt(result.bank)} Éter`,
                `💎 **Fortuna total:** ${fmt(result.wallet + result.bank)} Éter`
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'Aeternus · depósito seguro' })
        .setTimestamp();

    return reply({ embeds: [emb] });
}

module.exports = {
    name: 'depositar',
    aliases: ['dep', 'deposit'],
    description: 'Depositar éter no cofre',
    data: new SlashCommandBuilder()
        .setName('depositar-eter')
        .setDescription('Depositar éter no banco')
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
