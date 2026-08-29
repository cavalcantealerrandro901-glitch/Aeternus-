const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const bank = require('../utils/bank');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'sacar',
    aliases: ['with', 'withdraw'],
    description: 'Saca do banco',
    async execute(message, args) {
        let amount =
            args[0]?.toLowerCase() === 'all' || args[0] === 'tudo'
                ? bank.get(message.author.id)
                : parseAmount(args[0]);
        if (!amount || amount <= 0) return message.reply('Uso: `O.sacar <valor|all>`');
        if (bank.get(message.author.id) < amount)
            return message.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription('❌ Banco insuficiente.')] });

        bank.remove(message.author.id, amount);
        flocos.add(message.author.id, amount);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x38bdf8)
                    .setTitle('🏦 Saque')
                    .addFields(
                        { name: 'Valor', value: flocos.formatPlain(amount), inline: true },
                        { name: 'Carteira', value: flocos.formatPlain(flocos.get(message.author.id)), inline: true },
                        { name: 'Banco', value: flocos.formatPlain(bank.get(message.author.id)), inline: true }
                    )
            ]
        });
    }
};
