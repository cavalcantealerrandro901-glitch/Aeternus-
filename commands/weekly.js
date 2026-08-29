const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');

module.exports = {
    name: 'weekly',
    aliases: ['semanal'],
    async execute(message) {
        const all = store.load('weekly.json', {});
        const now = Date.now();
        if (all[message.author.id] && now - all[message.author.id] < 7 * 864e5) {
            const h = Math.ceil((7 * 864e5 - (now - all[message.author.id])) / 3600000);
            return message.reply(`⏳ Volte em **${h}h**.`);
        }
        const pay = 22000 + Math.floor(Math.random() * 28000);
        flocos.add(message.author.id, pay);
        all[message.author.id] = now;
        store.save('weekly.json', all);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0xa78bfa).setTitle('📅 Weekly').setDescription(flocos.format(pay))] });
    }
};
