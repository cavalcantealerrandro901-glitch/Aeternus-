const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');

const POOL = ['🔴', '🟢', '🔵', '🟡', '🟣', '⚪'];

/** ECO — memoriza a sequência que pisca e repete na ordem */
module.exports = {
    name: 'eco',
    aliases: ['memoria', 'sequencia'],
    description: 'Memorize a sequência de cores e repita',
    async execute(message, args) {
        const stake = flocos.parseBet(args[0], flocos.get(message.author.id)) || 150;
        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);

        const len = 3 + Math.floor(Math.random() * 2); // 3 ou 4
        const seq = Array.from({ length: len }, () => POOL[Math.floor(Math.random() * POOL.length)]);

        const show = new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle('🔮 ECO')
            .setDescription(
                `Memorize:\n# ${seq.join('  ')}\n\nSome em **3s**… depois repita na ordem clicando.\nAposta: ${flocos.format(stake)} → acerto **2,5x**`
            );

        const sent = await message.reply({ embeds: [show], components: [] });
        await new Promise((r) => setTimeout(r, 3000));

        const row = new ActionRowBuilder().addComponents(
            POOL.map((emoji, i) =>
                new ButtonBuilder()
                    .setCustomId(`eco_${message.id}_${i}`)
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
                        .setDescription(
                            `Repita a sequência (**${len}** cores).\nProgresso: _vazio_`
                        )
                ],
                components: [row]
            });
        } catch {
            flocos.add(message.author.id, stake);
            return;
        }

        const player = [];
        let done = false;

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 20000,
            filter: (i) => i.user.id === message.author.id
        });

        collector.on('collect', async (i) => {
            if (done) return;
            const idx = parseInt(i.customId.split('_').pop(), 10);
            player.push(POOL[idx]);

            const progress = player.join('  ');
            const step = player.length - 1;

            if (player[step] !== seq[step]) {
                done = true;
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('🔮 Sequência quebrada')
                            .setDescription(
                                `Era: ${seq.join('  ')}\nVocê: ${progress}\nPerdeu ${flocos.format(stake)}`
                            )
                    ],
                    components: []
                });
                collector.stop('fail');
                return;
            }

            if (player.length === seq.length) {
                done = true;
                const win = Math.floor(stake * 2.5);
                flocos.add(message.author.id, win);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('🔮 Eco perfeito')
                            .setDescription(
                                `${seq.join('  ')}\n+${flocos.formatPlain(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: []
                });
                collector.stop('win');
                return;
            }

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x8b5cf6)
                        .setTitle('🔮 ECO — sua vez')
                        .setDescription(`Progresso: ${progress}\nFaltam **${seq.length - player.length}**`)
                ],
                components: [row]
            });
        });

        collector.on('end', async (_, reason) => {
            if (['win', 'fail'].includes(reason) || done) return;
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('⏰ Tempo')
                            .setDescription(`Sequência era: ${seq.join('  ')}`)
                    ],
                    components: []
                });
            } catch (_) {}
        });
    }
};
