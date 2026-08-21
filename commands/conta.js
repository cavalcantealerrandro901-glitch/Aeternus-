const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');

const activeChannels = new Set();
const ANSWER_TIME = 15000;
const REST_TIME = 5000;

const ENCOURAGE = [
    '🔥 **VOCÊS CONSEGUEM!** Continuem mandando as respostas — o topo do ranking está em jogo!',
    '⚡ **NÃO PAREM AGORA!** Cada acerto vale ❄️ flocos e sobe vocês no placar!',
    '💪 **BORA TIME!** Foquem na conta e mostrem quem domina a matemática do servidor!',
    '🏆 **O RANKING ESTÁ ABERTO!** Quem vai ficar em primeiro nessa sequência?',
    '🌟 **ACERTEM E BRILHEM!** A próxima conta já vem — fiquem atentos ao chat!'
];

function encourage() {
    return ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)];
}

function rankText(scores) {
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return '_Ninguém pontuou._';
    return sorted
        .slice(0, 15)
        .map(([id, pts], i) => {
            let medal = `**${i + 1}º**`;
            if (i === 0) medal = '🏅 1º';
            else if (i === 1) medal = '🥈 2º';
            else if (i === 2) medal = '🥉 3º';
            else if (i === 3) medal = '🎖️ 4º';
            else if (i === 4) medal = '🎖️ 5º';
            return `${medal} — <@${id}> · **${pts}** acerto(s)`;
        })
        .join('\n');
}

function finalEmbed(scores, totalCorrect, reason) {
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    let title = '🔢 Conta encerrada';
    let color = 0x64748b;
    if (reason === 'wrong') {
        title = '🔢 Alguém errou — fim de jogo';
        color = 0xef4444;
    } else if (reason === 'timeout') {
        title = '⏰ Tempo esgotado — fim de jogo';
        color = 0xf59e0b;
    }

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(
            `Acertos da sala: **${totalCorrect}**\n\n` +
                `**🏆 Ranking final**\n${rankText(scores)}\n\n` +
                (sorted[0] && sorted[0][1] > 0
                    ? `🏅 Líder: <@${sorted[0][0]}> com **${sorted[0][1]}** acerto(s)!\n\n`
                    : '') +
                `### ${encourage().replace(/\*\*/g, '')}`
        )
        .setTimestamp();
}

function makeQuestion(totalCorrect) {
    const hard = totalCorrect >= 10;
    const expert = totalCorrect >= 20;

    if (expert) {
        const mode = Math.floor(Math.random() * 4);
        if (mode === 0) {
            const a = 2 + Math.floor(Math.random() * 12);
            const b = 2 + Math.floor(Math.random() * 12);
            const c = 2 + Math.floor(Math.random() * 8);
            return { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c, reward: 900 };
        }
        if (mode === 1) {
            const a = 3 + Math.floor(Math.random() * 10);
            const b = 1 + Math.floor(Math.random() * 20);
            return { text: `${a}² − ${b}`, answer: a * a - b, reward: 950 };
        }
        if (mode === 2) {
            const a = 2 + Math.floor(Math.random() * 15);
            const b = 2 + Math.floor(Math.random() * 15);
            return { text: `2×${a} + 3×${b}`, answer: 2 * a + 3 * b, reward: 900 };
        }
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
    description: 'Contas multiplayer — nova mensagem por rodada; 15s ou erro encerra',
    async execute(message) {
        const channelId = message.channel.id;
        if (activeChannels.has(channelId)) {
            return message.reply('Já existe uma **conta** neste canal.');
        }
        activeChannels.add(channelId);

        const scores = new Map();
        let totalCorrect = 0;
        let endReason = 'done';

        try {
            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('🔢 Conta multiplayer')
                        .setDescription(
                            `Respondam com o **número** no chat.\n` +
                                `Primeiro a acertar ganha ❄️ flocos.\n` +
                                `**Errar** ou **15s sem resposta** encerra o jogo.\n` +
                                `Após 10 acertos a dificuldade sobe.\n\n` +
                                `### ${encourage().replace(/\*\*/g, '')}`
                        )
                ]
            });

            while (true) {
                const q = makeQuestion(totalCorrect);
                const levelLabel =
                    totalCorrect >= 20 ? '🔥 Expert' : totalCorrect >= 10 ? '⚡ Difícil' : '🟢 Normal';

                // SEMPRE mensagem nova
                await message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xa78bfa)
                            .setTitle(`🔢 Conta · ${levelLabel}`)
                            .setDescription(
                                `Quanto é **${q.text}**?\n` +
                                    `⏱️ **15 segundos** · Prêmio: ${flocos.format(q.reward)}\n` +
                                    `Acertos da sala: **${totalCorrect}**\n\n` +
                                    `**🏆 Ranking**\n${rankText(scores)}\n\n` +
                                    `### ${encourage().replace(/\*\*/g, '')}`
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
                            resolve({ type: 'correct', user: m.author, message: m, reward: q.reward });
                        } else {
                            collector.stop('wrong');
                            resolve({ type: 'wrong', user: m.author, answer: q.answer });
                        }
                    });

                    collector.on('end', (_, reason) => {
                        if (reason === 'correct' || reason === 'wrong') return;
                        resolve({ type: 'timeout', answer: q.answer });
                    });
                });

                if (result.type === 'correct') {
                    scores.set(result.user.id, (scores.get(result.user.id) || 0) + 1);
                    totalCorrect += 1;
                    flocos.add(result.user.id, result.reward);
                    xp.add(result.user.id, 5);
                    if (totalCorrect % 5 === 0) cristais.add(result.user.id, 1);

                    await message.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x22c55e)
                                .setTitle('✅ Acertou!')
                                .setDescription(
                                    `🏅 **Ganhador:** <@${result.user.id}>\n` +
                                        `Acertou **${q.text} = ${q.answer}**\n` +
                                        `Recebeu ${flocos.format(result.reward)}\n` +
                                        `Saldo: ${flocos.formatPlain(flocos.get(result.user.id))}\n\n` +
                                        `**🏆 Ranking**\n${rankText(scores)}\n\n` +
                                        `### ${encourage().replace(/\*\*/g, '')}`
                                )
                        ]
                    });

                    await new Promise((r) => setTimeout(r, REST_TIME));
                    continue;
                }

                if (result.type === 'wrong') {
                    endReason = 'wrong';
                    await message.channel.send(
                        `❌ <@${result.user.id}> errou! A resposta era **${result.answer}**.`
                    );
                    break;
                }

                // timeout 15s → encerra
                endReason = 'timeout';
                await message.channel.send(
                    `⏰ Ninguém respondeu a tempo. A resposta era **${result.answer}**.`
                );
                break;
            }

            const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
            if (sorted[0] && sorted[0][1] > 0) {
                flocos.add(sorted[0][0], 800);
                cristais.add(sorted[0][0], 1);
            }

            await message.channel.send({
                embeds: [finalEmbed(scores, totalCorrect, endReason)]
            });
        } finally {
            activeChannels.delete(channelId);
        }
    }
};
