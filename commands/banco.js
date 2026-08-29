const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const bank = require('../utils/bank');
const cristais = require('../utils/cristais');

module.exports = {
    name: 'banco',
    aliases: ['bank', 'wallet'],
    description: 'Carteira e banco',
    async execute(message) {
        const u = message.mentions.users.first() || message.author;
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setAuthor({ name: u.username, iconURL: u.displayAvatarURL({ size: 64 }) })
                    .setTitle('🏦 Extrato')
                    .addFields(
                        { name: '❄️ Carteira', value: flocos.formatPlain(flocos.get(u.id)), inline: true },
                        { name: '🏦 Banco', value: flocos.formatPlain(bank.get(u.id)), inline: true },
                        { name: '💠 Cristais', value: cristais.formatPlain(cristais.get(u.id)), inline: true }
                    )
                    .setTimestamp()
            ]
        });
    }
};
