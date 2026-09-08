const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

const TIPS = [
    'Seu cofre protege o éter de roubos e apostas impulsivas.',
    'Deposite o que não for usar — a segurança vale ouro.',
    'Grandes fortunas nascem de depósitos consistentes.',
    'O banco não dorme: seu éter fica seguro enquanto você joga.',
    'Retire só o necessário. O resto permanece protegido.'
];

function tipFor(userId) {
    const n = Number(String(userId).slice(-4)) || 0;
    return TIPS[n % TIPS.length];
}

function statusLine(bankBal) {
    if (bankBal <= 0) return '🗭 Cofre vazio — nada depositado ainda.';
    if (bankBal < 10_000) return '🌱 Cofre em crescimento.';
    if (bankBal < 100_000) return '💼 Reserva sólida.';
    if (bankBal < 1_000_000) return '🏛️ Patrimônio respeitável.';
    return '👑 Cofre de elite.';
}

function buildEmbed(user) {
    const wallet = eter.get(user.id);
    const bankBal = bank.get(user.id);
    const total = wallet + bankBal;
    const pct = total > 0 ? Math.round((bankBal / total) * 100) : 0;

    return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setAuthor({
            name: `AETERNUS BANCO • @${user.username}`,
            iconURL: user.displayAvatarURL({ size: 64 })
        })
        .setTitle('🏦 Extrato do Cofre')
        .setDescription(
            [
                statusLine(bankBal),
                '',
                `👛 **Em Mãos:** ${fmt(wallet)} Éter`,
                `🏦 **No Cofre:** ${fmt(bankBal)} Éter`,
                `💎 **Fortuna Total:** ${fmt(total)} Éter`,
                '',
                `📊 **Protegido:** ${pct}% da fortuna está no banco`,
                '',
                `_${tipFor(user.id)}_`
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
            {
                name: '📥 Depositar',
                value: '`O.dep <valor>` · `/depositar-eter`',
                inline: true
            },
            {
                name: '📤 Sacar',
                value: '`O.sacar <valor>` · `/sacar-eter`',
                inline: true
            }
        )
        .setFooter({ text: 'Aeternus · banco seguro' })
        .setTimestamp();
}

module.exports = {
    name: 'banco',
    aliases: ['bank', 'cofre'],
    description: 'Ver extrato do banco',
    data: new SlashCommandBuilder()
        .setName('ver-banco')
        .setDescription('Ver extrato do banco de éter')
        .addUserOption((o) =>
            o.setName('usuario').setDescription('Usuário').setRequired(false)
        ),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await message.reply({ embeds: [buildEmbed(user)] });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        await i.reply({ embeds: [buildEmbed(user)] });
    }
};
