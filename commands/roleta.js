const { EmbedBuilder } = require('discord.js');
const cristais = require('../utils/cristais');
const { againRow } = require('../utils/gameAgain');

module.exports = {
    name: 'roleta',
    aliases: ['roulette'],
    description: 'Roleta com 💠 cristais',
    async execute(message, args) {
        const amount = cristais.parseBet(args[0], cristais.get(message.author.id));
        const cor = (args[1] || '').toLowerCase();

        if (!amount || !['vermelho', 'preto', 'verde', 'red', 'black', 'green'].includes(cor)) {
            return message.reply(
                'Uso: `O.roleta <valor> <vermelho|preto|verde>`\n💠 cristais · vermelho/preto 2x · verde 14x'
            );
        }

        const pick =
            cor === 'red' || cor === 'vermelho'
                ? 'vermelho'
                : cor === 'black' || cor === 'preto'
                  ? 'preto'
                  : 'verde';

        const check = cristais.canBet(message.author.id, amount);
        if (!check.ok) return message.reply(check.error);

        cristais.add(message.author.id, -amount);
        const n = Math.floor(Math.random() * 15);
        const landed = n === 0 ? 'verde' : n % 2 === 1 ? 'vermelho' : 'preto';

        let win = false;
        let payout = 0;
        if (pick === landed) {
            win = true;
            payout = pick === 'verde' ? amount * 14 : amount * 2;
            cristais.add(message.author.id, payout);
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(win ? 0x22c55e : 0xef4444)
                    .setTitle('🎰 Roleta')
                    .setDescription(
                        `Saiu **${n}** (${landed}) · você: **${pick}**\n` +
                            (win
                                ? `Ganhou ${cristais.format(payout)}!`
                                : `Perdeu ${cristais.format(amount)}.`) +
                            `\n\nSaldo: ${cristais.formatPlain(cristais.get(message.author.id))}`
                    )
            ],
            components: [againRow('roleta', message.author.id, [String(args[0]), pick])]
        });
    }
};
