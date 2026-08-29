const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

/** 5 colunas × 4 linhas = 20 casas */
const COLS = 5;
const ROWS = 4;
const TOTAL = COLS * ROWS;
const MAX_BOMBS = 18;

const games = new Map();

function mult(opened, bombs) {
    if (opened <= 0) return 1;
    return Number((1 + opened * (0.28 + bombs * 0.035)).toFixed(2));
}

function potential(game) {
    if (game.fun || !game.amount) return 0;
    return Math.floor(game.amount * mult(game.opened.size, game.bombCount));
}

function panelEmbed(game, extra) {
    const m = mult(game.opened.size, game.bombCount);
    const pot = potential(game);
    const safeLeft = TOTAL - game.bombCount - game.opened.size;

    let status = '🟢 Em jogo';
    if (game.dead) status = '💥 Explodiu';
    if (game.cashed) status = game.fun ? '🏁 Encerrado' : '💰 Sacado';

    const modeLine = game.fun
        ? '🎮 **Modo diversão** · sem apostas'
        : `💠 Aposta **${fmt(game.amount)}**`;

    let cashLine = '_Abra casas ou use **Aleatório**._';
    if (game.opened.size > 0 && !game.dead && !game.cashed) {
        cashLine = game.fun
            ? '_Modo diversão · use **Encerrar** quando quiser._'
            : `💵 Saque disponível: 💠 **${fmt(pot)}** · ×**${m}**`;
    }

    return new EmbedBuilder()
        .setColor(game.dead ? C.lose : game.cashed ? C.win : C.info)
        .setTitle('💎  Mines 5×4')
        .setDescription(
            [
                `**MINES PANEL** · ${status}`,
                '',
                modeLine,
                `💣 Minas **${game.bombCount}** · 💎 Abertas **${game.opened.size}** · Seguras restantes **${Math.max(0, safeLeft)}**`,
                !game.fun ? `📈 Multiplicador **×${m}**` : null,
                cashLine,
                extra ? `\n${extra}` : null
            ]
                .filter((x) => x != null && x !== '')
                .join('\n')
        )
        .setFooter({
            text: game.fun
                ? 'Diversão · O.mines <1-18>  |  Apostas · O.mines <bombas> <valor>'
                : betFooter()
        })
        .setTimestamp();
}

function boardRows(game, { reveal = false } = {}) {
    const rows = [];
    const ended = game.dead || game.cashed || reveal;

    for (let y = 0; y < ROWS; y++) {
        const row = new ActionRowBuilder();
        for (let x = 0; x < COLS; x++) {
            const i = y * COLS + x;
            const num = i + 1;
            const opened = game.opened.has(i);
            const bomb = game.bombs.has(i);

            let label = '·';
            let style = ButtonStyle.Secondary;

            if (ended) {
                if (bomb) {
                    label = `💣${num}`;
                    style = ButtonStyle.Danger;
                } else if (opened) {
                    label = `💎${num}`;
                    style = ButtonStyle.Success;
                } else {
                    label = String(num);
                    style = ButtonStyle.Secondary;
                }
            } else if (opened) {
                label = '💎';
                style = ButtonStyle.Success;
            }

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`minas:cell:${game.id}:${i}`)
                    .setLabel(label.slice(0, 80))
                    .setStyle(style)
                    .setDisabled(ended || opened)
            );
        }
        rows.push(row);
    }
    return rows;
}

function controlRow(game) {
    const ended = game.dead || game.cashed;
    const pot = potential(game);
    const canCash = game.opened.size > 0 && !ended;

    let cashLabel = game.fun ? 'Encerrar' : 'Sacar';
    if (canCash && !game.fun) cashLabel = `Sacar ${fmt(pot)}`;

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`minas:random:${game.id}`)
            .setLabel('Aleatório')
            .setEmoji('🎲')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(ended),
        new ButtonBuilder()
            .setCustomId(`minas:refresh:${game.id}`)
            .setLabel('Atualizar')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false),
        new ButtonBuilder()
            .setCustomId(`minas:cash:${game.id}`)
            .setLabel(cashLabel.slice(0, 80))
            .setEmoji(game.fun ? '🏁' : '💵')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!canCash && !game.fun ? true : ended)
    );
}

function fullComponents(game, reveal = false) {
    return [...boardRows(game, { reveal }), controlRow(game)];
}

function makeGame(userId, amount, bombCount, fun) {
    const id = `${userId}_${Date.now()}`;
    const bombs = new Set();
    const maxBombs = Math.min(Math.max(1, bombCount), MAX_BOMBS, TOTAL - 1);
    while (bombs.size < maxBombs) bombs.add(Math.floor(Math.random() * TOTAL));
    const g = {
        id,
        userId,
        amount: fun ? 0 : amount,
        fun: !!fun,
        bombCount: maxBombs,
        bombs,
        opened: new Set(),
        dead: false,
        cashed: false
    };
    games.set(id, g);
    return g;
}

function openCell(game, idx) {
    if (game.dead || game.cashed || game.opened.has(idx)) return { ok: false };
    if (game.bombs.has(idx)) {
        game.dead = true;
        return { ok: true, bomb: true };
    }
    game.opened.add(idx);
    if (game.opened.size >= TOTAL - game.bombCount) {
        game.cashed = true;
        let win = 0;
        if (!game.fun && game.amount > 0) {
            win = potential(game);
            cristais.add(game.userId, win);
        }
        return { ok: true, bomb: false, autoWin: true, win };
    }
    return { ok: true, bomb: false };
}

function pickRandom(game) {
    const safe = [];
    const any = [];
    for (let i = 0; i < TOTAL; i++) {
        if (game.opened.has(i)) continue;
        any.push(i);
        if (!game.bombs.has(i)) safe.push(i);
    }
    const pool = safe.length ? safe : any;
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mine', 'campo'],
    description: 'Mines 5×4 — bombas primeiro; só número = diversão',
    async execute(message, args) {
        /*
          Uso:
            O.mines <1-18>              → diversão (sem aposta)
            O.mines <1-18> <valor|all|half> → aposta
        */
        const bombsRaw = parseInt(args[0], 10);
        if (!Number.isFinite(bombsRaw) || bombsRaw < 1 || bombsRaw > MAX_BOMBS) {
            return message.reply(
                [
                    '💣 **Mines 5×4**',
                    '',
                    '🎮 Diversão (sem aposta):',
                    '`O.mines <1-18>`',
                    '',
                    '💠 Com aposta:',
                    '`O.mines <bombas 1-18> <valor|all|half|k|m>`',
                    '',
                    'Ex.: `O.mines 5` · `O.mines 7 10k` · `O.mines 3 half`'
                ].join('\n')
            );
        }

        const bombCount = Math.min(MAX_BOMBS, bombsRaw);
        const amountArg = args[1];

        // só bombas → diversão
        if (amountArg == null || amountArg === '') {
            const game = makeGame(message.author.id, 0, bombCount, true);
            return message.reply({
                embeds: [panelEmbed(game, '_Boa sorte · modo diversão!_')],
                components: fullComponents(game)
            });
        }

        const bet = resolveBet(amountArg, cristais.get(message.author.id), { label: '💠' });
        if (!bet.ok) return message.reply(`❌ ${bet.error}`);

        cristais.remove(message.author.id, bet.amount);
        const game = makeGame(message.author.id, bet.amount, bombCount, false);

        await message.reply({
            embeds: [panelEmbed(game)],
            components: fullComponents(game)
        });
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const game = games.get(parts[2]);

        if (!game) {
            return interaction.reply({
                content: '⏱️ Jogo expirado. Use o comando de novo.',
                ephemeral: true
            });
        }
        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: 'Não é o seu Mines.', ephemeral: true });
        }

        if (action === 'refresh') {
            const reveal = game.dead || game.cashed;
            return interaction.update({
                embeds: [panelEmbed(game, reveal ? null : '_Painel atualizado._')],
                components: fullComponents(game, reveal)
            });
        }

        if (action === 'random') {
            if (game.dead || game.cashed) {
                return interaction.reply({ content: 'Jogo encerrado.', ephemeral: true });
            }
            const idx = pickRandom(game);
            if (idx == null) {
                return interaction.reply({ content: 'Nenhuma casa disponível.', ephemeral: true });
            }
            const res = openCell(game, idx);
            if (res.bomb) {
                return interaction.update({
                    embeds: [panelEmbed(game, `Aleatório · casa **#${idx + 1}** era mina.`)],
                    components: fullComponents(game, true)
                });
            }
            if (res.autoWin) {
                const msg = game.fun
                    ? 'Campo limpo · modo diversão!'
                    : `Campo limpo! +💠 **${fmt(res.win)}**`;
                return interaction.update({
                    embeds: [panelEmbed(game, msg)],
                    components: fullComponents(game, true)
                });
            }
            return interaction.update({
                embeds: [panelEmbed(game, `Aleatório abriu **#${idx + 1}**.`)],
                components: fullComponents(game)
            });
        }

        if (action === 'cash') {
            if (game.dead || game.cashed) {
                return interaction.reply({ content: 'Indisponível.', ephemeral: true });
            }

            // diversão: pode encerrar a qualquer momento (ou com casas abertas)
            if (game.fun) {
                game.cashed = true;
                return interaction.update({
                    embeds: [panelEmbed(game, 'Partida de diversão encerrada.')],
                    components: fullComponents(game, true)
                });
            }

            if (!game.opened.size) {
                return interaction.reply({
                    content: 'Abra pelo menos uma casa antes de sacar.',
                    ephemeral: true
                });
            }
            game.cashed = true;
            const win = potential(game);
            cristais.add(game.userId, win);
            return interaction.update({
                embeds: [
                    panelEmbed(
                        game,
                        `Saque de 💠 **${fmt(win)}** · Saldo: 💠 **${fmt(cristais.get(game.userId))}**`
                    )
                ],
                components: fullComponents(game, true)
            });
        }

        if (action === 'cell') {
            if (game.dead || game.cashed) return interaction.deferUpdate().catch(() => {});
            const idx = parseInt(parts[3], 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= TOTAL) {
                return interaction.reply({ content: 'Casa inválida.', ephemeral: true });
            }
            if (game.opened.has(idx)) return interaction.deferUpdate().catch(() => {});

            const res = openCell(game, idx);
            if (res.bomb) {
                return interaction.update({
                    embeds: [panelEmbed(game, `Casa **#${idx + 1}** era mina.`)],
                    components: fullComponents(game, true)
                });
            }
            if (res.autoWin) {
                const msg = game.fun
                    ? 'Campo limpo · modo diversão!'
                    : `Campo limpo! +💠 **${fmt(res.win)}**`;
                return interaction.update({
                    embeds: [panelEmbed(game, msg)],
                    components: fullComponents(game, true)
                });
            }
            return interaction.update({
                embeds: [panelEmbed(game)],
                components: fullComponents(game)
            });
        }
    }
};
