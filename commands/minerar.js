const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const store = require('../utils/store');
const CD = 12 * 60 * 1000;

module.exports = {
    name: 'minerar',
    aliases: ['mine'],
    async execute(message) {
        const cd = store.load('minecd.json', {});
        if (cd[message.author.id] && Date.now() - cd[message.author.id] < CD) {
            const m = Math.ceil((CD - (Date.now() - cd[message.author.id])) / 60000);
            return message.reply(`⏳ Espere **${m}** min.`);
        }
        cd[message.author.id] = Date.now();
        store.save('minecd.json', cd);
        if (Math.random() < 0.25) {
            const n = 8 + Math.floor(Math.random() * 45);
            cristais.add(message.author.id, n);
            return message.reply({ embeds: [new EmbedBuilder().setColor(0x22d3ee).setTitle('⛏️ Mineração').setDescription(`Veio ${cristais.format(n)}!`)] });
        }
        const pay = 600 + Math.floor(Math.random() * 2800);
        flocos.add(message.author.id, pay);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0xfbbf24).setTitle('⛏️ Mineração').setDescription(`Minério → ${flocos.format(pay)}`)] });
    }
};
