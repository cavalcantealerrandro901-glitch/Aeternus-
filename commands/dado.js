const { EmbedBuilder } = require('discord.js');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'dado',
    aliases: ['dice'],
    async execute(message, args) {
        const guess = parseInt(args[0], 10);
        const amount = parseAmount(args[1]);
        if (!(guess >= 1 && guess <= 6) || !amount)
            return message.reply('Uso: `O.dado <1-6> <valor>`');
        if (cristais.get(message.author.id) < amount) return message.reply('💠 Insuficiente.');
        cristais.remove(message.author.id, amount);
        const roll = 1 + Math.floor(Math.random() * 6);
        const win = roll === guess;
        if (win) cristais.add(message.author.id, amount * 6);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(win ? 0x34d399 : 0xef4444)
                    .setTitle('🎲 Dado')
                    .setDescription(`Aposta **${guess}** · Saiu **${roll}**\n${win ? `+${cristais.formatPlain(amount * 6)}` : `-${cristais.formatPlain(amount)}`} cristais`)
            ]
        });
    }
};
