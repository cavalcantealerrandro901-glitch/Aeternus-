const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'cambio',
    aliases: ['exchange', 'trocar'],
    async execute(message, args) {
        const dir = (args[0] || '').toLowerCase();
        const amount = parseAmount(args[1]);
        if (!['vender', 'comprar', 'sell', 'buy'].includes(dir) || !amount)
            return message.reply('Uso: `O.cambio <vender|comprar> <qtd>` · Vender 1💠=50❄️ · Comprar 1💠=80❄️');

        if (dir === 'vender' || dir === 'sell') {
            if (cristais.get(message.author.id) < amount) return message.reply('💠 Insuficiente.');
            cristais.remove(message.author.id, amount);
            flocos.add(message.author.id, amount * 50);
            return message.reply({ embeds: [new EmbedBuilder().setColor(0x34d399).setDescription(`Vendeu **${amount}** 💠 por ${flocos.format(amount * 50)}`)] });
        }
        const cost = amount * 80;
        if (flocos.get(message.author.id) < cost) return message.reply('❄️ Insuficiente.');
        flocos.remove(message.author.id, cost);
        cristais.add(message.author.id, amount);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0x22d3ee).setDescription(`Comprou **${amount}** 💠 por ${flocos.format(cost)}`)] });
    }
};
