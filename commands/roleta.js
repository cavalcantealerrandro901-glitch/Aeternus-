const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');

// 0 = verde, ímpar vermelho, par preto (simplificado 0-14)
module.exports = {
    name: 'roleta',
    aliases: ['roulette'],
    description: 'Roleta: vermelho, preto ou verde',
    async execute(message, args) {
        const amount = flocos.parseBet(args[0], flocos.get(message.author.id));
        const cor = (args[1] || '').toLowerCase();

        if (!amount || !['vermelho', 'preto', 'verde', 'red', 'black', 'green'].includes(cor)) {
            return message.reply(
                'Uso: `O.roleta <valor> <vermelho|preto|verde>`\n' +
                    'Vermelho/preto pagam 2x · Verde (0) paga 14x'
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

        const n = Math.floor(Math.random() * 15); // 0..14
        const landed = n === 0 ? 'verde' : n % 2 === 1 ? 'vermelho' : 'preto';

        let win = false;
        let payout = 0;
        if (pick === landed) {
            win = true;
            payout = pick === 'verde' ? amount * 14 : amount * 2;
            flocos.add(message.author.id, payout);
        }

        const embed = new EmbedBuilder()
            .setColor(win ? 0x22c55e : 0xef4444)
            .setTitle('🎰 Roleta')
            .setDescription(
                `Saiu **${n}** (${landed}).\nSua aposta: **${pick}**\n` +
                    (win
                        ? `Ganhou ${flocos.format(payout)}!`
                        : `Perdeu ${flocos.format(amount)}.`) +
                    `\n\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
            );

        await message.reply({ embeds: [embed] });
    }
};
