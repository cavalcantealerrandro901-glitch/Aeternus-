const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');
const CD = 30 * 60 * 1000;

module.exports = {
    name: 'rob',
    aliases: ['roubar', 'steal'],
    description: 'Tenta roubar flocos',
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target || target.bot || target.id === message.author.id)
            return message.reply('Mencione um usuário válido.');
        const cds = store.load('robcd.json', {});
        if (cds[message.author.id] && Date.now() - cds[message.author.id] < CD) {
            const m = Math.ceil((CD - (Date.now() - cds[message.author.id])) / 60000);
            return message.reply(`⏳ Aguarde **${m}** min.`);
        }
        const bal = flocos.get(target.id);
        if (bal < 500) return message.reply('Alvo com poucos flocos.');
        cds[message.author.id] = Date.now();
        store.save('robcd.json', cds);

        if (Math.random() < 0.4) {
            const stolen = Math.floor(bal * (0.05 + Math.random() * 0.12));
            flocos.remove(target.id, stolen);
            flocos.add(message.author.id, stolen);
            return message.reply({
                embeds: [new EmbedBuilder().setColor(0x34d399).setTitle('🦹 Roubo').setDescription(`Você roubou **${flocos.formatPlain(stolen)}** flocos de ${target}.`)]
            });
        }
        const fine = 300 + Math.floor(Math.random() * 900);
        flocos.remove(message.author.id, fine);
        await message.reply({
            embeds: [new EmbedBuilder().setColor(0xef4444).setTitle('🚨 Pegaram você').setDescription(`Multa: ${flocos.format(fine)}`)]
        });
    }
};
