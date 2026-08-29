const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const store = require('../utils/store');

const JOBS = [
    ['Desenvolvedor', 3000, 9000],
    ['Streamer', 2500, 8000],
    ['Designer', 2800, 7500],
    ['Chef', 2000, 6000],
    ['Médico', 4000, 10000],
    ['Motorista', 1500, 4500]
];
const CD = 45 * 60 * 1000;

module.exports = {
    name: 'trabalhar',
    aliases: ['work', 'job'],
    description: 'Trabalha por flocos',
    async execute(message) {
        const cds = store.load('workcd.json', {});
        const last = cds[message.author.id] || 0;
        if (Date.now() - last < CD) {
            const m = Math.ceil((CD - (Date.now() - last)) / 60000);
            return message.reply({ embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription(`⏳ Descanso: **${m}** min.`)] });
        }
        const [job, min, max] = JOBS[Math.floor(Math.random() * JOBS.length)];
        const pay = min + Math.floor(Math.random() * (max - min + 1));
        flocos.add(message.author.id, pay);
        cds[message.author.id] = Date.now();
        store.save('workcd.json', cds);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xfbbf24)
                    .setTitle('💼 Expediente concluído')
                    .setDescription(`Cargo: **${job}**\nPagamento: ${flocos.format(pay)}`)
                    .setFooter({ text: 'Cooldown: 45 minutos' })
            ]
        });
    }
};
