const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');
const { againRow } = require('../utils/gameAgain');

module.exports = {
    name: 'dado',
    aliases: ['dice'],
    description: 'Dado vs bot com ❄️ flocos',
    async execute(message, args) {
        const amount = flocos.parseBet(args[0], flocos.get(message.author.id));
        if (!amount) {
            return message.reply('Uso: `O.dado <valor>` — ❄️ flocos. Ex: `O.dado 2,5k`');
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
            xp.add(message.author.id, 8);
            cristais.add(message.author.id, 1);
            text = `Você **${you}** × bot **${bot}**. Ganhou ${flocos.format(amount * 2)}!`;
            color = 0x22c55e;
        } else if (you < bot) {
            text = `Você **${you}** × bot **${bot}**. Perdeu ${flocos.format(amount)}.`;
            color = 0xef4444;
        } else {
            flocos.add(message.author.id, amount);
            text = `Empate (**${you}**). Aposta devolvida em ❄️ flocos.`;
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(color)
                    .setTitle('🎲 Dado')
                    .setDescription(`${text}\n\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`)
            ],
            components: [againRow('dado', message.author.id, [String(args[0])])]
        });
    }
};
