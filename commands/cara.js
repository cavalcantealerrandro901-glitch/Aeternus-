const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');
const { againRow } = require('../utils/gameAgain');

module.exports = {
    name: 'cara',
    aliases: ['coroa', 'moeda'],
    description: 'Cara ou coroa com ❄️ flocos',
    async execute(message, args) {
        const amount = flocos.parseBet(args[0], flocos.get(message.author.id));
        const side = (args[1] || '').toLowerCase();

        if (!amount || !['cara', 'coroa'].includes(side)) {
            return message.reply(
                'Uso: `O.cara <valor> <cara|coroa>`\nEx.: `O.cara 1,5k cara` · `O.cara half coroa`\nMoeda: ❄️ flocos'
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
            xp.add(message.author.id, 8);
            cristais.add(message.author.id, 1);
        }

        const embed = new EmbedBuilder()
            .setColor(win ? 0x22c55e : 0xef4444)
            .setTitle(win ? '🎉 Você ganhou!' : '💨 Você perdeu')
            .setDescription(
                `A moeda caiu em **${result}**.\nSua escolha: **${side}**\n` +
                    (win
                        ? `Recebeu ${flocos.format(payout)}.`
                        : `Perdeu ${flocos.format(amount)}.`) +
                    `\n\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
            );

        await message.reply({
            embeds: [embed],
            components: [againRow('cara', message.author.id, [String(args[0]), side])]
        });
    }
};
