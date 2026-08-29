const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');

module.exports = {
    name: 'monthly',
    aliases: ['mensal'],
    async execute(message) {
        const all = store.load('monthly.json', {});
        const now = Date.now();
        if (all[message.author.id] && now - all[message.author.id] < 30 * 864e5) {
            const d = Math.ceil((30 * 864e5 - (now - all[message.author.id])) / 864e5);
            return message.reply(`⏳ Volte em **${d}** dia(s).`);
        }
        const pay = 90000 + Math.floor(Math.random() * 110000);
        flocos.add(message.author.id, pay);
        all[message.author.id] = now;
        store.save('monthly.json', all);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0xfbbf24).setTitle('🗓️ Monthly').setDescription(flocos.format(pay))] });
    }
};
