const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'removemoney',
    aliases: ['take', 'remover'],
    description: 'Remove moeda (admin)',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
            return message.reply({ embeds: [new EmbedBuilder().setColor(0xef4444).setDescription('❌ Apenas administradores.')] });

        const user = message.mentions.users.first();
        const amount = parseAmount(args.find((a) => parseAmount(a) > 0));
        const coin = (args.find((a) => /^(flocos?|cristais?)$/i.test(a)) || 'flocos').toLowerCase();
        if (!user || !amount)
            return message.reply('Uso: `O.removemoney @user 5k [flocos|cristais]`');

        if (coin.startsWith('cristal')) {
            cristais.remove(user.id, amount);
            return message.reply({ embeds: [new EmbedBuilder().setColor(0xf97316).setDescription(`Removido de ${user}.\n${cristais.format(cristais.get(user.id))}`)] });
        }
        flocos.remove(user.id, amount);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0xf97316).setDescription(`Removido de ${user}.\n${flocos.format(flocos.get(user.id))}`)] });
    }
};
