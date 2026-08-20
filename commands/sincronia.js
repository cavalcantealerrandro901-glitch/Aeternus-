const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');

/**
 * SINCRONIA — dois números visíveis; a regra secreta muda a cada rodada
 * (soma, diferença absoluta, produto dos dígitos, máx, mín…). Ache o resultado certo.
 */
module.exports = {
    name: 'sincronia',
    aliases: ['sync', 'regra'],
    description: 'Descubra o resultado da regra secreta entre dois números',
    async execute(message, args) {
        const stake = flocos.parseBet(args[0], flocos.get(message.author.id)) || 100;
        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);

        const a = 2 + Math.floor(Math.random() * 20);
        const b = 2 + Math.floor(Math.random() * 20);

        const rules = [
            { name: 'soma', fn: (x, y) => x + y },
            { name: 'diferença', fn: (x, y) => Math.abs(x - y) },
            { name: 'produto', fn: (x, y) => x * y },
            { name: 'máximo', fn: (x, y) => Math.max(x, y) },
            { name: 'mínimo', fn: (x, y) => Math.min(x, y) },
            { name: 'soma dos dígitos do produto', fn: (x, y) => String(x * y).split('').reduce((s, d) => s + Number(d), 0) }
        ];

        const rule = rules[Math.floor(Math.random() * rules.length)];
        const answer = rule.fn(a, b);

        // 4 opções
        const opts = new Set([answer]);
        while (opts.size < 4) {
            const noise = answer + Math.floor(Math.random() * 17) - 8;
            if (noise !== answer && noise >= 0) opts.add(noise);
        }
        const options = [...opts].sort(() => Math.random() - 0.5);

        const embed = new EmbedBuilder()
            .setColor(0xd946ef)
            .setTitle('🔗 SINCRONIA')
            .setDescription(
                `Números: **${a}** e **${b}**\n` +
                    `Uma **regra secreta** liga os dois.\n` +
                    `Qual é o resultado?\n` +
                    `Aposta: ${flocos.format(stake)} → acerto **2,5x**`
            );

        const row = new ActionRowBuilder().addComponents(
            options.map((v, i) =>
                new ButtonBuilder()
                    .setCustomId(`sync_${message.id}_${v}`)
                    .setLabel(String(v))
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        const sent = await message.reply({ embeds: [embed], components: [row] });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 20000,
            filter: (i) => i.user.id === message.author.id,
            max: 1
        });

        collector.on('collect', async (i) => {
            const pick = parseInt(i.customId.split('_').pop(), 10);
            const ok = pick === answer;
            if (ok) {
                const win = Math.floor(stake * 2.5);
                flocos.add(message.author.id, win);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('🔗 Sincronizado')
                            .setDescription(
                                `Regra: **${rule.name}** → **${answer}**\n${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: []
                });
            } else {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('🔗 Dessincronizado')
                            .setDescription(
                                `Você: **${pick}** · Certo: **${answer}** (${rule.name})\nPerdeu ${flocos.format(stake)}`
                            )
                    ],
                    components: []
                });
            }
        });

        collector.on('end', async (c) => {
            if (c.size > 0) return;
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('⏰ Tempo')
                            .setDescription(`Resposta: **${answer}** (${rule.name})`)
                    ],
                    components: []
                });
            } catch (_) {}
        });
    }
};
