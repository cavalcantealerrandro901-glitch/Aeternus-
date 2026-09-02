const { EmbedBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

module.exports = {
    name: 'depositar',
    aliases: ['dep'],
    description: 'Deposita éter no banco',
    async execute(message, args) {
        if (!args[0]) {
            return message.reply('❌ Uso: `O.dep <valor|all|half>`\nEx.: `O.dep 1k` · `O.dep all`');
        }

        const wallet = eter.get(message.author.id);
        if (wallet <= 0) {
            return message.reply('❌ Sua carteira está vazia. Nada para depositar.');
        }

        const bet = resolveBet(args[0], wallet, { label: '✨' });
        if (!bet.ok) {
            return message.reply(`❌ ${bet.error}\nUso: \`O.dep <valor|all|half>\`);
        }

        eter.remove(message.author.id, bet.amount, { reason: 'deposit' });
        bank.add(message.author.id, bet.amount);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x34d399)
                    .setAuthor({
                        name: 'Aeternus Bank · Depósito',
                        iconURL: message.client.user.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('✅  Depósito concluído')
                    .setDescription(
                        [
                            '```',
                            '  CARTEIRA  ──►  COFRE',
                            '```',
                            `Valor guardado: ✨ **${fmt(bet.amount)}**`
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
                    .setFooter({ text: 'Valores no cofre ficam protegidos de roubos' })
                    .setTimestamp()
            ]
        });
    }
};
