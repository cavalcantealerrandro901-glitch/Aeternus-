const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const Q = [
    { q: 'Capital do Brasil?', a: ['brasilia', 'brasília'] },
    { q: '15 × 4?', a: ['60'] },
    { q: 'Planeta Vermelho?', a: ['marte'] },
    { q: 'Maior oceano?', a: ['pacifico', 'pacífico'] },
    { q: 'Lados de um hexágono?', a: ['6', 'seis'] }
];

module.exports = {
    name: 'quiz',
    async execute(message) {
        const item = Q[Math.floor(Math.random() * Q.length)];
        const reward = 600 + Math.floor(Math.random() * 1400);
        await message.reply({ embeds: [new EmbedBuilder().setColor(0xa78bfa).setTitle('🧠 Quiz').setDescription(`**${item.q}**\n⏱️ 20s · ${flocos.format(reward)}`)] });
        const collector = message.channel.createMessageCollector({ filter: (m) => !m.author.bot, time: 20000 });
        let done = false;
        collector.on('collect', async (m) => {
            if (done) return;
            const t = m.content.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
            if (item.a.some((a) => t === a || t.includes(a))) {
                done = true;
                flocos.add(m.author.id, reward);
                collector.stop('win');
                await m.reply(`✅ ${m.author} +${flocos.formatPlain(reward)} flocos`);
            }
        });
        collector.on('end', (_, r) => { if (r !== 'win') message.channel.send(`⏰ Resposta: **${item.a[0]}**`).catch(() => {}); });
    }
};
