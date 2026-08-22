const { EmbedBuilder } = require('discord.js');
const cristais = require('../utils/cristais');
const { againRow } = require('../utils/gameAgain');

module.exports = {
    name: 'dado',
    aliases: ['dice'],
    description: 'Dado vs bot com 💠 cristais',
    async execute(message, args) {
        const amount = cristais.parseBet(args[0], cristais.get(message.author.id));
        if (!amount) {
            return message.reply('Uso: `O.dado <valor>` — 💠 cristais. Ex: `O.dado 2,5k`');
        }

        const check = cristais.canBet(message.author.id, amount);
        if (!check.ok) return message.reply(check.error);

        cristais.add(message.author.id, -amount);
        const you = 1 + Math.floor(Math.random() * 6);
        const bot = 1 + Math.floor(Math.random() * 6);

        let text;
        let color = 0x38bdf8;
        if (you > bot) {
            cristais.add(message.author.id, amount * 2);
            text = `Você **${you}** × bot **${bot}**. Ganhou ${cristais.format(amount * 2)}!`;
            color = 0x22c55e;
        } else if (you < bot) {
            text = `Você **${you}** × bot **${bot}**. Perdeu ${cristais.format(amount)}.`;
            color = 0xef4444;
        } else {
            cristais.add(message.author.id, amount);
            text = `Empate (**${you}**). Aposta devolvida em 💠 cristais.`;
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(color)
                    .setTitle('🎲 Dado')
                    .setDescription(`${text}\n\nSaldo: ${cristais.formatPlain(cristais.get(message.author.id))}`)
            ],
            components: [againRow('dado', message.author.id, [String(args[0])])]
        });
    }
};
