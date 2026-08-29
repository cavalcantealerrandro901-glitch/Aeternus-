const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');
const FISH = [['sardinha', 200, 500], ['tilápia', 400, 900], ['salmão', 800, 1800], ['atum', 1200, 2800], ['lendário', 3500, 7000]];
const CD = 10 * 60 * 1000;

module.exports = {
    name: 'pescar',
    aliases: ['fish', 'pesca'],
    async execute(message) {
        const cd = store.load('fishcd.json', {});
        if (cd[message.author.id] && Date.now() - cd[message.author.id] < CD) {
            const m = Math.ceil((CD - (Date.now() - cd[message.author.id])) / 60000);
            return message.reply(`⏳ Espere **${m}** min.`);
        }
        cd[message.author.id] = Date.now();
        store.save('fishcd.json', cd);
        if (Math.random() < 0.18) return message.reply('🐟 Nada mordeu…');
        const [name, min, max] = FISH[Math.floor(Math.random() * FISH.length)];
        const pay = min + Math.floor(Math.random() * (max - min + 1));
        flocos.add(message.author.id, pay);
        await message.reply({
            embeds: [new EmbedBuilder().setColor(0x38bdf8).setTitle('🎣 Pesca').setDescription(`**${name}** vendido por ${flocos.format(pay)}`)]
        });
    }
};
