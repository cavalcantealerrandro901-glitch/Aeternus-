const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');

module.exports = {
    name: 'conta',
    aliases: ['math', 'calcular'],
    description: 'Resolva a conta rápido e ganhe flocos',
    async execute(message) {
        const a = 5 + Math.floor(Math.random() * 40);
        const b = 2 + Math.floor(Math.random() * 30);
        const ops = [
            { sym: '+', res: a + b },
            { sym: '-', res: a - b },
            { sym: '×', res: a * (1 + Math.floor(Math.random() * 9)) }
        ];
        // recompute for multiply with cleaner numbers
        const opType = Math.floor(Math.random() * 3);
        let left = a;
        let right = b;
        let answer;
        let sym;
        if (opType === 0) {
            sym = '+';
            answer = left + right;
        } else if (opType === 1) {
            if (left < right) [left, right] = [right, left];
            sym = '-';
            answer = left - right;
        } else {
            left = 2 + Math.floor(Math.random() * 12);
            right = 2 + Math.floor(Math.random() * 12);
            sym = '×';
            answer = left * right;
        }

        const reward = 300 + Math.floor(Math.random() * 700);

        const embed = new EmbedBuilder()
            .setColor(0xa78bfa)
            .setTitle('🔢 Conta rápida')
            .setDescription(
                `Quanto é **${left} ${sym} ${right}**?\n` +
                    `Responda neste chat em **15 segundos**.\n` +
                    `Prêmio: ${flocos.format(reward)}`
            );

        await message.reply({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: (m) => m.author.id === message.author.id,
            time: 15000,
            max: 1
        });

        collector.on('collect', async (m) => {
            const val = parseInt(String(m.content).replace(/\s/g, ''), 10);
            if (val === answer) {
                flocos.add(message.author.id, reward);
                await m.reply(
                    `✅ Certo! +${flocos.formatPlain(reward)} · Saldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                );
            } else {
                await m.reply(`❌ Errado. A resposta era **${answer}**.`);
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                message.channel.send(`⏰ Tempo esgotado. Resposta: **${answer}**.`).catch(() => {});
            }
        });
    }
};
