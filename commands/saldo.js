const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const xp = require('../utils/xp');
const bank = require('../utils/bank');

module.exports = {
    name: 'saldo',
    aliases: ['bal', 'atm', 'balance'],
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const x = xp.get(user.id);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                    .setTitle('💎 Carteira')
                    .setDescription(
                        `${flocos.format(flocos.get(user.id))}\n🏦 Banco: **${flocos.formatPlain(bank.get(user.id))}**\n${cristais.format(cristais.get(user.id))}\n⭐ Nível **${x.level}**`
                    )
            ]
        });
    }
};
