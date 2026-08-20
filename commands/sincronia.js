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
const { againRow } = require('../utils/gameAgain');

module.exports = {
    name: 'sincronia',
    aliases: ['sync', 'regra'],
    description: 'Regra secreta com ❄️ flocos',
    async execute(message, args) {
        const stakeRaw = args[0] || '100';
        const stake = flocos.parseBet(stakeRaw, flocos.get(message.author.id)) || 100;
        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);
        const againArgs = [String(stakeRaw)];

        const a = 2 + Math.floor(Math.random() * 20);
        const b = 2 + Math.floor(Math.random() * 20);
        const rules = [
            { name: 'soma', fn: (x, y) => x + y },
            { name: 'diferença', fn: (x, y) => Math.abs(x - y) },
            { name: 'produto', fn: (x, y) => x * y },
            { name: 'máximo', fn: (x, y) => Math.max(x, y) },
            { name: 'mínimo', fn: (x, y) => Math.min(x, y) }
        ];
        const rule = rules[Math.floor(Math.random() * rules.length)];
        const answer = rule.fn(a, b);

        const opts = new Set([answer]);
        while (opts.size < 4) {
            const noise = answer + Math.floor(Math.random() * 17) - 8;
            if (noise !== answer && noise >= 0) opts.add(noise);
        }
        const options = [...opts].sort(() => Math.random() - 0.5);

        const row = new ActionRowBuilder().addComponents(
            options.map((v) =>
                new ButtonBuilder()
                    .setCustomId(`sync_${message.author.id}_${v}`)
                    .setLabel(String(v))
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        const sent = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xd946ef)
                    .setTitle('🔗 SINCRONIA')
                    .setDescription(
                        `Números **${a}** e **${b}**. Qual o resultado da regra secreta?\n${flocos.format(stake)} → **2,5x**`
                    )
            ],
            components: [row]
        });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 20000,
            filter: (i) => i.user.id === message.author.id && i.customId.startsWith('sync_'),
            max: 1
        });

        collector.on('collect', async (i) => {
            const pick = parseInt(i.customId.split('_').pop(), 10);
            const ok = pick === answer;
            if (ok) {
                const win = Math.floor(stake * 2.5);
                flocos.add(message.author.id, win);
                xp.add(message.author.id, 12);
                cristais.add(message.author.id, 2);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('🔗 Certo')
                            .setDescription(
                                `Regra: **${rule.name}** = **${answer}**\n${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: [againRow('sincronia', message.author.id, againArgs)]
                });
            } else {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('🔗 Errado')
                            .setDescription(
                                `Certo: **${answer}** (${rule.name}). Perdeu ${flocos.format(stake)}.`
                            )
                    ],
                    components: [againRow('sincronia', message.author.id, againArgs)]
                });
            }
        });

        collector.on('end', async (c) => {
            if (c.size > 0) return;
            try {
                await sent.edit({
                    components: [againRow('sincronia', message.author.id, againArgs)]
                });
            } catch (_) {}
        });
    }
};
