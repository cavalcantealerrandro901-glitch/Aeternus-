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

/** Máx. 5 botões por linha → 3 + 3 */
const POOL = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'];

module.exports = {
    name: 'eco',
    aliases: ['memoria', 'sequencia'],
    description: 'Memória de cores com ❄️ flocos',
    async execute(message, args) {
        const stakeRaw = args[0] || '150';
        const stake = flocos.parseBet(stakeRaw, flocos.get(message.author.id)) || 150;
        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);
        const againArgs = [String(stakeRaw)];

        const len = 3 + Math.floor(Math.random() * 2);
        const seq = Array.from({ length: len }, () => POOL[Math.floor(Math.random() * POOL.length)]);

        const sent = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setTitle('🔮 ECO')
                    .setDescription(
                        `Memorize a sequência:\n# ${seq.join('  ')}\n\nSome em **3 segundos**…\nAposta: ${flocos.format(stake)} → acerto **2,5x**`
                    )
            ],
            components: []
        });

        await new Promise((r) => setTimeout(r, 3000));

        // 2 rows × 3 botões (limite Discord OK)
        const row1 = new ActionRowBuilder().addComponents(
            POOL.slice(0, 3).map((emoji, i) =>
                new ButtonBuilder()
                    .setCustomId(`eco_${message.author.id}_${i}`)
                    .setLabel(emoji)
                    .setStyle(ButtonStyle.Secondary)
            )
        );
        const row2 = new ActionRowBuilder().addComponents(
            POOL.slice(3, 6).map((emoji, i) =>
                new ButtonBuilder()
                    .setCustomId(`eco_${message.author.id}_${i + 3}`)
                    .setLabel(emoji)
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        try {
            await sent.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x8b5cf6)
                        .setTitle('🔮 ECO — sua vez')
                        .setDescription(`Repita a sequência (**${len}** cores) na ordem.\nProgresso: _vazio_`)
                ],
                components: [row1, row2]
            });
        } catch (e) {
            console.error('eco edit:', e.message);
            flocos.add(message.author.id, stake);
            return;
        }

        const player = [];
        let done = false;

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 25000,
            filter: (i) =>
                i.user.id === message.author.id &&
                i.customId.startsWith(`eco_${message.author.id}_`)
        });

        collector.on('collect', async (i) => {
            if (done) {
                await i.deferUpdate().catch(() => {});
                return;
            }

            const idx = parseInt(i.customId.split('_').pop(), 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= POOL.length) {
                await i.deferUpdate().catch(() => {});
                return;
            }

            player.push(POOL[idx]);
            const step = player.length - 1;

            if (player[step] !== seq[step]) {
                done = true;
                await i
                    .update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0xef4444)
                                .setTitle('🔮 Sequência quebrada')
                                .setDescription(
                                    `Era: ${seq.join('  ')}\nVocê: ${player.join('  ')}\nPerdeu ${flocos.format(stake)}.`
                                )
                        ],
                        components: [againRow('eco', message.author.id, againArgs)]
                    })
                    .catch(() => {});
                collector.stop('fail');
                return;
            }

            if (player.length === seq.length) {
                done = true;
                const win = Math.floor(stake * 2.5);
                flocos.add(message.author.id, win);
                xp.add(message.author.id, 12);
                cristais.add(message.author.id, 2);
                await i
                    .update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x22c55e)
                                .setTitle('🔮 Eco perfeito')
                                .setDescription(
                                    `${seq.join('  ')}\n${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                                )
                        ],
                        components: [againRow('eco', message.author.id, againArgs)]
                    })
                    .catch(() => {});
                collector.stop('win');
                return;
            }

            await i
                .update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x8b5cf6)
                            .setTitle('🔮 ECO — sua vez')
                            .setDescription(
                                `Progresso: ${player.join('  ')}\nFaltam **${seq.length - player.length}**`
                            )
                    ],
                    components: [row1, row2]
                })
                .catch(() => {});
        });

        collector.on('end', async (_, reason) => {
            if (['win', 'fail'].includes(reason) || done) return;
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('⏰ Tempo')
                            .setDescription(`Sequência era: ${seq.join('  ')}\nPerdeu ${flocos.format(stake)}.`)
                    ],
                    components: [againRow('eco', message.author.id, againArgs)]
                });
            } catch (_) {}
        });
    }
};
