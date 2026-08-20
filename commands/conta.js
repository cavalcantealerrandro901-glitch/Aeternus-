const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');

function makeQuestion() {
    const opType = Math.floor(Math.random() * 3);
    let left = 5 + Math.floor(Math.random() * 40);
    let right = 2 + Math.floor(Math.random() * 30);
    let sym;
    let answer;

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
    return { left, right, sym, answer, reward };
}

module.exports = {
    name: 'conta',
    aliases: ['math', 'calcular'],
    description: 'Sequência de contas com ❄️ flocos — erre e acaba',
    async execute(message) {
        let streak = 0;
        let totalWon = 0;
        let current = makeQuestion();
        let finished = false;

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('🔢 Conta rápida')
                    .setDescription(
                        `Quanto é **${current.left} ${current.sym} ${current.right}**?\n` +
                            `Prêmio: ${flocos.format(current.reward)}\n` +
                            `Acerte para receber a **próxima**. Errou = fim.\n` +
                            `**15s** por pergunta.`
                    )
            ]
        });

        let questionDeadline = Date.now() + 15000;

        const collector = message.channel.createMessageCollector({
            filter: (m) => m.author.id === message.author.id && !m.author.bot,
            time: 15 * 60 * 1000
        });

        const tick = setInterval(() => {
            if (finished) {
                clearInterval(tick);
                return;
            }
            if (Date.now() > questionDeadline) {
                finished = true;
                clearInterval(tick);
                collector.stop('timeout');
                message.channel
                    .send(
                        `⏰ Tempo esgotado. Resposta: **${current.answer}**.\n` +
                            `Sequência: **${streak}** · Total: ${flocos.formatPlain(totalWon)}`
                    )
                    .catch(() => {});
            }
        }, 500);

        collector.on('collect', async (m) => {
            if (finished) return;
            if (Date.now() > questionDeadline) return;

            const val = parseInt(String(m.content).replace(/\s/g, ''), 10);
            if (Number.isNaN(val)) {
                await m.reply('Envie só o **número**.').catch(() => {});
                return;
            }

            if (val === current.answer) {
                const gained = current.reward;
                streak += 1;
                totalWon += gained;
                flocos.add(message.author.id, gained);
                xp.add(message.author.id, 5);
                if (streak % 3 === 0) cristais.add(message.author.id, 1);

                current = makeQuestion();
                questionDeadline = Date.now() + 15000;

                await m
                    .reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x22c55e)
                                .setTitle(`✅ Acerto #${streak}`)
                                .setDescription(
                                    `+${flocos.formatPlain(gained)} · Total na sequência: ${flocos.formatPlain(totalWon)}\n` +
                                        `Saldo: ${flocos.formatPlain(flocos.get(message.author.id))}\n\n` +
                                        `**Próxima:** quanto é **${current.left} ${current.sym} ${current.right}**?\n` +
                                        `Prêmio: ${flocos.format(current.reward)} · 15s`
                                )
                        ]
                    })
                    .catch(() => {});
            } else {
                finished = true;
                clearInterval(tick);
                collector.stop('wrong');
                await m
                    .reply(
                        `❌ Errado. Era **${current.answer}**.\n` +
                            `Sequência: **${streak}** acerto(s).\n` +
                            `Total ganho: ${flocos.formatPlain(totalWon)}\n` +
                            `Saldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                    )
                    .catch(() => {});
            }
        });

        collector.on('end', () => {
            finished = true;
            clearInterval(tick);
        });
    }
};
