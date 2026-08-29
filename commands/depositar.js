const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const bank = require('../utils/bank');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'depositar',
    aliases: ['dep', 'deposit'],
    description: 'Deposita no banco',
    async execute(message, args) {
        let amount =
            args[0]?.toLowerCase() === 'all' || args[0] === 'tudo'
                ? flocos.get(message.author.id)
                : parseAmount(args[0]);
        if (!amount || amount <= 0)
            return message.reply('Uso: `O.depositar <valor|all>`');
        if (flocos.get(message.author.id) < amount)
            return message.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription('❌ Flocos insuficientes.')] });

        flocos.remove(message.author.id, amount);
        bank.add(message.author.id, amount);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x34d399)
                    .setTitle('🏦 Depósito')
                    .addFields(
                        { name: 'Valor', value: flocos.formatPlain(amount), inline: true },
                        { name: 'Carteira', value: flocos.formatPlain(flocos.get(message.author.id)), inline: true },
                        { name: 'Banco', value: flocos.formatPlain(bank.get(message.author.id)), inline: true }
                    )
                    .setTimestamp()
            ]
        });
    }
};
