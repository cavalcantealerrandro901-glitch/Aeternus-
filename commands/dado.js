const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');

module.exports = {
    name: 'dado',
    aliases: ['dice'],
    description: 'Joga um dado contra o bot (aposta em flocos)',
    async execute(message, args) {
        const amount = flocos.parseBet(args[0], flocos.get(message.author.id));
        if (!amount) {
            return message.reply('Uso: `O.dado <valor>` — quem tirar o número maior ganha (empate devolve).');
        }

        const check = flocos.canBet(message.author.id, amount);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -amount);
        const you = 1 + Math.floor(Math.random() * 6);
        const bot = 1 + Math.floor(Math.random() * 6);

        let text;
        let color = 0x38bdf8;
        if (you > bot) {
            flocos.add(message.author.id, amount * 2);
            text = `Você tirou **${you}**, o bot **${bot}**. Você ganhou ${flocos.format(amount * 2)}!`;
            color = 0x22c55e;
        } else if (you < bot) {
            text = `Você tirou **${you}**, o bot **${bot}**. Perdeu ${flocos.format(amount)}.`;
            color = 0xef4444;
        } else {
            flocos.add(message.author.id, amount);
            text = `Empate (**${you}**). Aposta devolvida.`;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎲 Dado')
            .setDescription(`${text}\n\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`);

        await message.reply({ embeds: [embed] });
    }
};
