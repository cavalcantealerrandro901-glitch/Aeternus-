const { EmbedBuilder } = require('discord.js');
const eter = require('../utils/eter');
const bank = require('../utils/bank');
const { resolveBet } = require('../utils/parseAmount');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

module.exports = {
    name: 'depositar',
    aliases: ['dep', 'deposit'],
    description: 'Deposita éter no banco',
    async execute(message, args) {
        const bet = resolveBet(args[0], eter.get(message.author.id), { label: '✨' });
        if (!bet.ok)
            return message.reply(`❌ ${bet.error}\nUso: \`O.depositar <valor|all|half>\`);

        eter.remove(message.author.id, bet.amount);
        bank.add(message.author.id, bet.amount);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x34d399)
                    .setAuthor({
                        name: 'Aeternus Bank · Depósito',
                        iconURL: message.client.user.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('✅  Transferência concluída')
                    .setDescription(
                        [
                            '```',
                            '  CARTEIRA  ──►  COFRE',
                            '```',
                            `Valor creditado: ✨ **${fmt(bet.amount)}**`
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
