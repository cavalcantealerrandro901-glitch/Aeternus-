const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');

module.exports = {
    name: 'resgatar',
    aliases: ['claiminvest'],
    async execute(message) {
        const inv = store.load('invest.json', {});
        const data = inv[message.author.id];
        if (!data) return message.reply('Nenhum investimento.');
        if (Date.now() - data.at < 3600000) {
            const m = Math.ceil((3600000 - (Date.now() - data.at)) / 60000);
            return message.reply(`⏳ Faltam **${m}** min.`);
        }
        const mult = 0.75 + Math.random() * 0.75;
        const back = Math.floor(data.amount * mult);
        flocos.add(message.author.id, back);
        delete inv[message.author.id];
        store.save('invest.json', inv);
        await message.reply({ embeds: [new EmbedBuilder().setColor(mult >= 1 ? 0x34d399 : 0xf97316).setTitle('📈 Resgate').setDescription(`×${mult.toFixed(2)} → ${flocos.format(back)}`)] });
    }
};
