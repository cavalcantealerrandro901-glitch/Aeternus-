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

const POOL = ['🔴', '🟢', '🔵', '🟡', '🟣', '⚪'];

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
                        `Memorize:\n# ${seq.join('  ')}\n\nSome em 3s… Aposta: ${flocos.format(stake)} → **2,5x**`
                    )
            ]
        });

        await new Promise((r) => setTimeout(r, 3000));

        const row = new ActionRowBuilder().addComponents(
            POOL.map((emoji, i) =>
                new ButtonBuilder()
                    .setCustomId(`eco_${message.author.id}_${i}`)
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
                        .setDescription(`Repita **${len}** cores.`)
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
            filter: (i) => i.user.id === message.author.id && i.customId.startsWith('eco_')
        });

        collector.on('collect', async (i) => {
            if (done) return;
            const idx = parseInt(i.customId.split('_').pop(), 10);
            player.push(POOL[idx]);
            const step = player.length - 1;

            if (player[step] !== seq[step]) {
                done = true;
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('🔮 Errou')
                            .setDescription(`Era ${seq.join('  ')}. Perdeu ${flocos.format(stake)}.`)
                    ],
                    components: [againRow('eco', message.author.id, againArgs)]
                });
                collector.stop('fail');
                return;
            }

            if (player.length === seq.length) {
                done = true;
                const win = Math.floor(stake * 2.5);
                flocos.add(message.author.id, win);
                xp.add(message.author.id, 12);
                cristais.add(message.author.id, 2);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('🔮 Eco perfeito')
                            .setDescription(
                                `${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: [againRow('eco', message.author.id, againArgs)]
                });
                collector.stop('win');
                return;
            }

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x8b5cf6)
                        .setTitle('🔮 ECO')
                        .setDescription(`Progresso: ${player.join('  ')}`)
                ],
                components: [row]
            });
        });

        collector.on('end', async (_, reason) => {
            if (['win', 'fail'].includes(reason) || done) return;
            try {
                await sent.edit({
                    components: [againRow('eco', message.author.id, againArgs)]
                });
            } catch (_) {}
        });
    }
};
