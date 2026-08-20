const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');
const { againRow } = require('../utils/gameAgain');

module.exports = {
    name: 'roleta',
    aliases: ['roulette'],
    description: 'Roleta com ❄️ flocos',
    async execute(message, args) {
        const amount = flocos.parseBet(args[0], flocos.get(message.author.id));
        const cor = (args[1] || '').toLowerCase();

        if (!amount || !['vermelho', 'preto', 'verde', 'red', 'black', 'green'].includes(cor)) {
            return message.reply(
                'Uso: `O.roleta <valor> <vermelho|preto|verde>`\n❄️ flocos · vermelho/preto 2x · verde 14x'
            );
        }

        const pick =
            cor === 'red' || cor === 'vermelho'
                ? 'vermelho'
                : cor === 'black' || cor === 'preto'
                  ? 'preto'
                  : 'verde';

        const check = flocos.canBet(message.author.id, amount);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -amount);
        const n = Math.floor(Math.random() * 15);
        const landed = n === 0 ? 'verde' : n % 2 === 1 ? 'vermelho' : 'preto';

        let win = false;
        let payout = 0;
        if (pick === landed) {
            win = true;
            payout = pick === 'verde' ? amount * 14 : amount * 2;
            flocos.add(message.author.id, payout);
            xp.add(message.author.id, 10);
            cristais.add(message.author.id, 1);
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(win ? 0x22c55e : 0xef4444)
                    .setTitle('🎰 Roleta')
                    .setDescription(
                        `Saiu **${n}** (${landed}) · você: **${pick}**\n` +
                            (win
                                ? `Ganhou ${flocos.format(payout)}!`
                                : `Perdeu ${flocos.format(amount)}.`) +
                            `\n\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                    )
            ],
            components: [againRow('roleta', message.author.id, [String(args[0]), pick])]
        });
    }
};
