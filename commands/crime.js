const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');

const ACTS = ['invadiu um cofre', 'hackeou uma conta', 'fez um golpe online', 'fugiu da blitz'];
const CD = 20 * 60 * 1000;

module.exports = {
    name: 'crime',
    description: 'Crime arriscado por flocos',
    async execute(message) {
        const cds = store.load('crimecd.json', {});
        if (cds[message.author.id] && Date.now() - cds[message.author.id] < CD) {
            const m = Math.ceil((CD - (Date.now() - cds[message.author.id])) / 60000);
            return message.reply(`⏳ Espere **${m}** min.`);
        }
        cds[message.author.id] = Date.now();
        store.save('crimecd.json', cds);
        const act = ACTS[Math.floor(Math.random() * ACTS.length)];
        if (Math.random() < 0.55) {
            const gain = 1000 + Math.floor(Math.random() * 4500);
            flocos.add(message.author.id, gain);
            return message.reply({
                embeds: [new EmbedBuilder().setColor(0x34d399).setTitle('🕶️ Sucesso').setDescription(`Você ${act} e ganhou ${flocos.format(gain)}.`) ]
            });
        }
        const loss = 500 + Math.floor(Math.random() * 2200);
        flocos.remove(message.author.id, loss);
        await message.reply({
            embeds: [new EmbedBuilder().setColor(0xef4444).setTitle('🚔 Falhou').setDescription(`Você ${act}, mas foi pego. Multa: ${flocos.format(loss)}.`) ]
        });
    }
};
