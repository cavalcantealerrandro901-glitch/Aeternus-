const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const flocos = require('../utils/flocos');

/** MINAS — 5 casas, 2 bombas; cada casa segura aumenta o multiplicador; saque quando quiser */
module.exports = {
    name: 'minas',
    aliases: ['mines', 'campo'],
    description: 'Campo minado 1 linha: multiplique ou exploda',
    async execute(message, args) {
        const stake = flocos.parseBet(args[0], flocos.get(message.author.id));
        if (!stake) return message.reply('Uso: `O.minas <valor>` — abra casas sem bomba e saque a tempo.');

        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);

        const bombs = new Set();
        while (bombs.size < 2) bombs.add(Math.floor(Math.random() * 5));

        const opened = new Set();
        let mult = 1;

        const multipliers = [1.3, 1.7, 2.3, 3.2, 4.5];

        const buildRow = (ended = false) => {
            const tiles = new ActionRowBuilder().addComponents(
                [0, 1, 2, 3, 4].map((i) => {
                    let label = '⬜';
                    let style = ButtonStyle.Secondary;
                    let disabled = ended;
                    if (opened.has(i)) {
                        label = bombs.has(i) ? '💥' : '💎';
                        style = bombs.has(i) ? ButtonStyle.Danger : ButtonStyle.Success;
                        disabled = true;
                    } else if (ended && bombs.has(i)) {
                        label = '💣';
                        style = ButtonStyle.Danger;
                        disabled = true;
                    }
                    return new ButtonBuilder()
                        .setCustomId(`minas_${message.id}_${i}`)
                        .setLabel(label)
                        .setStyle(style)
                        .setDisabled(disabled);
                })
            );
            const cash = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`minas_cash_${message.id}`)
                    .setLabel(`💰 Sacar ×${mult.toFixed(2)}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(ended || opened.size === 0)
            );
            return [tiles, cash];
        };

        const embed = () =>
            new EmbedBuilder()
                .setColor(0xf59e0b)
                .setTitle('💣 MINAS')
                .setDescription(
                    `Aposta: ${flocos.format(stake)}\n` +
                        `Casas seguras: **${[...opened].filter((i) => !bombs.has(i)).length}/3**\n` +
                        `Multiplicador: **×${mult.toFixed(2)}** → ${flocos.formatPlain(Math.floor(stake * mult))}\n` +
                        `Há **2 bombas**. Abra diamantes e **saque** antes de explodir.`
                );

        const sent = await message.reply({ embeds: [embed()], components: buildRow() });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
            filter: (i) => i.user.id === message.author.id
        });

        collector.on('collect', async (i) => {
            if (i.customId.startsWith(`minas_cash_`)) {
                const win = Math.floor(stake * mult);
                flocos.add(message.author.id, win);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('💰 Saque feito')
                            .setDescription(
                                `Multiplicador ×${mult.toFixed(2)}\nRecebeu ${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: buildRow(true)
                });
                collector.stop('cash');
                return;
            }

            const idx = parseInt(i.customId.split('_').pop(), 10);
            if (opened.has(idx)) {
                await i.deferUpdate();
                return;
            }
            opened.add(idx);

            if (bombs.has(idx)) {
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xef4444)
                            .setTitle('💥 Explodiu')
                            .setDescription(`Bomba na casa **#${idx + 1}**. Perdeu ${flocos.format(stake)}.`)
                    ],
                    components: buildRow(true)
                });
                collector.stop('boom');
                return;
            }

            const safeCount = [...opened].filter((x) => !bombs.has(x)).length;
            mult = multipliers[Math.min(safeCount - 1, multipliers.length - 1)];

            if (safeCount >= 3) {
                const win = Math.floor(stake * mult);
                flocos.add(message.author.id, win);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('💎 Campo limpo')
                            .setDescription(
                                `Abriu todas as casas seguras! ×${mult.toFixed(2)}\n${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: buildRow(true)
                });
                collector.stop('clear');
                return;
            }

            await i.update({ embeds: [embed()], components: buildRow() });
        });

        collector.on('end', async (_, reason) => {
            if (['cash', 'boom', 'clear'].includes(reason)) return;
            // timeout: auto-loss of remaining stake already deducted
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('⏰ Tempo esgotado')
                            .setDescription('Não sacou a tempo. Aposta perdida.')
                    ],
                    components: buildRow(true)
                });
            } catch (_) {}
        });
    }
};
