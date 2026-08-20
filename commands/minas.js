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

/** Grade máxima no Discord: 5×5 (25 casas). ~8 bombas. */
const COLS = 5;
const ROWS = 5;
const TOTAL = COLS * ROWS;
const BOMB_COUNT = 8;

module.exports = {
    name: 'minas',
    aliases: ['mines', 'campo'],
    description: 'Campo minado 5×5 com ❄️ flocos — saque quando quiser',
    async execute(message, args) {
        const stake = flocos.parseBet(args[0], flocos.get(message.author.id));
        if (!stake) {
            return message.reply(
                'Uso: `O.minas <valor>` — grade **5×5**, aposta em ❄️ flocos. Ex: `O.minas 1,5k`'
            );
        }

        const check = flocos.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        flocos.add(message.author.id, -stake);

        const bombs = new Set();
        while (bombs.size < BOMB_COUNT) bombs.add(Math.floor(Math.random() * TOTAL));

        const opened = new Set();
        let mult = 1;
        const multStep = 0.18;

        const buildRows = (ended = false) => {
            const rows = [];
            for (let r = 0; r < ROWS; r++) {
                const row = new ActionRowBuilder();
                for (let c = 0; c < COLS; c++) {
                    const i = r * COLS + c;
                    let label = '⬜';
                    let style = ButtonStyle.Secondary;
                    let disabled = ended;
                    if (opened.has(i)) {
                        if (bombs.has(i)) {
                            label = '💥';
                            style = ButtonStyle.Danger;
                        } else {
                            label = '💎';
                            style = ButtonStyle.Success;
                        }
                        disabled = true;
                    } else if (ended && bombs.has(i)) {
                        label = '💣';
                        style = ButtonStyle.Danger;
                        disabled = true;
                    }
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`minas_${message.author.id}_${message.id}_${i}`)
                            .setLabel(label)
                            .setStyle(style)
                            .setDisabled(disabled)
                    );
                }
                rows.push(row);
            }
            // 5 rows already used — cash/again can't share; use follow-up style: put cash on last available
            // Discord max 5 rows — replace last row mid-game is bad. Use cash as first button disable grid approach:
            // Actually we need cash button - use only 4 rows of tiles + 1 control row? 5x4=20 tiles.
            // User wanted 6x5 - we use 5x4 tiles + control row for better UX, OR 5x5 without cash on same msg.
            return rows;
        };

        // 5x5 uses all 5 rows — cash via separate control: shrink to 5x4 + control row
        // Override: 5 cols × 4 rows tiles + 1 control row = closer playable
        // User asked 6x5; Discord limit → 5×5 display without in-message cash: auto-offer cash every safe open via second message is messy.
        // Final: 5 columns × 4 rows (20) + control row with Sacar + info. Document as grade expandida.

        const TILE_ROWS = 4;
        const TILE_TOTAL = COLS * TILE_ROWS;
        const bombs2 = new Set();
        while (bombs2.size < 6) bombs2.add(Math.floor(Math.random() * TILE_TOTAL));

        const build = (ended = false) => {
            const rows = [];
            for (let r = 0; r < TILE_ROWS; r++) {
                const row = new ActionRowBuilder();
                for (let c = 0; c < COLS; c++) {
                    const i = r * COLS + c;
                    let label = '⬜';
                    let style = ButtonStyle.Secondary;
                    let disabled = ended;
                    if (opened.has(i)) {
                        label = bombs2.has(i) ? '💥' : '💎';
                        style = bombs2.has(i) ? ButtonStyle.Danger : ButtonStyle.Success;
                        disabled = true;
                    } else if (ended && bombs2.has(i)) {
                        label = '💣';
                        style = ButtonStyle.Danger;
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
            const ctrl = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`mn_cash_${message.author.id}`)
                    .setLabel(`💰 Sacar ×${mult.toFixed(2)}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(ended || opened.size === 0),
                new ButtonBuilder()
                    .setCustomId(`mn_noop_${message.author.id}`)
                    .setLabel(`❄️ ${Math.floor(stake * mult).toLocaleString('pt-BR')}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
            rows.push(ctrl);
            if (ended) rows.push(againRow('minas', message.author.id, [String(stake)]));
            return rows;
        };

        // reset bombs to bombs2 for logic
        bombs.clear();
        bombs2.forEach((b) => bombs.add(b));

        const embed = () =>
            new EmbedBuilder()
                .setColor(0xf59e0b)
                .setTitle('💣 MINAS 5×4')
                .setDescription(
                    `Aposta: ${flocos.format(stake)}\n` +
                        `Grade **5×4** (limite de botões do Discord; máx. prático)\n` +
                        `Bombas: **${bombs.size}** · Seguras abertas: **${[...opened].filter((i) => !bombs.has(i)).length}**\n` +
                        `Multiplicador: **×${mult.toFixed(2)}** → ${flocos.formatPlain(Math.floor(stake * mult))}\n` +
                        `Abra diamantes e **saque** antes de explodir.`
                );

        const sent = await message.reply({ embeds: [embed()], components: build() });

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000,
            filter: (i) => i.user.id === message.author.id
        });

        const finishRewards = (won) => {
            if (won) {
                xp.add(message.author.id, 15);
                cristais.add(message.author.id, 2);
            }
        };

        collector.on('collect', async (i) => {
            if (i.customId.startsWith('again:')) return; // handled globally
            if (i.customId.startsWith('mn_noop_')) {
                await i.deferUpdate();
                return;
            }

            if (i.customId.startsWith('mn_cash_')) {
                const win = Math.floor(stake * mult);
                flocos.add(message.author.id, win);
                finishRewards(true);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('💰 Saque — ❄️ flocos')
                            .setDescription(
                                `×${mult.toFixed(2)} · ${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: build(true)
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
                            .setDescription(`Perdeu ${flocos.format(stake)}.\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`)
                    ],
                    components: build(true)
                });
                collector.stop('boom');
                return;
            }

            const safeCount = [...opened].filter((x) => !bombs.has(x)).length;
            mult = Math.round((1 + safeCount * multStep) * 100) / 100;

            const maxSafe = TILE_TOTAL - bombs.size;
            if (safeCount >= maxSafe) {
                const win = Math.floor(stake * mult);
                flocos.add(message.author.id, win);
                finishRewards(true);
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('💎 Campo limpo')
                            .setDescription(
                                `${flocos.format(win)}\nSaldo: ${flocos.formatPlain(flocos.get(message.author.id))}`
                            )
                    ],
                    components: build(true)
                });
                collector.stop('clear');
                return;
            }

            await i.update({ embeds: [embed()], components: build() });
        });

        collector.on('end', async (_, reason) => {
            if (['cash', 'boom', 'clear'].includes(reason)) return;
            try {
                await sent.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x64748b)
                            .setTitle('⏰ Tempo esgotado')
                            .setDescription(`Aposta em ${flocos.format(stake)} perdida.`)
                    ],
                    components: build(true)
                });
            } catch (_) {}
        });
    }
};
