const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'investir',
    aliases: ['invest'],
    async execute(message, args) {
        const amount = parseAmount(args[0]);
        if (!amount || amount < 1000) return message.reply('Uso: `O.investir <valor>` (mín. 1000)');
        const inv = store.load('invest.json', {});
        if (inv[message.author.id]) return message.reply('Já existe investimento. Use `O.resgatar`.');
        if (flocos.get(message.author.id) < amount) return message.reply('❄️ Insuficiente.');
        flocos.remove(message.author.id, amount);
        inv[message.author.id] = { amount, at: Date.now() };
        store.save('invest.json', inv);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0xa78bfa).setTitle('📈 Investimento').setDescription(`Aplicado **${flocos.formatPlain(amount)}**. Resgate em 1h com \`O.resgatar\`.`)] });
    }
};
