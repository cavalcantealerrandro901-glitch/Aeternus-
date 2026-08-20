const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');

const RIDDLES = [
    {
        q: 'O que tem cidades, mas não tem casas; tem florestas, mas não tem árvores; tem água, mas não tem peixes?',
        answers: ['mapa', 'um mapa', 'o mapa']
    },
    {
        q: 'Quanto mais você tira, maior fica. O que é?',
        answers: ['buraco', 'um buraco', 'o buraco']
    },
    {
        q: 'Estou sempre na frente de você, mas nunca pode me ver. O que sou?',
        answers: ['futuro', 'o futuro']
    },
    {
        q: 'Tenho chaves, mas não abro portas. Tenho espaço, mas não tenho sala. O que sou?',
        answers: ['teclado', 'um teclado', 'o teclado']
    },
    {
        q: 'O que anda com os pés na cabeça?',
        answers: ['piolho', 'o piolho', 'um piolho']
    },
    {
        q: 'Quanto mais seca, mais molhada fica. O que é?',
        answers: ['toalha', 'a toalha', 'uma toalha']
    }
];

module.exports = {
    name: 'enigma',
    aliases: ['charada', 'riddle'],
    description: 'Charada de raciocínio por flocos',
    async execute(message) {
        const item = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
        const reward = 800 + Math.floor(Math.random() * 1200);

        const embed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle('🧩 Enigma')
            .setDescription(
                `**${item.q}**\n\nResponda em **30 segundos**.\nPrêmio: ${flocos.format(reward)}`
            );

        await message.reply({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: (m) => m.author.id === message.author.id,
            time: 30000,
            max: 5
        });

        let done = false;
        collector.on('collect', async (m) => {
            if (done) return;
            const text = m.content.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();
            const ok = item.answers.some((a) => text === a || text.includes(a));
            if (ok) {
                done = true;
                flocos.add(message.author.id, reward);
                collector.stop('win');
                await m.reply(
                    `✅ Isso! +${flocos.formatPlain(reward)} · Saldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                );
            } else {
                await m.reply('Não é isso… tente de novo.').catch(() => {});
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'win' || done) return;
            message.channel
                .send(`⏰ Acabou o tempo. Uma resposta possível: **${item.answers[0]}**.`)
                .catch(() => {});
        });
    }
};
