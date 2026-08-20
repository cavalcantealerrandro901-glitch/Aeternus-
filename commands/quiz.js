const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');

const QUESTIONS = [
    {
        q: 'Quanto é 12 × 8?',
        options: ['86', '96', '108', '88'],
        correct: 1
    },
    {
        q: 'Qual planeta é conhecido como planeta vermelho?',
        options: ['Vênus', 'Marte', 'Júpiter', 'Mercúrio'],
        correct: 1
    },
    {
        q: 'Se todos os gatos mia e Mimi é um gato, então:',
        options: ['Mimi late', 'Mimi mia', 'Mimi voa', 'Nada se pode dizer'],
        correct: 1
    },
    {
        q: 'Qual é a capital do Brasil?',
        options: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'],
        correct: 2
    },
    {
        q: 'Complete: 2, 4, 8, 16, …',
        options: ['18', '24', '32', '20'],
        correct: 2
    },
    {
        q: 'Quantos lados tem um hexágono?',
        options: ['5', '6', '7', '8'],
        correct: 1
    },
    {
        q: 'O oposto de “sempre” é:',
        options: ['Às vezes', 'Nunca', 'Talvez', 'Logo'],
        correct: 1
    },
    {
        q: '15% de 200 é:',
        options: ['20', '25', '30', '35'],
        correct: 2
    }
];

module.exports = {
    name: 'quiz',
    aliases: ['trivia'],
    description: 'Pergunta de raciocínio — acerte e ganhe flocos',
    async execute(message) {
        const item = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        const reward = 500 + Math.floor(Math.random() * 1501); // 500–2000

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle('🧠 Quiz')
            .setDescription(
                `**${item.q}**\n\nRecompensa: ${flocos.format(reward)}\nVocê tem **20 segundos**.`
            );

        const row = new ActionRowBuilder().addComponents(
            item.options.map((label, i) =>
                new ButtonBuilder()
                    .setCustomId(`quiz_${message.id}_${i}`)
                    .setLabel(`${String.fromCharCode(65 + i)}) ${label}`)
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        const sent = await message.reply({ embeds: [embed], components: [row] });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 20000,
            filter: (i) => i.user.id === message.author.id
        });

        let answered = false;
        collector.on('collect', async (i) => {
            if (answered) return;
            answered = true;
            const idx = parseInt(i.customId.split('_').pop(), 10);
            const ok = idx === item.correct;

            if (ok) flocos.add(message.author.id, reward);

            const result = new EmbedBuilder()
                .setColor(ok ? 0x22c55e : 0xef4444)
                .setTitle(ok ? '✅ Correto!' : '❌ Errado')
                .setDescription(
                    ok
                        ? `Você ganhou ${flocos.format(reward)}.\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                        : `A resposta certa era **${item.options[item.correct]}**.`
                );

            await i.update({ embeds: [result], components: [] });
            collector.stop('done');
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'done' || answered) return;
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('⏰ Tempo esgotado')
                            .setDescription(`A resposta era **${item.options[item.correct]}**.`)
                    ],
                    components: []
                });
            } catch (_) {}
        });
    }
};
