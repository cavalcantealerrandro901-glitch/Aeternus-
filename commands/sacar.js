const { EmbedBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

module.exports = {
    name: 'sacar',
    aliases: ['saque', 'with'],
    description: 'Saca éter do banco',
    async execute(message, args) {
        if (!args[0]) {
            return message.reply('❌ Uso: `O.sacar <valor|all|half>`\nEx.: `O.sacar 500` · `O.sacar all`');
        }

        const saved = bank.get(message.author.id);
        if (saved <= 0) {
            return message.reply('❌ Seu cofre está vazio. Nada para sacar.');
        }

        const bet = resolveBet(args[0], saved, { label: '🏦' });
        if (!bet.ok) {
            return message.reply(`❌ ${bet.error}\nUso: \`O.sacar <valor|all|half>\`);
        }

        bank.remove(message.author.id, bet.amount);
        eter.add(message.author.id, bet.amount, { reason: 'withdraw' });

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x38bdf8)
                    .setAuthor({
                        name: 'Aeternus Bank · Saque',
                        iconURL: message.client.user.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('💸  Saque autorizado')
                    .setDescription(
                        [
                            '```',
                            '  COFRE  ──►  CARTEIRA',
                            '```',
                            `Valor liberado: ✨ **${fmt(bet.amount)}**`
                        ].join('\n')
                    )
                    .addFields(
                        {
                            name: '💵 Carteira',
                            value: `✨ **${fmt(eter.get(message.author.id))}**`,
                            inline: true
                        },
                        {
                            name: '🔒 Cofre',
                            value: `✨ **${fmt(bank.get(message.author.id))}**`,
                            inline: true
                        }
                    )
                    .setFooter({ text: 'Comprovante · Aeternus Bank' })
                    .setTimestamp()
            ]
        });
    }
};
