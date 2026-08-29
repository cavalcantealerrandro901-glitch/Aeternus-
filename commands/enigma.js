const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const active = new Map();
const RIDDLES = [
    { q: 'Tenho cidades sem casas, florestas sem árvores e água sem peixes. O que sou?', answers: ['mapa', 'um mapa', 'o mapa'] },
    { q: 'Quanto mais você tira, maior fica. O que é?', answers: ['buraco', 'um buraco'] },
    { q: 'Sempre à sua frente, mas nunca o vê. O que é?', answers: ['futuro', 'o futuro'] },
    { q: 'Chaves que não abrem portas. O que é?', answers: ['teclado', 'um teclado'] },
    { q: 'Quanto mais seca, mais molhada. O que é?', answers: ['toalha', 'a toalha'] }
];
function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim(); }

module.exports = {
    name: 'enigma',
    aliases: ['charada', 'charadas', 'riddle'],
    async execute(message) {
        if (active.has(message.channel.id))
            return message.reply('Já existe uma charada neste canal.');
        const item = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
        const reward = 900 + Math.floor(Math.random() * 1600);
        active.set(message.channel.id, true);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xc4b5fd)
                    .setTitle('✨ Charada')
                    .setDescription(`${item.q}\n\n👥 Aberta a todos · sem tempo\n💎 ${flocos.format(reward)}\n\n_Digite \`desistir\` para encerrar._`)
            ]
        });
        const collector = message.channel.createMessageCollector({ filter: (m) => !m.author.bot });
        let done = false;
        collector.on('collect', async (m) => {
            if (done) return;
            const t = norm(m.content);
            if (['desistir', 'desisto', 'encerrar'].includes(t)) {
                done = true;
                collector.stop();
                active.delete(message.channel.id);
                return m.reply(`Encerrado. Resposta: **${item.answers[0]}**`);
            }
            if (item.answers.some((a) => t === norm(a) || t.includes(norm(a)))) {
                done = true;
                flocos.add(m.author.id, reward);
                collector.stop();
                active.delete(message.channel.id);
                await m.reply({ embeds: [new EmbedBuilder().setColor(0x34d399).setTitle('🌟 Acertou').setDescription(`${m.author} · +${flocos.formatPlain(reward)} flocos`)] });
            }
        });
        collector.on('end', () => active.delete(message.channel.id));
    }
};
