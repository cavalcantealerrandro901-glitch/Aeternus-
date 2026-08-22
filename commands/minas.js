const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const cristais = require('../utils/cristais');
const { againRow } = require('../utils/gameAgain');

/**
 * Discord = máx 5 action rows.
 * 5×5 grid = 5 rows de tiles; saque via reação 💰 (não cabe 6ª row).
 */
const COLS = 5;
const TILE_ROWS = 5;
const TILE_TOTAL = COLS * TILE_ROWS; // 25
const BOMB_COUNT = 5;

/** Multiplicador cresce mais a cada casa segura aberta */
function calcMult(safeCount) {
    // curva: 1 + 0.12*n + 0.04*n²/2  → sobe mais nas casas finais
    let m = 1;
    for (let i = 1; i <= safeCount; i++) {
        const step = 0.12 + i * 0.035; // cada próxima casa vale mais
        m += step;
    }
    return Math.round(m * 100) / 100;
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'campo'],
    description: 'Campo minado 5×5 com 💠 cristais',
    async execute(message, args) {
        const stakeRaw = args[0];
        const stake = cristais.parseBet(stakeRaw, cristais.get(message.author.id));
        if (!stake) {
            return message.reply(
                'Uso: `O.minas <valor>` — 💠 cristais · grade **5×5**\n' +
                    'Abra diamantes · reaja com 💰 para **sacar**'
            );
        }

        const check = cristais.canBet(message.author.id, stake);
        if (!check.ok) return message.reply(check.error);

        cristais.add(message.author.id, -stake);

        const bombs = new Set();
        while (bombs.size < BOMB_COUNT) bombs.add(Math.floor(Math.random() * TILE_TOTAL));

        const opened = new Set();
        let mult = 1;
        let finished = false;
        const againArgs = [String(stakeRaw || stake)];

        const buildGrid = () => {
            const rows = [];
            for (let r = 0; r < TILE_ROWS; r++) {
                const row = new ActionRowBuilder();
                for (let c = 0; c < COLS; c++) {
                    const i = r * COLS + c;
                    let label = '⬜';
                    let style = ButtonStyle.Secondary;
                    let disabled = finished;
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
            return rows;
        };

        const buildEnd = () => [againRow('minas', message.author.id, againArgs)];

        const embed = (extra = '') =>
            new EmbedBuilder()
                .setColor(0xf59e0b)
                .setTitle('💣 MINAS 5×5')
                .setDescription(
                    `Aposta: ${cristais.format(stake)}\n` +
                        `Bombas: **${BOMB_COUNT}** · Seguras: **${[...opened].filter((i) => !bombs.has(i)).length}**\n` +
                        `Multiplicador: **×${mult.toFixed(2)}** → ${cristais.formatPlain(Math.floor(stake * mult))}\n` +
                        (finished
                            ? extra
                            : '\n💰 **Reaja com 💰 nesta mensagem para sacar.**')
                );

        const sent = await message.reply({ embeds: [embed()], components: buildGrid() });

        try {
            await sent.react('💰');
        } catch (_) {}

        const endGame = async (reason, embedData, components) => {
            if (finished) return;
            finished = true;
            collector.stop(reason);
            reactCollector.stop(reason);
            try {
                await sent.edit({ embeds: [embedData], components });
            } catch (_) {}
        };

        const doCash = async (user) => {
            if (finished) return;
            if (user.id !== message.author.id) return;
            const safeCount = [...opened].filter((x) => !bombs.has(x)).length;
            if (safeCount < 1) {
                await message.channel
                    .send({ content: `${message.author} Abra pelo menos **1** diamante antes de sacar.` })
                    .then((m) => setTimeout(() => m.delete().catch(() => {}), 4000))
                    .catch(() => {});
                return;
            }
            const win = Math.floor(stake * mult);
            cristais.add(message.author.id, win);
            await endGame(
                'cash',
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('💰 Saque')
                    .setDescription(
                        `×${mult.toFixed(2)} · ${cristais.format(win)}\nSaldo: ${cristais.formatPlain(cristais.get(message.author.id))}`
                    ),
                buildEnd()
            );
        };

        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 180000,
            filter: (i) => i.user.id === message.author.id && i.customId.startsWith(`mn_${message.author.id}_`)
        });

        const reactCollector = sent.createReactionCollector({
            filter: (reaction, user) =>
                !user.bot && user.id === message.author.id && reaction.emoji.name === '💰',
            time: 180000
        });

        reactCollector.on('collect', async (reaction, user) => {
            await doCash(user);
        });

        collector.on('collect', async (i) => {
            if (finished) {
                await i.deferUpdate().catch(() => {});
                return;
            }

            const idx = parseInt(i.customId.split('_').pop(), 10);
            if (Number.isNaN(idx) || opened.has(idx)) {
                await i.deferUpdate().catch(() => {});
                return;
            }
            opened.add(idx);

            if (bombs.has(idx)) {
                // revela bombas
                for (const b of bombs) opened.add(b);
                finished = true;
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
                reactCollector.stop('boom');
                return;
            }

            const safeCount = [...opened].filter((x) => !bombs.has(x)).length;
            mult = calcMult(safeCount);

            if (safeCount >= TILE_TOTAL - BOMB_COUNT) {
                const win = Math.floor(stake * mult);
                cristais.add(message.author.id, win);
                finished = true;
                await i.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x22c55e)
                            .setTitle('💎 Campo limpo!')
                            .setDescription(
                                `×${mult.toFixed(2)} · ${cristais.format(win)}\nSaldo: ${cristais.formatPlain(cristais.get(message.author.id))}`
                            )
                    ],
                    components: buildEnd()
                });
                collector.stop('clear');
                reactCollector.stop('clear');
                return;
            }

            await i.update({ embeds: [embed()], components: buildGrid() });
        });

        collector.on('end', async (_, reason) => {
            if (['cash', 'boom', 'clear'].includes(reason) || finished) return;
            finished = true;
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
