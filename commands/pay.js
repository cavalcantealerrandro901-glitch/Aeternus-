const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'pay',
    aliases: ['pagar', 'transferir', 'pix'],
    description: 'Transfere flocos',
    async execute(message, args) {
        const user = message.mentions.users.first();
        const amount = parseAmount(args.find((a) => parseAmount(a) > 0));
        if (!user || !amount)
            return message.reply({ embeds: [e(0xef4444, 'Uso: `O.pay @user <valor>`')] });
        if (user.bot || user.id === message.author.id)
            return message.reply({ embeds: [e(0xef4444, 'Destino inválido.')] });
        if (flocos.get(message.author.id) < amount)
            return message.reply({ embeds: [e(0xef4444, '❄️ Saldo insuficiente.')] });

        flocos.remove(message.author.id, amount);
        flocos.add(user.id, amount);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x34d399)
                    .setTitle('💸 Transferência concluída')
                    .setDescription(`${message.author} → ${user}\n**${flocos.formatPlain(amount)}** flocos`)
                    .setTimestamp()
            ]
        });
    }
};
function e(c, d) { return new EmbedBuilder().setColor(c).setDescription(d); }
