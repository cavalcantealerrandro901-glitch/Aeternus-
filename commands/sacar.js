const { EmbedBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

module.exports = {
    name: 'sacar',
    aliases: ['saque', 'with', 'withdraw'],
    description: 'Saca eter do banco',
    async execute(message, args) {
        if (!args[0]) {
            return message.reply(
                'Uso: `O.sacar <valor|all|half>`\nEx.: `O.sacar 500` · `O.sacar all`'
            );
        }

        const saved = bank.get(message.author.id);
        if (saved <= 0) {
            return message.reply('Seu cofre esta vazio. Nada para sacar.');
        }

        const bet = resolveBet(args[0], saved, { label: 'Cofre' });
        if (!bet.ok) {
            return message.reply(
                bet.error + '\nUso: `O.sacar <valor|all|half>`'
            );
        }

        const res = bank.withdraw(message.author.id, bet.amount, eter);
        if (!res.ok) {
            return message.reply(res.error || 'Falha no saque.');
        }

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setAuthor({
                name: 'Aeternus Bank · Saque',
                iconURL: message.client.user.displayAvatarURL({ size: 64 })
            })
            .setTitle('Saque autorizado')
            .setDescription(
                '```\n  COFRE  -->  CARTEIRA\n```\nValor liberado: **' +
                    fmt(res.amount) +
                    '** eter'
            )
            .addFields(
                {
                    name: 'Carteira',
                    value: '**' + fmt(res.wallet) + '**',
                    inline: true
                },
                {
                    name: 'Cofre',
                    value: '**' + fmt(res.bank) + '**',
                    inline: true
                }
            )
            .setFooter({ text: 'Comprovante · Aeternus Bank' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
