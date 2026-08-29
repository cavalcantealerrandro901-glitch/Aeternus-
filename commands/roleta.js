const { EmbedBuilder } = require('discord.js');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

module.exports = {
    name: 'roleta',
    aliases: ['roulette'],
    async execute(message, args) {
        let choice = (args[0] || '').toLowerCase().replace('red', 'vermelho').replace('black', 'preto').replace('green', 'verde');
        const amount = parseAmount(args[1]);
        if (!['vermelho', 'preto', 'verde'].includes(choice) || !amount)
            return message.reply('Uso: `O.roleta <vermelho|preto|verde> <valor>`');
        if (cristais.get(message.author.id) < amount) return message.reply('💠 Insuficiente.');
        cristais.remove(message.author.id, amount);
        const n = Math.floor(Math.random() * 37);
        const color = n === 0 ? 'verde' : RED.has(n) ? 'vermelho' : 'preto';
        const win = choice === color;
        const mult = color === 'verde' ? 14 : 2;
        if (win) cristais.add(message.author.id, amount * mult);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(win ? 0x34d399 : 0xef4444)
                    .setTitle('🎰 Roleta')
                    .setDescription(`Número **${n}** (${color})\nSua cor: **${choice}**\n${win ? `+${cristais.formatPlain(amount * mult)}` : `-${cristais.formatPlain(amount)}`}`)
            ]
        });
    }
};
