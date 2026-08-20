const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');

const activeChannels = new Set();
const ANSWER_TIME = 20000;
const REST_TIME = 5000;

function rankText(scores) {
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return '_Ninguém pontuou ainda._';
    return sorted
        .slice(0, 10)
        .map(([id, pts], i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
            return `${medal} <@${id}> — **${pts}** acerto(s)`;
        })
        .join('\n');
}

/** Dificuldade sobe após 10 acertos globais da sessão */
function makeQuestion(totalCorrect) {
    const hard = totalCorrect >= 10;
    const expert = totalCorrect >= 20;

    if (expert) {
        // equações / expressões
        const mode = Math.floor(Math.random() * 4);
        if (mode === 0) {
            // (a+b)*c
            const a = 2 + Math.floor(Math.random() * 12);
            const b = 2 + Math.floor(Math.random() * 12);
            const c = 2 + Math.floor(Math.random() * 8);
            return {
                text: `(${a} + ${b}) × ${c}`,
                answer: (a + b) * c,
                reward: 900
            };
        }
        if (mode === 1) {
            // a² - b
            const a = 3 + Math.floor(Math.random() * 10);
            const b = 1 + Math.floor(Math.random() * 20);
            return { text: `${a}² − ${b}`, answer: a * a - b, reward: 950 };
        }
        if (mode === 2) {
            // 2a + 3b
            const a = 2 + Math.floor(Math.random() * 15);
            const b = 2 + Math.floor(Math.random() * 15);
            return { text: `2×${a} + 3×${b}`, answer: 2 * a + 3 * b, reward: 900 };
        }
        // a*b - c
        const a = 3 + Math.floor(Math.random() * 12);
        const b = 3 + Math.floor(Math.random() * 12);
        const c = 1 + Math.floor(Math.random() * 30);
        return { text: `${a} × ${b} − ${c}`, answer: a * b - c, reward: 1000 };
    }

    if (hard) {
        const mode = Math.floor(Math.random() * 3);
        if (mode === 0) {
            const a = 10 + Math.floor(Math.random() * 40);
            const b = 10 + Math.floor(Math.random() * 40);
            const c = 2 + Math.floor(Math.random() * 15);
            return { text: `${a} + ${b} − ${c}`, answer: a + b - c, reward: 700 };
        }
        if (mode === 1) {
            const a = 5 + Math.floor(Math.random() * 15);
            const b = 5 + Math.floor(Math.random() * 12);
            return { text: `${a} × ${b}`, answer: a * b, reward: 750 };
        }
        const a = 20 + Math.floor(Math.random() * 80);
        const b = 2 + Math.floor(Math.random() * 9);
        return { text: `${a} ÷ ${b} (parte inteira)`, answer: Math.floor(a / b), reward: 800 };
    }

    // fácil
    const opType = Math.floor(Math.random() * 3);
    let left = 5 + Math.floor(Math.random() * 40);
    let right = 2 + Math.floor(Math.random() * 30);
    if (opType === 0) return { text: `${left} + ${right}`, answer: left + right, reward: 350 };
    if (opType === 1) {
        if (left < right) [left, right] = [right, left];
        return { text: `${left} − ${right}`, answer: left - right, reward: 350 };
    }
    left = 2 + Math.floor(Math.random() * 12);
    right = 2 + Math.floor(Math.random() * 12);
    return { text: `${left} × ${right}`, answer: left * right, reward: 400 };
}

module.exports = {
    name: 'conta',
    aliases: ['math', 'calcular'],
    description: 'Contas multiplayer com ranking — acaba quando alguém erra',
    async execute(message) {
        const channelId = message.channel.id;
        if (activeChannels.has(channelId)) {
            return message.reply('Já existe uma **conta** neste canal. Aguarde terminar.');
        }
        activeChannels.add(channelId);

        const scores = new Map();
        let totalCorrect = 0;
        let finished = false;

        const board = await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('🔢 Conta multiplayer')
                    .setDescription(
                        `Qualquer um pode responder no chat (só o **número**).\n` +
                            `**Primeiro** a acertar leva os ❄️ flocos.\n` +
                            `Se **alguém errar**, o jogo acaba.\n` +
                            `Após **10** acertos a dificuldade sobe (equações).\n` +
                            `Pausa de **${REST_TIME / 1000}s** entre contas.`
                    )
            ]
        });

        try {
            while (!finished) {
                const q = makeQuestion(totalCorrect);
                const levelLabel =
                    totalCorrect >= 20 ? '🔥 Expert' : totalCorrect >= 10 ? '⚡ Difícil' : '🟢 Normal';

                await board.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xa78bfa)
                            .setTitle(`🔢 Conta · ${levelLabel}`)
                            .setDescription(
                                `Quanto é **${q.text}**?\n` +
                                    `Prêmio: ${flocos.format(q.reward)} · ${ANSWER_TIME / 1000}s\n` +
                                    `Acertos da sala: **${totalCorrect}**\n\n` +
                                    `**Ranking**\n${rankText(scores)}`
                            )
                    ]
                });

                const result = await new Promise((resolve) => {
                    const collector = message.channel.createMessageCollector({
                        filter: (m) => !m.author.bot && m.channel.id === channelId,
                        time: ANSWER_TIME
                    });

                    collector.on('collect', async (m) => {
                        const val = parseInt(String(m.content).replace(/\s/g, ''), 10);
                        if (Number.isNaN(val)) return;

                        if (val === q.answer) {
                            collector.stop('correct');
                            scores.set(m.author.id, (scores.get(m.author.id) || 0) + 1);
                            totalCorrect += 1;
                            flocos.add(m.author.id, q.reward);
                            xp.add(m.author.id, 5);
                            if (totalCorrect % 5 === 0) cristais.add(m.author.id, 1);

                            await m
                                .reply(
                                    `✅ <@${m.author.id}> acertou! +${flocos.formatPlain(q.reward)} · Sala: **${totalCorrect}**`
                                )
                                .catch(() => {});
                            resolve({ type: 'correct', user: m.author });
                        } else {
                            // Errou = fim do jogo
                            collector.stop('wrong');
                            await m
                                .reply(
                                    `❌ <@${m.author.id}> errou (era **${q.answer}**). Jogo encerrado!`
                                )
                                .catch(() => {});
                            resolve({ type: 'wrong', user: m.author, answer: q.answer });
                        }
                    });

                    collector.on('end', async (_, reason) => {
                        if (reason === 'correct' || reason === 'wrong') return;
                        await message.channel
                            .send(`⏰ Ninguém acertou a tempo. Resposta: **${q.answer}**. Continuando…`)
                            .catch(() => {});
                        resolve({ type: 'timeout', answer: q.answer });
                    });
                });

                if (result.type === 'wrong') {
                    finished = true;
                    break;
                }

                // ranking entre rodadas
                await board.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('🔢 Pausa')
                            .setDescription(
                                `Próxima conta em **${REST_TIME / 1000}s**…\n\n**Ranking**\n${rankText(scores)}`
                            )
                    ]
                });
                await new Promise((r) => setTimeout(r, REST_TIME));
            }

            const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
            if (sorted[0] && sorted[0][1] > 0) {
                flocos.add(sorted[0][0], 800);
                cristais.add(sorted[0][0], 1);
            }

            await board.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('🔢 Conta encerrada')
                        .setDescription(
                            `Acertos da sala: **${totalCorrect}**\n\n**Ranking final**\n${rankText(scores)}\n\n` +
                                (sorted[0] && sorted[0][1] > 0
                                    ? `🥇 Bônus ao líder: ${flocos.format(800)}`
                                    : '')
                        )
                ]
            });
        } finally {
            activeChannels.delete(channelId);
        }
    }
};
