const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');

/** Sessões ativas por canal — evita 2 quizzes no mesmo lugar */
const activeChannels = new Set();

const QUESTIONS = [
    { q: 'Quanto é 12 × 8?', options: ['86', '96', '108', '88'], correct: 1 },
    { q: 'Qual planeta é conhecido como planeta vermelho?', options: ['Vênus', 'Marte', 'Júpiter', 'Mercúrio'], correct: 1 },
    { q: 'Capital do Brasil?', options: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'], correct: 2 },
    { q: 'Complete: 2, 4, 8, 16, …', options: ['18', '24', '32', '20'], correct: 2 },
    { q: 'Quantos lados tem um hexágono?', options: ['5', '6', '7', '8'], correct: 1 },
    { q: '15% de 200 é:', options: ['20', '25', '30', '35'], correct: 2 },
    { q: 'HTML é linguagem de…', options: ['marcação', 'compilação', 'banco', 'hardware'], correct: 0 },
    { q: 'Raiz quadrada de 144?', options: ['10', '11', '12', '14'], correct: 2 },
    { q: 'Quantos minutos tem 2,5 horas?', options: ['120', '130', '150', '180'], correct: 2 },
    { q: 'O oposto de “sempre” é:', options: ['Às vezes', 'Nunca', 'Talvez', 'Logo'], correct: 1 },
    { q: '9 × 7 = ?', options: ['56', '63', '72', '64'], correct: 1 },
    { q: 'Próximo primo após 7?', options: ['9', '10', '11', '15'], correct: 2 }
];

const ROUND_TIME = 20000;
const REST_TIME = 15000;
const TOTAL_ROUNDS = 8;
const REWARD = 400;

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

function pickQuestion(used) {
    const pool = QUESTIONS.filter((_, i) => !used.has(i));
    const list = pool.length ? pool : QUESTIONS;
    const item = list[Math.floor(Math.random() * list.length)];
    const idx = QUESTIONS.indexOf(item);
    used.add(idx);
    return item;
}

module.exports = {
    name: 'quiz',
    aliases: ['trivia'],
    description: 'Quiz multiplayer com ranking — vários jogadores',
    async execute(message) {
        const channelId = message.channel.id;
        if (activeChannels.has(channelId)) {
            return message.reply('Já existe um **quiz** rolando neste canal. Aguarde terminar.');
        }
        activeChannels.add(channelId);

        const scores = new Map();
        const used = new Set();
        let round = 0;

        const sessionMsg = await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x38bdf8)
                    .setTitle('🧠 Quiz multiplayer')
                    .setDescription(
                        `**${TOTAL_ROUNDS}** perguntas · **${ROUND_TIME / 1000}s** cada\n` +
                            `Descanso de **${REST_TIME / 1000}s** entre as rodadas\n` +
                            `Qualquer um pode responder pelos botões.\n` +
                            `Acerto: ${flocos.format(REWARD)} + ranking ao vivo.`
                    )
            ]
        });

        try {
            for (round = 1; round <= TOTAL_ROUNDS; round++) {
                const item = pickQuestion(used);
                const answered = new Set();

                const embed = new EmbedBuilder()
                    .setColor(0x38bdf8)
                    .setTitle(`🧠 Quiz — rodada ${round}/${TOTAL_ROUNDS}`)
                    .setDescription(
                        `**${item.q}**\n\n` +
                            `⏱️ ${ROUND_TIME / 1000}s · 1 resposta por pessoa\n\n` +
                            `**Ranking**\n${rankText(scores)}`
                    );

                const row = new ActionRowBuilder().addComponents(
                    item.options.map((label, i) =>
                        new ButtonBuilder()
                            .setCustomId(`quizm_${message.channel.id}_${round}_${i}`)
                            .setLabel(`${String.fromCharCode(65 + i)}) ${label}`)
                            .setStyle(ButtonStyle.Secondary)
                    )
                );

                await sessionMsg.edit({ embeds: [embed], components: [row] });

                await new Promise((resolve) => {
                    const collector = sessionMsg.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: ROUND_TIME,
                        filter: (i) => i.customId.startsWith(`quizm_${message.channel.id}_${round}_`)
                    });

                    collector.on('collect', async (i) => {
                        if (answered.has(i.user.id)) {
                            return i.reply({ content: 'Você já respondeu nesta rodada.', ephemeral: true }).catch(() => {});
                        }
                        answered.add(i.user.id);
                        const pick = parseInt(i.customId.split('_').pop(), 10);
                        const ok = pick === item.correct;

                        if (ok) {
                            scores.set(i.user.id, (scores.get(i.user.id) || 0) + 1);
                            flocos.add(i.user.id, REWARD);
                            xp.add(i.user.id, 5);
                            await i
                                .reply({ content: `✅ Correto! +${flocos.formatPlain(REWARD)}`, ephemeral: true })
                                .catch(() => {});
                        } else {
                            await i
                                .reply({
                                    content: `❌ Errado. Certo: **${item.options[item.correct]}**`,
                                    ephemeral: true
                                })
                                .catch(() => {});
                        }

                        // Atualiza ranking na mensagem (sem resetar botões de quem ainda não jogou)
                        try {
                            await sessionMsg.edit({
                                embeds: [
                                    EmbedBuilder.from(embed).setDescription(
                                        `**${item.q}**\n\n⏱️ Rodada em andamento…\n\n**Ranking**\n${rankText(scores)}`
                                    )
                                ]
                            });
                        } catch (_) {}
                    });

                    collector.on('end', async () => {
                        try {
                            await sessionMsg.edit({
                                embeds: [
                                    new EmbedBuilder()
                                        .setColor(0x64748b)
                                        .setTitle(`🧠 Fim da rodada ${round}/${TOTAL_ROUNDS}`)
                                        .setDescription(
                                            `Resposta: **${item.options[item.correct]}**\n\n**Ranking**\n${rankText(scores)}` +
                                                (round < TOTAL_ROUNDS
                                                    ? `\n\n⏳ Próxima em **${REST_TIME / 1000}s**…`
                                                    : '')
                                        )
                                ],
                                components: []
                            });
                        } catch (_) {}
                        resolve();
                    });
                });

                if (round < TOTAL_ROUNDS) {
                    await new Promise((r) => setTimeout(r, REST_TIME));
                }
            }

            // Bônus top 1
            const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
            if (sorted[0] && sorted[0][1] > 0) {
                flocos.add(sorted[0][0], 1000);
                cristais.add(sorted[0][0], 2);
            }

            await sessionMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22c55e)
                        .setTitle('🏆 Quiz encerrado')
                        .setDescription(
                            `**Ranking final**\n${rankText(scores)}\n\n` +
                                (sorted[0] && sorted[0][1] > 0
                                    ? `🥇 Bônus ao líder: ${flocos.format(1000)}`
                                    : 'Ninguém pontuou.')
                        )
                ],
                components: []
            });
        } finally {
            activeChannels.delete(channelId);
        }
    }
};
