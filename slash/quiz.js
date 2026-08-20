const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');

const QUESTIONS = [
    { q: 'Quanto é 9 × 7?', options: ['56', '63', '72', '64'], correct: 1 },
    { q: 'Capital da França?', options: ['Lyon', 'Paris', 'Marselha', 'Nice'], correct: 1 },
    { q: '2, 3, 5, 7, 11, … (próximo)?', options: ['12', '13', '14', '15'], correct: 1 },
    { q: 'HTML é uma linguagem de…', options: ['marcação', 'compilação', 'banco', 'hardware'], correct: 0 }
];

module.exports = {
    data: new SlashCommandBuilder().setName('quiz').setDescription('Quiz de raciocínio por ❄️ flocos'),
    async execute(interaction) {
        const item = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        const reward = 500 + Math.floor(Math.random() * 1501);

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle('🧠 Quiz')
            .setDescription(`**${item.q}**\n\nPrêmio: ${flocos.format(reward)} · 20s`);

        const row = new ActionRowBuilder().addComponents(
            item.options.map((label, i) =>
                new ButtonBuilder()
                    .setCustomId(`sq_${interaction.id}_${i}`)
                    .setLabel(`${String.fromCharCode(65 + i)}) ${label}`)
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 20000,
            filter: (i) => i.user.id === interaction.user.id
        });

        let done = false;
        collector.on('collect', async (i) => {
            if (done) return;
            done = true;
            const idx = parseInt(i.customId.split('_').pop(), 10);
            const ok = idx === item.correct;
            if (ok) flocos.add(interaction.user.id, reward);
            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(ok ? 0x22c55e : 0xef4444)
                        .setTitle(ok ? '✅ Correto!' : '❌ Errado')
                        .setDescription(
                            ok
                                ? `+${flocos.formatPlain(reward)} · ${flocos.formatPlain(flocos.get(interaction.user.id))}`
                                : `Certo: **${item.options[item.correct]}**`
                        )
                ],
                components: []
            });
            collector.stop();
        });

        collector.on('end', async (_, r) => {
            if (done || r === 'user') return;
            try {
                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('⏰ Tempo')
                            .setDescription(`Resposta: **${item.options[item.correct]}**`)
                    ],
                    components: []
                });
            } catch (_) {}
        });
    }
};
