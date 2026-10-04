const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter } = require('../utils/gameStyle');

const COLS = 4;
const ROWS = 4;
const TOTAL = COLS * ROWS;
const MAX_BOMBS = 11;
const HOUSE = 0.95;
const IDLE_MS = 7 * 60 * 1000;
const BOMB_CHANCE = 0.26;

const games = new Map();
const processing = new Set();

let matchCounter = 0;

function opensBeforeMult(bombs) {
    const b = Math.max(1, Math.min(Number(bombs) || 1, MAX_BOMBS));
    return Math.max(1, 8 - b);
}

function multAt(opened, bombs) {
    const o = Math.max(0, Math.floor(Number(opened) || 0));

    if (o <= 0) return 1;

    const b = Math.max(
        1,
        Math.min(Number(bombs) || 1, TOTAL - 1)
    );

    const threshold = opensBeforeMult(b);

    let m = 1;

    for (let i = 0; i < o; i++) {
        const tilesLeft = TOTAL - i;
        const safeLeft = TOTAL - b - i;

        if (safeLeft <= 0 || tilesLeft <= 0) break;

        const riskBoost = 1 + (b - 1) * 0.08;

        m *= (tilesLeft / safeLeft) * riskBoost;
    }

    m *= HOUSE;

    if (o < threshold) {
        const t = o / threshold;

        m =
            1 +
            (Math.max(m, 1) - 1) *
                t *
                0.15;

        return Number(
            Math.max(1, m).toFixed(2)
        );
    }

    return Number(
        Math.max(1.05, m).toFixed(2)
    );
}

function potentialAt(amount, opened, bombs) {
    const amt = Math.floor(Number(amount) || 0);
    const o = Math.floor(Number(opened) || 0);

    if (amt <= 0 || o <= 0) return 0;

    return Math.max(
        0,
        Math.floor(
            amt * multAt(o, bombs)
        )
    );
}

function clearTimer(game) {
    if (game._timer) {
        clearTimeout(game._timer);
        game._timer = null;
    }
}

function touch(game, client) {
    clearTimer(game);

    game._last = Date.now();

    game._timer = setTimeout(
        () => autoEnd(game, client).catch(() => {}),
        IDLE_MS
    );
}

async function autoEnd(game, client) {
    if (
        !games.has(game.id) ||
        game.dead ||
        game.cashed
    ) {
        return;
    }

    let note =
        '7 min sem interação — partida encerrada.';

    if (
        game.opened.size > 0 &&
        !game.fun &&
        game.amount > 0
    ) {
        const win = potentialAt(
            game.amount,
            game.opened.size,
            game.bombCount
        );

        game.cashed = true;
        game._lastWin = win;

        eter.add(
            game.userId,
            win,
            { reason: 'mines auto' }
        );

        note +=
            '\nSaque automático: ' +
            fmt(win) +
            ' ✨';
    } else if (
        game.opened.size > 0 &&
        game.fun
    ) {
        game.cashed = true;

        note +=
            '\nModo diversão encerrado.';
    } else {
        game.dead = true;

        if (!game.fun) {
            note +=
                '\nPrejuízo: ' +
                fmt(game.amount) +
                ' ✨';
        }
    }

    clearTimer(game);

    try {
        const ch =
            await client.channels
                .fetch(game.channelId)
                .catch(() => null);

        const msg = ch
            ? await ch.messages
                .fetch(game.messageId)
                .catch(() => null)
            : null;

        if (msg) {
            await msg.edit({
                content:
                    '<@' + game.userId + '>',
                embeds: [
                    panelEmbed(game)
                ],
                components:
                    fullComponents(game, true)
            }).catch(() => {});
        }
    } catch (_) {}
}

function resultBanner(game) {
    if (
        !game.dead &&
        !game.cashed
    ) {
        return null;
    }

    if (game.fun) {
        return game.dead
            ? 'Mina encontrada. Tente novamente.'
            : 'Campo encerrado no modo diversão.';
    }

    if (
        game.cashed &&
        !game.dead
    ) {
        const win =
            game._lastWin ||
            potentialAt(
                game.amount,
                game.opened.size,
                game.bombCount
            );

        return [
            'Você ganhou!',
            'Recebeu ' +
                fmt(win) +
                ' ✨',
            'Multiplicador ×' +
                multAt(
                    game.opened.size,
                    game.bombCount
                )
        ].join('\n');
    }

    return [
        'Você perdeu.',
        'Prejuízo de ' +
            fmt(game.amount) +
            ' ✨'
    ].join('\n');
}

function panelEmbed(game) {
    const opened = game.opened.size;
    const bombs = game.bombCount;

    const safeTotal =
        TOTAL - bombs;

    const remaining =
        Math.max(
            0,
            safeTotal - opened
        );

    const currentMult =
        multAt(
            opened,
            bombs
        );

    const nextMult =
        opened < safeTotal
            ? multAt(
                opened + 1,
                bombs
            )
            : currentMult;

    const nextGain =
        opened < safeTotal
            ? potentialAt(
                game.amount,
                opened + 1,
                bombs
            )
            : potentialAt(
                game.amount,
                opened,
                bombs
            );

    const explanation =
        'Aleatório escolhe uma casa ao acaso e Atualizar reorganiza o tabuleiro da partida.';

    const description = [
        'Aposta: ' +
            fmt(game.amount) +
            ' ✨',

        'Casas: 💣 ' +
            bombs +
            '  •  ' +
            remaining +
            '/' +
            safeTotal,

        'Multiplicador atual: ' +
            currentMult.toFixed(2) +
            'x',

        'Prox multi: ' +
            nextMult.toFixed(2) +
            'x  •  ' +
            fmt(nextGain) +
            ' ✨',

        '',

        explanation,

        '',

        'Partida #' +
            String(game.partida)
                .padStart(4, '0')
    ];

    const banner =
        resultBanner(game);

    if (banner) {
        description.push(
            '',
            banner
        );
    }

    return new EmbedBuilder()
        .setColor(
            game.dead
                ? 0xED4245
                : game.cashed
                    ? 0x57F287
                    : 0x5865F2
        )
        .setTitle(
            '✦ AETERNUS • MINES'
        )
        .setDescription(
            description.join('\n')
        )
        .setFooter({
            text:
                'Éter ✨ · AFK 7 min · ' +
                betFooter()
        });
}

function boardRows(game, reveal = false) {
    const ended =
        game.dead ||
        game.cashed ||
        reveal;

    const rows = [];

    for (
        let y = 0;
        y < ROWS;
        y++
    ) {
        const row =
            new ActionRowBuilder();

        for (
            let x = 0;
            x < COLS;
            x++
        ) {
            const i =
                y * COLS + x;

            const opened =
                game.opened.has(i);

            const bomb =
                game.bombs.has(i);

            let label = '❔';
            let style =
                ButtonStyle.Secondary;

            if (ended) {
                if (bomb) {
                    label = '💣';
                    style =
                        ButtonStyle.Danger;
                } else if (opened) {
                    label = '💎';
                    style =
                        ButtonStyle.Success;
                } else {
                    label = '❔';
                }
            } else if (opened) {
                label = '💎';
                style =
                    ButtonStyle.Success;
            }

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        'minas:cell:' +
                        game.id +
                        ':' +
                        i
                    )
                    .setLabel(label)
                    .setStyle(style)
                    .setDisabled(
                        ended || opened
                    )
            );
        }

        rows.push(row);
    }

    return rows;
}

function controlsRow(game) {
    const ended =
        game.dead ||
        game.cashed;

    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(
                    'minas:random:' +
                    game.id
                )
                .setLabel(
                    'Aleatório'
                )
                .setStyle(
                    ButtonStyle.Primary
                )
                .setDisabled(
                    ended
                ),

            new ButtonBuilder()
                .setCustomId(
                    'minas:refresh:' +
                    game.id
                )
                .setLabel(
                    'Atualizar'
                )
                .setStyle(
                    ButtonStyle.Secondary
                )
                .setDisabled(
                    ended
                )
        );
}

function cashRow(game) {
    const ended =
        game.dead ||
        game.cashed;

    const opened =
        game.opened.size;

    const value =
        opened > 0
            ? potentialAt(
                game.amount,
                opened,
                game.bombCount
            )
            : 0;

    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(
                    'minas:cash:' +
                    game.id
                )
                .setLabel(
                    game.fun
                        ? 'Encerrar'
                        : 'Sacar • ' +
                            fmt(value) +
                            ' ✨'
                )
                .setStyle(
                    ButtonStyle.Success
                )
                .setDisabled(
                    ended ||
                    (
                        !game.fun &&
                        opened <= 0
                    )
                )
        );
}

function fullComponents(
    game,
    reveal = false
) {
    const ended =
        game.dead ||
        game.cashed ||
        reveal;

    return [
        ...boardRows(
            game,
            ended
        ),

        controlsRow(game),

        cashRow(game)
    ];
}

function makeGame(
    userId,
    amount,
    bombCount,
    fun,
    meta = {}
) {
    const id =
        'm' +
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .slice(2, 8);

    const bombs =
        new Set();

    const maxBombs =
        Math.min(
            Math.max(
                1,
                bombCount
            ),
            MAX_BOMBS,
            TOTAL - 1
        );

    while (
        bombs.size <
        maxBombs
    ) {
        bombs.add(
            Math.floor(
                Math.random() *
                TOTAL
            )
        );
    }

    const g = {
        id,

        partida:
            ++matchCounter,

        userId,

        amount:
            fun ? 0 : amount,

        fun:
            !!fun,

        bombCount:
            maxBombs,

        bombs,

        opened:
            new Set(),

        dead: false,

        cashed: false,

        _lastWin: 0,

        channelId:
            meta.channelId ||
            null,

        messageId:
            meta.messageId ||
            null,

        _timer: null
    };

    games.set(
        id,
        g
    );

    return g;
}

function openCell(
    game,
    idx
) {
    if (
        game.dead ||
        game.cashed ||
        game.opened.has(idx)
    ) {
        return {
            ok: false
        };
    }

    if (
        game.bombs.has(idx)
    ) {
        game.dead = true;

        clearTimer(game);

        return {
            ok: true,
            bomb: true
        };
    }

    game.opened.add(idx);

    if (
        game.opened.size >=
        TOTAL - game.bombCount
    ) {
        game.cashed = true;

        clearTimer(game);

        let win = 0;

        if (
            !game.fun &&
            game.amount > 0
        ) {
            win =
                potentialAt(
                    game.amount,
                    game.opened.size,
                    game.bombCount
                );

            game._lastWin =
                win;

            eter.add(
                game.userId,
                win,
                {
                    reason:
                        'mines clear'
                }
            );
        }

        return {
            ok: true,
            bomb: false,
            autoWin: true,
            win
        };
    }

    return {
        ok: true,
        bomb: false
    };
}

function pickRandom(game) {
    const safe = [];
    const any = [];

    for (
        let i = 0;
        i < TOTAL;
        i++
    ) {
        if (
            game.opened.has(i)
        ) {
            continue;
        }

        any.push(i);

        if (
            !game.bombs.has(i)
        ) {
            safe.push(i);
        }
    }

    if (
        any.length > 0 &&
        game.bombs.size > 0 &&
        Math.random() <
            BOMB_CHANCE
    ) {
        const bombPool =
            any.filter(
                i =>
                    game.bombs.has(i)
            );

        if (
            bombPool.length > 0
        ) {
            return bombPool[
                Math.floor(
                    Math.random() *
                    bombPool.length
                )
            ];
        }
    }

    const pool =
        safe.length
            ? safe
            : any;

    return pool.length
        ? pool[
            Math.floor(
                Math.random() *
                pool.length
            )
        ]
        : null;
}

function endPayload(
    game
) {
    clearTimer(game);

    return {
        content:
            '<@' +
            game.userId +
            '>',

        embeds: [
            panelEmbed(game)
        ],

        components:
            fullComponents(
                game,
                true
            )
    };
}

module.exports = {
    name: 'minas',

    aliases: [
        'mines',
        'mine',
        'campo'
    ],

    description:
        'Mines 4×4 em Éter ✨',

    async execute(
        message,
        args,
        client
    ) {
        const bombsRaw =
            parseInt(
                args[0],
                10
            );

        if (
            !Number.isFinite(
                bombsRaw
            ) ||
            bombsRaw < 1 ||
            bombsRaw > MAX_BOMBS
        ) {
            return message.reply(
                [
                    'Mines 4×4',
                    '',
                    'Diversão: `O.minas <bombas>`',
                    'Aposta: `O.minas <bombas> <valor>`',
                    '',
                    'Bombas: 1 a 11',
                    'Grade: 4×4',
                    'Moeda: ✨ Éter'
                ].join('\n')
            );
        }

        let game;

        if (
            args[1] == null ||
            args[1] === ''
        ) {
            game =
                makeGame(
                    message.author.id,
                    0,
                    bombsRaw,
                    true
                );
        } else {
            const bet =
                resolveBet(
                    args[1],
                    eter.get(
                        message.author.id
                    ),
                    {
                        label: '✨'
                    }
                );

            if (!bet.ok) {
                return message.reply(
                    '❌ ' +
                    bet.error
                );
            }

            if (
                bet.amount <= 0
            ) {
                return message.reply(
                    '❌ Valor inválido.'
                );
            }

            eter.remove(
                message.author.id,
                bet.amount,
                {
                    reason:
                        'mines bet'
                }
            );

            game =
                makeGame(
                    message.author.id,
                    bet.amount,
                    bombsRaw,
                    false
                );
        }

        const msg =
            await message.reply({
                embeds: [
                    panelEmbed(game)
                ],
                components:
                    fullComponents(game)
            });

        game.channelId =
            msg.channel.id;

        game.messageId =
            msg.id;

        touch(
            game,
            client ||
            message.client
        );
    },

    async handleComponent(
        interaction
    ) {
        const parts =
            String(
                interaction.customId ||
                ''
            ).split(':');

        const action =
            parts[1];

        const gameId =
            parts[2];

        const game =
            games.get(gameId);

        const client =
            interaction.client;

        if (!game) {
            return interaction
                .reply({
                    content:
                        'Jogo expirado. Use `O.minas` novamente.',
                    ephemeral: true
                })
                .catch(() => {});
        }

        if (
            interaction.user.id !==
            game.userId
        ) {
            return interaction
                .reply({
                    content:
                        'Não é o seu Mines.',
                    ephemeral: true
                })
                .catch(() => {});
        }

        if (
            processing.has(gameId) &&
            action !== 'refresh'
        ) {
            return interaction
                .deferUpdate()
                .catch(() => {});
        }

        processing.add(
            gameId
        );

        try {
            if (
                (game.dead ||
                game.cashed) &&
                action !== 'refresh'
            ) {
                return interaction
                    .reply({
                        content:
                            'Jogo já encerrado.',
                        ephemeral: true
                    })
                    .catch(() => {});
            }

            touch(
                game,
                client
            );

            if (
                action === 'refresh'
            ) {
                return interaction
                    .update({
                        embeds: [
                            panelEmbed(game)
                        ],
                        components:
                            fullComponents(
                                game,
                                game.dead ||
                                game.cashed
                            )
                    })
                    .catch(() => {});
            }

            if (
                action === 'random'
            ) {
                const idx =
                    pickRandom(game);

                if (
                    idx == null
                ) {
                    return interaction
                        .reply({
                            content:
                                'Nenhuma casa livre.',
                            ephemeral: true
                        })
                        .catch(() => {});
                }

                const res =
                    openCell(
                        game,
                        idx
                    );

                if (
                    res.bomb ||
                    res.autoWin
                ) {
                    return interaction
                        .update(
                            endPayload(
                                game
                            )
                        )
                        .catch(() => {});
                }

                return interaction
                    .update({
                        embeds: [
                            panelEmbed(game)
                        ],
                        components:
                            fullComponents(game)
                    })
                    .catch(() => {});
            }

            if (
                action === 'cash'
            ) {
                if (
                    game.dead
                ) {
                    return interaction
                        .reply({
                            content:
                                'Jogo já acabou.',
                            ephemeral: true
                        })
                        .catch(() => {});
                }

                const opened =
                    game.opened.size;

                if (
                    opened <= 0
                ) {
                    return interaction
                        .reply({
                            content:
                                'Abra pelo menos uma casa antes de sacar.',
                            ephemeral: true
                        })
                        .catch(() => {});
                }

                if (
                    game.cashed
                ) {
                    return interaction
                        .update(
                            endPayload(
                                game
                            )
                        )
                        .catch(() => {});
                }

                game.cashed =
                    true;

                const win =
                    potentialAt(
                        game.amount,
                        opened,
                        game.bombCount
                    );

                if (
                    win <= 0
                ) {
                    game.cashed =
                        false;

                    return interaction
                        .reply({
                            content:
                                'Valor de saque inválido.',
                            ephemeral: true
                        })
                        .catch(() => {});
                }

                game._lastWin =
                    win;

                clearTimer(game);

                try {
                    eter.add(
                        game.userId,
                        win,
                        {
                            reason:
                                'mines cash'
                        }
                    );
                } catch (e) {
                    game.cashed =
                        false;

                    game._lastWin =
                        0;

                    return interaction
                        .reply({
                            content:
                                'Erro ao creditar o saque.',
                            ephemeral: true
                        })
                        .catch(() => {});
                }

                return interaction
                    .update(
                        endPayload(
                            game
                        )
                    )
                    .catch(() => {});
            }

            if (
                action === 'cell'
            ) {
                const idx =
                    parseInt(
                        parts[3],
                        10
                    );

                if (
                    Number.isNaN(
                        idx
                    ) ||
                    idx < 0 ||
                    idx >= TOTAL
                ) {
                    return interaction
                        .reply({
                            content:
                                'Casa inválida.',
                            ephemeral: true
                        })
                        .catch(() => {});
                }

                const res =
                    openCell(
                        game,
                        idx
                    );

                if (
                    res.bomb ||
                    res.autoWin
                ) {
                    return interaction
                        .update(
                            endPayload(
                                game
                            )
                        )
                        .catch(() => {});
                }

                return interaction
                    .update({
                        embeds: [
                            panelEmbed(game)
                        ],
                        components:
                            fullComponents(game)
                    })
                    .catch(() => {});
            }
        } finally {
            processing.delete(
                gameId
            );
        }
    }
};
