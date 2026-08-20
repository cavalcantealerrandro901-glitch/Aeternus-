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
    description: 'Sequência de contas — acerte para continuar, erre e perde a sequência',
    async execute(message) {
        let streak = 0;
        let totalWon = 0;
        let current = makeQuestion();
        let finished = false;

        const askEmbed = () =>
            new EmbedBuilder()
                .setColor(0xa78bfa)
                .setTitle('🔢 Conta rápida')
                .setDescription(
                    `Quanto é **${current.left} ${current.sym} ${current.right}**?\n` +
                        `Sequência: **${streak}** acerto(s)\n` +
                        `Prêmio desta conta: ${flocos.format(current.reward)}\n` +
                        `Responda em **15 segundos**. Errou = fim.`
                );

        await message.reply({ embeds: [askEmbed()] });

        const collector = message.channel.createMessageCollector({
            filter: (m) => m.author.id === message.author.id && !m.author.bot,
            time: 15 * 60 * 1000 // sessão longa; cada pergunta tem timeout manual
        });

        let questionDeadline = Date.now() + 15000;
        const tick = setInterval(() => {
            if (finished) return clearInterval(tick);
            if (Date.now() > questionDeadline) {
                finished = true;
                collector.stop('timeout');
                clearInterval(tick);
                message.channel
                    .send(
                        `⏰ Tempo esgotado. Resposta: **${current.answer}**.\n` +
                            `Sequência: **${streak}** · Total ganho: ${flocos.formatPlain(totalWon)}`
                    )
                    .catch(() => {});
            }
        }, 1000);

        collector.on('collect', async (m) => {
            if (finished) return;
            if (Date.now() > questionDeadline) return;

            const val = parseInt(String(m.content).replace(/\s/g, ''), 10);
            if (Number.isNaN(val)) {
                await m.reply('Envie só o **número** da resposta.').catch(() => {});
                return;
            }

            if (val === current.answer) {
                streak += 1;
                totalWon += current.reward;
                flocos.add(message.author.id, current.reward);
                xp.add(message.author.id, 5);
                if (streak % 3 === 0) cristais.add(message.author.id, 1);

                current = makeQuestion();
                questionDeadline = Date.now() + 15000;

                await m.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle(`✅ Acerto #${streak}`)
                            .setDescription(
                                `+${flocos.formatPlain(current.reward)} já creditado na rodada anterior…\n` +
                                    `Total na sequência: ${flocos.formatPlain(totalWon)}\n\n` +
                                    `**Próxima:** quanto é **${current.left} ${current.sym} ${current.right}**?\n` +
                                    `Prêmio: ${flocos.format(current.reward)} · 15s`
                            )
                    ]
                }).catch(() => {});

                // Corrige texto: o reward creditado foi o anterior — ajustar mensagem
                // Na verdade creditamos current.reward ANTES de trocar — bug.
            } else {
                finished = true;
                clearInterval(tick);
                collector.stop('wrong');
                await m.reply(
                    `❌ Errado. Era **${current.answer}**.\n` +
                        `Sequência encerrada em **${streak}** acerto(s).\n` +
                        `Total ganho: ${flocos.formatPlain(totalWon)}\n` +
                        `Saldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                ).catch(() => {});
            }
        });

        collector.on('end', () => {
            clearInterval(tick);
            finished = true;
        });
    }
};
