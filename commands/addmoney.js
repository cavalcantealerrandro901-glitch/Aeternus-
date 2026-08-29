const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'addmoney',
    aliases: ['addbal', 'dar', 'givemoney'],
    description: 'Adiciona moeda (admin)',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
            return message.reply({ embeds: [err('Apenas administradores.')] });

        const users = [...message.mentions.users.values()];
        const amount = parseAmount(args.find((a) => parseAmount(a) > 0));
        const coin = (args.find((a) => /^(flocos?|cristais?)$/i.test(a)) || 'flocos').toLowerCase();

        if (!users.length || !amount)
            return message.reply({ embeds: [err('Uso: `O.addmoney @user1 @user2 10k [flocos|cristais]`')] });

        const lines = [];
        for (const u of users) {
            if (coin.startsWith('cristal')) {
                cristais.add(u.id, amount);
                lines.push(`• ${u}: ${cristais.format(cristais.get(u.id))}`);
            } else {
                flocos.add(u.id, amount);
                lines.push(`• ${u}: ${flocos.format(flocos.get(u.id))}`);
            }
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x34d399)
                    .setTitle('💰 Valores creditados')
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `Por ${message.author.tag}` })
                    .setTimestamp()
            ]
        });
    }
};

function err(t) {
    return new EmbedBuilder().setColor(0xef4444).setDescription(`❌ ${t}`);
}
