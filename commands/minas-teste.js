const {
    EmbedBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');

const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter } = require('../utils/gameStyle');

const COLS = 4;
const ROWS = 4;
const TOTAL = COLS * ROWS;
const MAX_BOMBS = 11;
const MIN_BET = 100;
const MAX_BET = 10_000_000;
const HOUSE = 0.96;
const MAX_MULT = 25000;
const IDLE_MS = 7 * 60 * 1000;
const BOMB_CHANCE = 0.26;

const games = new Map();
const processing = new Set();

let matchCounter = 0;

// Multiplicador clássico de Mines: risco justo × house edge
function multAt(opened, bombs) {
    const o = Math.max(0, Math.floor(Number(opened) || 0));
    if (o <= 0) return 1;

    const b = Math.max(
        1,
        Math.min(Number(bombs) || 1, TOTAL - 1)
    );

    let m = 1;

    for (let i = 0; i < o; i++) {
        const tilesLeft = TOTAL - i;
        const safeLeft = TOTAL - b - i;

        if (safeLeft <= 0 || tilesLeft <= 0) break;

        m *= tilesLeft / safeLeft;
    }

    m *= HOUSE;
    m = Math.min(m, MAX_MULT);

    return Number(Math.max(1, m).toFixed(2));
}

function potentialAt(amount, opened, bombs) {
    const amt = Math.floor(Number(amount) || 0);
    const o = Math.floor(Number(opened) || 0);
    if (amt <= 0 || o <= 0) return 0;
    return Math.max(0, Math.floor(amt * multAt(o, bombs)));
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
    if (!games.has(game.id) || game.dead || game.cashed) return;

    if (game.opened.size > 0 && !game.fun && !game.testMode && game.amount > 0) {
        const win = potentialAt(game.amount, game.opened.size, game.bombCount);
        game.cashed = true;
        game._lastWin = win;
        eter.add(game.userId, win, { reason: 'mines auto' });
    } else if (game.opened.size > 0 && (game.fun || game.testMode)) {
        game.cashed = true;
    } else {
        game.dead = true;
    }

    clearTimer(game);

    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        const msg = ch ? await ch.messages.fetch(game.messageId).catch(() => null) : null;
        if (msg) {
            await msg.edit({
                flags: MessageFlags.IsComponentsV2,
                components: panelComponents(game, true)
            }).catch(() => {});
        }
        const type = game.dead ? 'loss' : game.cashed ? 'cash' : null;
        if (type) await sendResult(game, client, type);
    } catch (_) {}
}

async function sendResult(game, client, type = null) {
    if (game.resultSent) return;
    if (game.testMode) {
        game.resultSent = true;
        return;
    }
    game.resultSent = true;

    // Derrota e saque já ficam registrados no painel da partida; não enviar mensagem extra.
    if (type === 'cash' || type === 'loss') return;

    try {
        const channel = await client.channels.fetch(game.channelId).catch(() => null);
        if (!channel) return;

        let title;
        let description;
        let color;
        let fields = [];

        if (type === 'cash') {
            const win = game._lastWin || potentialAt(game.amount, game.opened.size, game.bombCount);
            const profit = win - game.amount;
            title = '✦ SAQUE REALIZADO';
            description = 'Saque confirmado. A partida foi encerrada com segurança.';
            color = 0x57F287;
            fields = [
                { name: 'Recebido', value: fmt(win) + ' ✨', inline: true },
                { name: profit >= 0 ? 'Lucro' : 'Resultado', value: (profit > 0 ? '+' : profit < 0 ? '−' : '') + fmt(Math.abs(profit)) + ' ✨', inline: true }
            ];
        } else if (type === 'win') {
            const win = game._lastWin || potentialAt(game.amount, game.opened.size, game.bombCount);
            const profit = win - game.amount;
            title = '✦ MINES CONCLUÍDO';
            description = 'Você concluiu a partida e garantiu o valor acumulado.';
            color = 0x57F287;
            fields = [
                { name: 'Recebido', value: fmt(win) + ' ✨', inline: true },
                { name: 'Lucro', value: '+' + fmt(profit) + ' ✨', inline: true }
            ];
        } else if (type === 'loss') {
            title = '✦ MINES ENCERRADO';
            description = 'Uma mina foi encontrada antes que você pudesse escapar.';
            color = 0xED4245;
            fields = [
                { name: 'Perdido', value: fmt(game.amount) + ' ✨', inline: true },
                { name: 'Prejuízo', value: '-' + fmt(game.amount) + ' ✨', inline: true }
            ];
        } else {
            title = '✦ MINES ENCERRADO';
            description = 'A partida foi encerrada.';
            color = 0x5865F2;
        }

        const result = await channel.send({
            
            reply: game.messageId
                ? { messageReference: game.messageId, failIfNotExists: false }
                : undefined,
            allowedMentions: { users: [game.userId] },
            embeds: [
                new EmbedBuilder()
                    .setColor(color)
                    .setTitle(title)
                    .setDescription(description)
                    .addFields(fields)
                    .setFooter({ text: 'Aeternus • Mines' })
            ]
        });

        game.resultMessageId = result.id;
    } catch (_) {}
}

function panelText(game) {
    const opened = game.opened.size;
    const bombs = game.bombCount;
    const safeTotal = TOTAL - bombs;
    const remaining = Math.max(0, safeTotal - opened);
    const currentMult = multAt(opened, bombs);
    const nextMult = opened < safeTotal ? multAt(opened + 1, bombs) : currentMult;
    const nextGain = opened < safeTotal
        ? potentialAt(game.amount, opened + 1, bombs)
        : potentialAt(game.amount, opened, bombs);

    return [
        '# ✦ AETERNUS • MINES' + (game.testMode ? ' • TESTE' : ''),
        game.testMode ? '🧪 **MODO TESTE** — nenhum Éter será cobrado ou creditado.' : 'Abra casas seguras e saque antes de encontrar uma mina.',
        '',
        '**Informações da partida**',
        'Aposta: ' + fmt(game.amount) + ' ✨',
        'Bombas: 💣 ' + bombs + ' • Seguras: ' + remaining + '/' + safeTotal,
        'Multiplicador atual: **' + currentMult.toFixed(2) + 'x**',
        'Próximo: **' + nextMult.toFixed(2) + 'x** • ' + fmt(nextGain) + ' ✨',
        game.dead ? '❌ **Partida encerrada: mina encontrada.**' : '',
        game.cashed ? '✅ **Partida encerrada.**' : ''
    ].filter(Boolean).join('\\n');
}

function panelFooter(game) {
    return '-# Partida #' + String(game.partida).padStart(4, '0') + ' • Éter ✨ • AFK 7 min • ' + betFooter();
}

function panelComponents(game, reveal = false) {
    const container = new ContainerBuilder()
        .setAccentColor(game.dead ? 0xED4245 : game.cashed ? 0x57F287 : 0x5865F2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(panelText(game)))
        .addSeparatorComponents(new SeparatorBuilder());

    for (const row of boardRows(game, reveal)) container.addActionRowComponents(row);

    container
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(panelFooter(game)));

    const rows = controlsRows(game);
    if (game.dead || game.cashed || reveal) {
        for (const row of rows) container.addActionRowComponents(row);
    } else {
        container
            .addActionRowComponents(rows[0])
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('💡 **Dica:** abra as casas com atenção e saque quando quiser garantir o valor acumulado.')
            )
            .addActionRowComponents(rows[1]);
    }

    return [container];
}

function boardRows(game, reveal = false) {
    const ended = game.dead || game.cashed || reveal;
    const rows = [];
    for (let y = 0; y < ROWS; y++) {
        const row = new ActionRowBuilder();
        for (let x = 0; x < COLS; x++) {
            const i = y * COLS + x;
            const opened = game.opened.has(i);
            const bomb = game.bombs.has(i);
            let label = String(i + 1);
            let style = ButtonStyle.Secondary;
            if (ended) {
                if (bomb) {
                    label = '💣';
                    style = ButtonStyle.Danger;
                } else if (opened) {
                    label = '💎';
                    style = ButtonStyle.Success;
                }
            } else if (opened) {
                label = '💎';
                style = ButtonStyle.Success;
            }
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('minas-teste:cell:' + game.id + ':' + i)
                    .setLabel(label)
                    .setStyle(style)
                    .setDisabled(ended || opened)
            );
        }
        rows.push(row);
    }
    return rows;
}

function controlsRows(game) {
    const ended = game.dead || game.cashed;

    if (ended) {
        return [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('minas-teste:again:' + game.id)
                .setLabel('Novamente')
                .setStyle(ButtonStyle.Primary)
        )];
    }

    const opened = game.opened.size;
    const value = opened > 0 ? potentialAt(game.amount, opened, game.bombCount) : 0;

    const navigationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas-teste:random:' + game.id)
            .setLabel('Aleatório')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('minas-teste:refresh:' + game.id)
            .setLabel('Atualizar')
            .setStyle(ButtonStyle.Secondary)
    );

    const cashRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas-teste:cash:' + game.id)
            .setLabel(game.fun ? 'Encerrar' : 'Sacar • ' + fmt(value) + ' ✨')
            .setStyle(ButtonStyle.Success)
            .setDisabled(opened <= 0)
    );

    return [navigationRow, cashRow];
}

function fullComponents(game, reveal = false) {
    const ended = game.dead || game.cashed || reveal;
    return [...boardRows(game, ended), ...controlsRows(game)];
}

function makeGame(userId, amount, bombCount, fun, meta = {}) {
    const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const bombs = new Set();
    const maxBombs = Math.min(Math.max(1, bombCount), MAX_BOMBS, TOTAL - 1);
    while (bombs.size < maxBombs) bombs.add(Math.floor(Math.random() * TOTAL));

    const g = {
        id,
        partida: ++matchCounter,
        userId,
        amount: fun && !meta.testMode ? 0 : amount,
        fun: !!fun,
        testMode: !!meta.testMode,
        bombCount: maxBombs,
        bombs,
        opened: new Set(),
        dead: false,
        cashed: false,
        _lastWin: 0,
        resultSent: false,
        resultMessageId: null,
        channelId: meta.channelId || null,
        messageId: meta.messageId || null,
        _timer: null
    };
    games.set(id, g);
    return g;
}

function openCell(game, idx) {
    if (game.dead || game.cashed || game.opened.has(idx)) return { ok: false };

    if (game.bombs.has(idx)) {
        game.dead = true;
        clearTimer(game);
        return { ok: true, bomb: true };
    }

    game.opened.add(idx);

    if (game.opened.size >= TOTAL - game.bombCount) {
        game.cashed = true;
        clearTimer(game);
        let win = 0;
        if (!game.fun && !game.testMode && game.amount > 0) {
            win = potentialAt(game.amount, game.opened.size, game.bombCount);
            game._lastWin = win;
            eter.add(game.userId, win, { reason: 'mines clear' });
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
    if (any.length > 0 && game.bombs.size > 0 && Math.random() < BOMB_CHANCE) {
        const bombPool = any.filter((i) => game.bombs.has(i));
        if (bombPool.length > 0) return bombPool[Math.floor(Math.random() * bombPool.length)];
    }
    const pool = safe.length ? safe : any;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function endPayload(game) {
    clearTimer(game);
    return {
        flags: MessageFlags.IsComponentsV2,
        components: panelComponents(game, true)
    };
}

module.exports = {
    name: 'minas-teste',
    aliases: ['minasteste'],
    description: 'Versão de teste isolada do Mines 4×4',

    async execute(message, args, client, options = {}) {
        const testMode = options.testMode === true;
        const bombsRaw = parseInt(args[0], 10);
        if (!Number.isFinite(bombsRaw) || bombsRaw < 1 || bombsRaw > MAX_BOMBS) {
            return message.reply(
                [
                    'Mines 4×4',
                    '',
                    'Diversão: `O.minas <bombas>`',
                    'Aposta: `O.minas <bombas> <valor>`',
                    '',
                    'Bombas: 1 a 11',
                    'Aposta: 100 a 10.000.000 ✨',
                    'Grade: 4×4',
                    'Moeda: ✨ Éter'
                ].join('\n')
            );
        }

        let game;
        if (args[1] == null || args[1] === '') {
            game = makeGame(message.author.id, 0, bombsRaw, true, { testMode });
        } else {
            const bet = resolveBet(args[1], testMode ? Number.MAX_SAFE_INTEGER : eter.get(message.author.id), { label: '✨' });
            if (!bet.ok) return message.reply('❌ ' + bet.error);
            if (bet.amount < MIN_BET || bet.amount > MAX_BET) {
                return message.reply(
                    '❌ Aposta entre ' + fmt(MIN_BET) + ' e ' + fmt(MAX_BET) + ' ✨.'
                );
            }
            if (!testMode) eter.remove(message.author.id, bet.amount, { reason: 'mines bet' });
            game = makeGame(message.author.id, bet.amount, bombsRaw, false, { testMode });
        }

        const msg = await message.reply({
            
            
            flags: MessageFlags.IsComponentsV2,
            components: panelComponents(game),
            allowedMentions: { users: [message.author.id] }
        });

        game.channelId = msg.channel.id;
        game.messageId = msg.id;
        touch(game, client || message.client);
    },

    async executeTest(message, args, client) {
        return module.exports.execute(message, args, client, { testMode: true });
    },

    async handleComponent(interaction) {
        const parts = String(interaction.customId || '').split(':');
        const action = parts[1];
        const gameId = parts[2];
        const game = games.get(gameId);
        const client = interaction.client;

        if (!game) {
            return interaction
                .reply({ content: 'Jogo expirado. Use `O.minas` novamente.', ephemeral: true })
                .catch(() => {});
        }

        if (interaction.user.id !== game.userId) {
            return interaction
                .reply({ content: 'Não é o seu Mines.', ephemeral: true })
                .catch(() => {});
        }

        if (processing.has(gameId) && action !== 'refresh' && action !== 'again') {
            return interaction.deferUpdate().catch(() => {});
        }

        processing.add(gameId);

        try {
            if ((game.dead || game.cashed) && action !== 'refresh' && action !== 'again') {
                return interaction
                    .reply({ content: 'Jogo já encerrado.', ephemeral: true })
                    .catch(() => {});
            }

            touch(game, client);

            if (action === 'again') {
                if (!game.dead && !game.cashed) {
                    return interaction
                        .reply({ content: 'A partida ainda está em andamento.', ephemeral: true })
                        .catch(() => {});
                }

                if (game.resultMessageId) {
                    try {
                        const channel = await client.channels
                            .fetch(game.channelId)
                            .catch(() => null);
                        if (channel) {
                            const resultMsg = await channel.messages
                                .fetch(game.resultMessageId)
                                .catch(() => null);
                            if (resultMsg) await resultMsg.delete().catch(() => {});
                        }
                    } catch (_) {}
                }

                if (!game.fun && !game.testMode) {
                    const balance = eter.get(game.userId);
                    if (balance < game.amount) {
                        return interaction
                            .reply({
                                content: '❌ Você não possui éter suficiente para iniciar novamente.',
                                ephemeral: true
                            })
                            .catch(() => {});
                    }
                    eter.remove(game.userId, game.amount, { reason: 'mines again' });
                }

                clearTimer(game);
                games.delete(game.id);

                await interaction
                    .update({
                        flags: MessageFlags.IsComponentsV2,
                        components: panelComponents(game, true)
                    })
                    .catch(() => {});

                const channel =
                    interaction.channel ||
                    (await client.channels.fetch(game.channelId).catch(() => null));

                if (!channel) return;

                const newGame = makeGame(
                    game.userId,
                    game.amount,
                    game.bombCount,
                    game.fun,
                    { channelId: channel.id, testMode: game.testMode }
                );

                const msg = await channel
                    .send({
                        
                        reply: {
                            messageReference: interaction.message.id,
                            failIfNotExists: false
                        },
                        allowedMentions: { users: [newGame.userId] },
                        
                        flags: MessageFlags.IsComponentsV2,
                        components: panelComponents(newGame)
                    })
                    .catch(() => null);

                if (msg) {
                    newGame.channelId = msg.channel.id;
                    newGame.messageId = msg.id;
                    touch(newGame, client);
                }

                return;
            }

            if (action === 'refresh') {
                return interaction
                    .update({
                        flags: MessageFlags.IsComponentsV2,
                        components: panelComponents(game, game.dead || game.cashed)
                    })
                    .catch(() => {});
            }

            if (action === 'random') {
                const idx = pickRandom(game);
                if (idx == null) {
                    return interaction
                        .reply({ content: 'Nenhuma casa livre.', ephemeral: true })
                        .catch(() => {});
                }
                const res = openCell(game, idx);
                if (res.bomb || res.autoWin) {
                    await interaction.update(endPayload(game)).catch(() => {});
                    await sendResult(game, client, res.bomb ? 'loss' : 'win');
                    return;
                }
                return interaction
                    .update({ flags: MessageFlags.IsComponentsV2, components: panelComponents(game) })
                    .catch(() => {});
            }

            if (action === 'cash') {
                const opened = game.opened.size;
                if (opened <= 0) {
                    return interaction
                        .reply({ content: 'Abra pelo menos uma casa antes de sacar.', ephemeral: true })
                        .catch(() => {});
                }
                if (game.cashed) {
                    await interaction.update(endPayload(game)).catch(() => {});
                    await sendResult(game, client, 'cash');
                    return;
                }

                game.cashed = true;
                const win = potentialAt(game.amount, opened, game.bombCount);
                if (win <= 0 && !game.fun && !game.testMode) {
                    game.cashed = false;
                    return interaction
                        .reply({ content: 'Valor de saque inválido.', ephemeral: true })
                        .catch(() => {});
                }

                game._lastWin = win;
                clearTimer(game);

                if (!game.fun && !game.testMode && win > 0) {
                    try {
                        eter.add(game.userId, win, { reason: 'mines cash' });
                    } catch (e) {
                        game.cashed = false;
                        game._lastWin = 0;
                        return interaction
                            .reply({ content: 'Erro ao creditar o saque.', ephemeral: true })
                            .catch(() => {});
                    }
                }

                await interaction.update(endPayload(game)).catch(() => {});
                await sendResult(game, client, 'cash');
                return;
            }

            if (action === 'cell') {
                const idx = parseInt(parts[3], 10);
                if (Number.isNaN(idx) || idx < 0 || idx >= TOTAL) {
                    return interaction
                        .reply({ content: 'Casa inválida.', ephemeral: true })
                        .catch(() => {});
                }
                const res = openCell(game, idx);
                if (res.bomb || res.autoWin) {
                    await interaction.update(endPayload(game)).catch(() => {});
                    await sendResult(game, client, res.bomb ? 'loss' : 'win');
                    return;
                }
                return interaction
                    .update({ flags: MessageFlags.IsComponentsV2, components: panelComponents(game) })
                    .catch(() => {});
            }
        } finally {
            processing.delete(gameId);
        }
    }
};
