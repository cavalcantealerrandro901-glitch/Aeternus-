const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');

module.exports = {
    name: 'cara',
    aliases: ['coroa', 'moeda', 'cpf'],
    description: 'Aposta cara ou coroa com flocos',
    async execute(message, args) {
        const amount = flocos.parseBet(args[0], flocos.get(message.author.id));
        const side = (args[1] || '').toLowerCase();

        if (!amount || !['cara', 'coroa'].includes(side)) {
            return message.reply(
                'Uso: `O.cara <valor> <cara|coroa>`\nEx.: `O.cara 100 cara` · `O.cara 1k coroa`'
            );
        }

        const check = flocos.canBet(message.author.id, amount);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -amount);
        const result = Math.random() < 0.5 ? 'cara' : 'coroa';
        const win = result === side;
        let payout = 0;
        if (win) {
            payout = amount * 2;
            flocos.add(message.author.id, payout);
        }

        const embed = new EmbedBuilder()
            .setColor(win ? 0x22c55e : 0xef4444)
            .setTitle(win ? '🎉 Você ganhou!' : '💨 Você perdeu')
            .setDescription(
                `A moeda caiu em **${result}**.\n` +
                    `Sua escolha: **${side}**\n` +
                    (win
                        ? `Você recebeu ${flocos.format(payout)}.`
                        : `Perdeu ${flocos.format(amount)}.`) +
                    `\n\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
            );

        await message.reply({ embeds: [embed] });
    }
};
