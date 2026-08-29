const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');
const CD = 3 * 60 * 1000;

module.exports = {
    name: 'beg',
    aliases: ['pedir', 'esmolar'],
    async execute(message) {
        const cd = store.load('begcd.json', {});
        if (cd[message.author.id] && Date.now() - cd[message.author.id] < CD)
            return message.reply('⏳ Aguarde 3 minutos.');
        cd[message.author.id] = Date.now();
        store.save('begcd.json', cd);
        if (Math.random() < 0.28)
            return message.reply({ embeds: [new EmbedBuilder().setColor(0x64748b).setDescription('Ninguém parou para ajudar…')] });
        const pay = 80 + Math.floor(Math.random() * 420);
        flocos.add(message.author.id, pay);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0x86efac).setDescription(`Alguém te deu ${flocos.format(pay)}.`) ] });
    }
};
