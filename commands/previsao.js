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
    name: 'previsao',
    aliases: ['forecast', 'maior'],
    description: 'Maior/menor em cadeia com ❄️ flocos',
    async execute(message, args) {
        const stakeRaw = args[0];
        const stake = flocos.parseBet(stakeRaw, flocos.get(message.author.id));
        if (!stake) return message.reply('Uso: `O.previsao <valor>` — ❄️ flocos');

        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);
        const againArgs = [String(stakeRaw)];

        let current = 10 + Math.floor(Math.random() * 80);
        let mult = 1;
        let streak = 0;

        const controls = (ended = false) => {
            if (ended) return [againRow('previsao', message.author.id, againArgs)];
            return [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`prev_up_${message.author.id}`)
                        .setLabel('📈 Maior')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`prev_down_${message.author.id}`)
                        .setLabel('📉 Menor')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`prev_cash_${message.author.id}`)
                        .setLabel(`💰 Sacar ×${mult.toFixed(2)}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(streak === 0)
                )
            ];
        };

        const embed = () =>
            new EmbedBuilder()
                .setColor(0x06b6d4)
                .setTitle('📡 PREVISÃO')
                .setDescription(
                    `Número: **${current}** · Seq **${streak}** · ×**${mult.toFixed(2)}**\n` +
                        `Valor: ${flocos.formatPlain(Math.floor(stake * mult))}\nAposta base: ${flocos.format(stake)}`
                );

        const sent = await message.reply({ embeds: [embed()], components: controls() });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 45000,
            filter: (i) => i.user.id === message.author.id && !i.customId.startsWith('again:')
        });

        collector.on('collect', async (i) => {
            if (i.customId.startsWith('prev_cash_')) {
                const win = Math.floor(stake * mult);
                flocos.add(message.author.id, win);
                xp.add(message.author.id, 10 + streak);
                cristais.add(message.author.id, 1 + Math.floor(streak / 2));
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('💰 Saque')
                            .setDescription(
                                `×${mult.toFixed(2)} · ${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: controls(true)
                });
                collector.stop('cash');
                return;
            }

            const next = 1 + Math.floor(Math.random() * 99);
            const wantUp = i.customId.includes('_up_');
            const ok = wantUp ? next > current : next < current;

            if (!ok) {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('📉 Errou')
                            .setDescription(
                                `**${current}** → **${next}**\nPerdeu ${flocos.format(stake)}.`
                            )
                    ],
                    components: controls(true)
                });
                collector.stop('fail');
                return;
            }

            current = next;
            streak += 1;
            mult = Math.round((1 + streak * 0.45) * 100) / 100;
            await i.update({ embeds: [embed()], components: controls() });
        });

        collector.on('end', async (_, reason) => {
            if (['cash', 'fail'].includes(reason)) return;
            try {
                await sent.edit({ components: controls(true) });
            } catch (_) {}
        });
    }
};
