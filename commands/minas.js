const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const cristais = require('../utils/cristais');
const { againRow } = require('../utils/gameAgain');

/** 5 cols × 4 rows + 1 control = 5 rows (limite Discord) */
const COLS = 5;
const TILE_ROWS = 4;
const TILE_TOTAL = COLS * TILE_ROWS;
const BOMB_COUNT = 6;

module.exports = {
    name: 'minas',
    aliases: ['mines', 'campo'],
    description: 'Campo minado 5×4 com 💠 cristais',
    async execute(message, args) {
        const stakeRaw = args[0];
        const stake = cristais.parseBet(stakeRaw, cristais.get(message.author.id));
        if (!stake) {
            return message.reply('Uso: `O.minas <valor>` — 💠 cristais. Ex: `O.minas 1,5k`');
        }

        const check = cristais.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        cristais.add(message.author.id, -stake);

        const bombs = new Set();
        while (bombs.size < BOMB_COUNT) bombs.add(Math.floor(Math.random() * TILE_TOTAL));

        const opened = new Set();
        let mult = 1;
        const multStep = 0.18;
        const againArgs = [String(stakeRaw || stake)];

        const buildPlay = () => {
            const rows = [];
            for (let r = 0; r < TILE_ROWS; r++) {
                const row = new ActionRowBuilder();
                for (let c = 0; c < COLS; c++) {
                    const i = r * COLS + c;
                    let label = '⬜';
                    let style = ButtonStyle.Secondary;
                    let disabled = false;
                    if (opened.has(i)) {
                        label = bombs.has(i) ? '💥' : '💎';
                        style = bombs.has(i) ? ButtonStyle.Danger : ButtonStyle.Success;
                        disabled = true;
                    }
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`mn_${message.author.id}_${i}`)
                            .setLabel(label)
                            .setStyle(style)
                            .setDisabled(disabled)
                    );
                }
                rows.push(row);
            }
            rows.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mn_cash_${message.author.id}`)
                        .setLabel(`💰 Sacar ×${mult.toFixed(2)}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(opened.size === 0),
                    new ButtonBuilder()
                        .setCustomId(`mn_info_${message.author.id}`)
                        .setLabel(`💠 ${Math.floor(stake * mult).toLocaleString('pt-BR')}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                )
            );
            return rows;
        };

        const buildEnd = () => [againRow('minas', message.author.id, againArgs)];

        const embed = () =>
            new EmbedBuilder()
                .setColor(0xf59e0b)
                .setTitle('💣 MINAS 5×4')
                .setDescription(
                    `Aposta: ${cristais.format(stake)}\n` +
                        `Bombas: **${bombs.size}** · Seguras: **${[...opened].filter((i) => !bombs.has(i)).length}**\n` +
                        `Multiplicador: **×${mult.toFixed(2)}** → ${cristais.formatPlain(Math.floor(stake * mult))}`
                );

        const sent = await message.reply({ embeds: [embed()], components: buildPlay() });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000,
            filter: (i) =>
                i.user.id === message.author.id &&
                (i.customId.startsWith(`mn_${message.author.id}`) ||
                    i.customId.startsWith(`mn_cash_${message.author.id}`) ||
                    i.customId.startsWith(`mn_info_`))
        });

        collector.on('collect', async (i) => {
            if (i.customId.startsWith('mn_info_')) {
                await i.deferUpdate();
                return;
            }

            if (i.customId.startsWith('mn_cash_')) {
                const win = Math.floor(stake * mult);
                cristais.add(message.author.id, win);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('💰 Saque')
                            .setDescription(
                                `×${mult.toFixed(2)} · ${cristais.format(win)}\nSaldo: ${cristais.formatPlain(cristais.get(message.author.id))}`
                            )
                    ],
                    components: buildEnd()
                });
                collector.stop('cash');
                return;
            }

            const idx = parseInt(i.customId.split('_').pop(), 10);
            if (Number.isNaN(idx) || opened.has(idx)) {
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
                            .setDescription(
                                `Perdeu ${cristais.format(stake)}.\nSaldo: ${cristais.formatPlain(cristais.get(message.author.id))}`
                            )
                    ],
                    components: buildEnd()
                });
                collector.stop('boom');
                return;
            }

            const safeCount = [...opened].filter((x) => !bombs.has(x)).length;
            mult = Math.round((1 + safeCount * multStep) * 100) / 100;

            if (safeCount >= TILE_TOTAL - bombs.size) {
                const win = Math.floor(stake * mult);
                cristais.add(message.author.id, win);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('💎 Campo limpo')
                            .setDescription(
                                `${cristais.format(win)}\nSaldo: ${cristais.formatPlain(cristais.get(message.author.id))}`
                            )
                    ],
                    components: buildEnd()
                });
                collector.stop('clear');
                return;
            }

            await i.update({ embeds: [embed()], components: buildPlay() });
        });

        collector.on('end', async (_, reason) => {
            if (['cash', 'boom', 'clear'].includes(reason)) return;
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('⏰ Tempo esgotado')
                            .setDescription(`Aposta ${cristais.format(stake)} perdida.`)
                    ],
                    components: buildEnd()
                });
            } catch (_) {}
        });
    }
};
