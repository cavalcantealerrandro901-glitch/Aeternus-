const { EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const fs = require('fs');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const { getPrefix } = require('../utils/settings');
const minesCash = require('../utils/minesCashButton');
const { fullComponents } = require('../utils/minesBoard');
const { multAt, potentialAt } = require('../utils/minesMult');
let WIN_IMG_FROM_UTIL = null;
try {
    const mw = require('../utils/minesWinImage');
    WIN_IMG_FROM_UTIL = mw.WIN_IMG_PATH;
    if (typeof mw.ensureMinesWinImage === 'function') mw.ensureMinesWinImage();
} catch (_) {}

const TOTAL = 16,
    MAX_BOMBS = 11;
const HOUSE = 0.96;
const IDLE_MS = 6 * 60 * 1000;
const BET_MIN = 100;
const BET_MAX = 10_000_000;
const IDLE_CASH_RATE = 0.5;

const WIN_IMG_PATH = WIN_IMG_FROM_UTIL || path.join(__dirname, '..', 'assets', 'mines-win.jpg');
const LOSE_IMG_PATH = path.join(__dirname, '..', 'assets', 'mines-lose.jpg');
const games = new Map();
let PARTIDA_SEQ = 1000;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function msgBetRange() {
    return '💸 Valor inválido, o mínimo de apostas é **100** éter e o máximo é **10m**.';
}

function isUnknownInteraction(err) {
    const code = err?.code ?? err?.rawError?.code;
    return code === 10062 || /unknown interaction/i.test(String(err?.message || ''));
}

async function safeReply(interaction, payload) {
    try {
        if (interaction.deferred || interaction.replied) {
            return await interaction.followUp(payload);
        }
        return await interaction.reply(payload);
    } catch (e) {
        if (!isUnknownInteraction(e)) throw e;
    }
}

async function safeUpdate(interaction, payload) {
    try {
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply(payload);
        }
        return await interaction.update(payload);
    } catch (e) {
        if (isUnknownInteraction(e)) {
            try {
                await interaction.message?.edit?.(payload);
            } catch (_) {}
            return;
        }
        throw e;
    }
}

function minesResultThumb(kind) {
    const envWin = String(process.env.MINES_IMG_WIN || process.env.MINES_WIN_IMAGE || '').trim();
    const envLose = String(process.env.MINES_IMG_LOSE || process.env.MINES_LOSE_IMAGE || '').trim();
    const base = String(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(
        /\/$/,
        ''
    );
    if (kind === 'win') {
        if (envWin && /^https?:\/\//i.test(envWin)) return envWin.slice(0, 512);
        if (base) return base + '/mines-win.jpg';
        return null;
    }
    if (envLose && /^https?:\/\//i.test(envLose)) return envLose.slice(0, 512);
    if (base && fs.existsSync(LOSE_IMG_PATH)) return base + '/mines-lose.jpg';
    return null;
}

function minesResultFiles(game) {
    const files = [];
    if (game.cashed && !game.fun && fs.existsSync(WIN_IMG_PATH)) {
        files.push(new AttachmentBuilder(WIN_IMG_PATH, { name: 'mines-win.jpg' }));
    } else if (game.dead && fs.existsSync(LOSE_IMG_PATH)) {
        files.push(new AttachmentBuilder(LOSE_IMG_PATH, { name: 'mines-lose.jpg' }));
    }
    return files;
}

function resultBanner(game) {
    if (!game.dead && !game.cashed) return null;

    if (game._idleAuto) {
        if (game.fun) return '⏱️ Tempo esgotado. Clique no botão abaixo e tente novamente!!!';
        const win = game._lastWin || 0;
        if (game.opened.size > 0) {
            return (
                '⏱️ Tempo esgotado — saque automático de ✨ **' +
                fmt(win) +
                '**. Clique no botão abaixo e tente novamente!!!'
            );
        }
        return (
            '⏱️ Tempo esgotado — aposta devolvida (✨ **' +
            fmt(win) +
            '**). Clique no botão abaixo e tente novamente!!!'
        );
    }

    if (game.cashed && game.fun) {
        return '🏁 Partida encerrada (diversão). Clique no botão abaixo e tente novamente!!!';
    }

    if (game.cashed && !game.fun) {
        const win = game._lastWin || potentialAt(game.amount, game.opened.size, game.bombCount);
        const profit = win - game.amount;
        return (
            'Parabéns! Você conseguiu sair sem encontrar nenhuma bomba, sacando a tempo ✨ **' +
            fmt(win) +
            '** éter com um lucro de ✨ **' +
            fmt(profit) +
            '**. Clique no botão abaixo e tente novamente!!!'
        );
    }

    return (
        'Cabô!!! Você encontrou uma bomba e teve uma perda de ✨ **' +
        fmt(game.amount) +
        '** éter. Mas não desanime, clique no botão abaixo e tenta recuperar!!!'
    );
}

function panelEmbed(game, extra, reveal) {
    const opened = game.opened.size;
    const bombs = game.bombCount;
    const safeTotal = TOTAL - bombs;
    const left = Math.max(0, safeTotal - opened);
    const curM = multAt(opened, bombs);
    const nextM = opened < safeTotal ? multAt(opened + 1, bombs) : curM;
    const nextPay = potentialAt(game.amount, opened + 1, bombs);
    const cashNow = potentialAt(game.amount, opened, bombs);

    const apostado = game.fun ? 'diversão' : fmt(game.amount) + ' éter';
    const proxLine = game.fun
        ? '⚡ **Próximo Multiplicador:** ' + nextM.toFixed(2) + 'x'
        : opened < safeTotal
          ? '⚡ **Próximo Multiplicador:** ' +
            nextM.toFixed(2) +
            'x (✨ ' +
            fmt(nextPay) +
            ' éter)'
          : '⚡ **Próximo Multiplicador:** — (todas as casas seguras abertas)';

    const lines = [
        '💰 **Apostado:** ' + apostado,
        '💣 **Bombas:** ' + bombs,
        '📦 **Casas restantes:** ' + left + '/' + safeTotal,
        '📈 **Multiplicador:** ' + curM.toFixed(2) + 'x',
        proxLine
    ];

    const emb = new EmbedBuilder()
        .setColor(game.dead ? 0xf87171 : game.cashed ? 0x34d399 : 0xfbbf24)
        .setTitle('💣 AETERNUS MINES')
        .setDescription(lines.join('\n'))
        .setFooter({
            text:
                'Partida #' +
                (game.number || game.partida || '?') +
                (game.fun ? ' · diversão' : '')
        })
        .setTimestamp();

    if (extra) emb.addFields({ name: '\u200b', value: extra.slice(0, 1024) });
    return emb;
}

function resultEmbed(game, extra) {
    const banner = resultBanner(game);
    const emb = new EmbedBuilder()
        .setColor(game.dead ? 0xf87171 : 0x34d399)
        .setDescription((banner || extra || 'Fim de partida').slice(0, 4000))
        .setTimestamp();
    const thumb = minesResultThumb(game.dead ? 'lose' : 'win');
    if (thumb) emb.setThumbnail(thumb);
    return emb;
}

function panelPayload(game, extra, reveal) {
    const files = minesResultFiles(game);
    const embeds = [panelEmbed(game, null, reveal)];
    if (game.dead || game.cashed) {
        embeds.push(resultEmbed(game, extra));
    }
    if (game.cashed && !game.fun && files.some((f) => f.name === 'mines-win.jpg')) {
        // ok
    }
    return {
        embeds,
        components: fullComponents(game, { reveal: !!reveal }),
        files
    };
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
    game._timer = setTimeout(async () => {
        if (game.dead || game.cashed) return;
        game._idleAuto = true;
        if (!game.fun && game.opened.size > 0) {
            const full = potentialAt(game.amount, game.opened.size, game.bombCount);
            const win = Math.floor(full * IDLE_CASH_RATE);
            game._lastWin = win;
            game.cashed = true;
            eter.add(game.userId, win, { reason: 'mines idle cash' });
        } else if (!game.fun && game.opened.size === 0) {
            game._lastWin = game.amount;
            eter.add(game.userId, game.amount, { reason: 'mines idle refund' });
            game.cashed = true;
        } else {
            game.cashed = true;
        }
        try {
            if (client && game.channelId && game.messageId) {
                const ch = await client.channels.fetch(game.channelId).catch(() => null);
                if (ch?.isTextBased?.()) {
                    const main = await ch.messages.fetch(game.messageId).catch(() => null);
                    if (main) {
                        const payload = endPayload(game);
                        await main.edit({
                            content: main.content || undefined,
                            embeds: payload.embeds,
                            components: payload.components
                        }).catch(() => {});
                    }
                }
            }
            await minesCash.syncCashMessage(client, game).catch(() => {});
        } catch (_) {}
    }, IDLE_MS);
}

function makeGame(userId, amount, bombCount, fun, meta = {}) {
    const id = userId + '_' + Date.now();
    const bombs = new Set();
    const maxBombs = Math.min(Math.max(1, bombCount), MAX_BOMBS, TOTAL - 1);
    while (bombs.size < maxBombs) bombs.add(Math.floor(Math.random() * TOTAL));
    PARTIDA_SEQ += 1;
    const g = {
        id,
        number: PARTIDA_SEQ,
        userId,
        amount: fun ? 0 : amount,
        bombCount: maxBombs,
        bombs,
        opened: new Set(),
        dead: false,
        cashed: false,
        fun: !!fun,
        channelId: meta.channelId || null,
        messageId: null,
        cashMessageId: null,
        sourceMessageId: meta.sourceMessageId || null,
        previousMessageId: meta.previousMessageId || null,
        previousGameId: meta.previousGameId || null,
        _lastWin: 0,
        _idleAuto: false,
        _timer: null,
        _last: Date.now()
    };
    games.set(id, g);
    return g;
}

function pickRandom(game) {
    const free = [];
    for (let i = 0; i < TOTAL; i++) {
        if (!game.opened.has(i)) free.push(i);
    }
    if (!free.length) return null;
    return free[Math.floor(Math.random() * free.length)];
}

function openCell(game, idx) {
    if (game.dead || game.cashed) return { ok: false, error: 'Partida encerrada.' };
    if (game.opened.has(idx)) return { ok: false, error: 'Casa já aberta.' };
    if (game.bombs.has(idx)) {
        game.dead = true;
        return { ok: true, bomb: true };
    }
    game.opened.add(idx);
    const safeTotal = TOTAL - game.bombCount;
    if (game.opened.size >= safeTotal) {
        game.cashed = true;
        if (!game.fun) {
            const win = potentialAt(game.amount, game.opened.size, game.bombCount);
            game._lastWin = win;
            eter.add(game.userId, win, { reason: 'mines clear' });
        }
        return { ok: true, bomb: false, autoWin: true, win: game._lastWin };
    }
    return { ok: true, bomb: false };
}

function endPayload(game) {
    return panelPayload(game, null, true);
}

async function closePreviousGames(userId, client) {
    const toClose = [];
    for (const [id, g] of games) {
        if (g.userId === userId && !g.dead && !g.cashed) toClose.push([id, g]);
    }
    for (const [id, g] of toClose) {
        clearTimer(g);
        g.cashed = true;
        try {
            if (client && g.channelId && g.messageId) {
                const ch = await client.channels.fetch(g.channelId).catch(() => null);
                if (ch?.isTextBased?.()) {
                    const main = await ch.messages.fetch(g.messageId).catch(() => null);
                    if (main) {
                        await main
                            .edit({
                                content: main.content || undefined,
                                embeds: main.embeds?.length ? main.embeds : [],
                                components: []
                            })
                            .catch(() => {});
                    }
                }
            }
            await minesCash.deleteCashMessage(client, g).catch(() => {});
        } catch (_) {}
        games.delete(id);
    }
    return toClose.length;
}

function startContent(userId) {
    return '<@' + userId + '>';
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mina'],
    description: 'Mines 4×4 — abra casas, suba o multiplicador e saque antes da bomba.',
    usage: '<bombas> <valor> | <bombas> (diversão)',

    async execute(message, args) {
        const prefix = getPrefix(message.guild?.id) || 'O.';
        const a0 = String(args[0] || '').trim();
        const a1 = String(args[1] || '').trim();

        if (!a0) {
            return message.reply(
                '💣 Comando inválido, use `' + prefix + 'mines <bombas> <valor>`.'
            );
        }

        const bombsRaw = parseInt(a0, 10);
        if (!Number.isFinite(bombsRaw) || bombsRaw < 1 || bombsRaw > MAX_BOMBS) {
            return message.reply(
                '💣 Valor de bombas inválido, use `' + prefix + 'mines <bombas> <valor>`.'
            );
        }
        const bombCount = Math.min(MAX_BOMBS, Math.max(1, bombsRaw));

        let fun = false;
        let amount = 0;
        if (!a1) {
            fun = true;
        } else {
            const wallet = eter.get(message.author.id);
            const bet = resolveBet(a1, wallet, { label: '✨' });
            if (!bet.ok) {
                return message.reply(
                    '💸 Valor inválido, você está tentando apostar um valor que você não tem, ✨ **' +
                        fmt(wallet) +
                        '** éter.'
                );
            }
            if (bet.amount < BET_MIN || bet.amount > BET_MAX) {
                return message.reply(msgBetRange());
            }
            amount = bet.amount;
            eter.remove(message.author.id, amount, { reason: 'mines bet' });
        }

        await closePreviousGames(message.author.id, message.client);

        const game = makeGame(message.author.id, amount, bombCount, fun, {
            channelId: message.channel.id,
            sourceMessageId: message.id
        });

        const payload = panelPayload(game);
        const sent = await message.channel
            .send({
                content: startContent(message.author.id),
                allowedMentions: { users: [message.author.id] },
                embeds: payload.embeds,
                components: payload.components,
                files: payload.files || [],
                reply: { messageReference: message.id, failIfNotExists: false }
            })
            .catch(() => null);

        if (sent) {
            game.messageId = sent.id;
            game.channelId = message.channel.id;
        }
        await minesCash.syncCashMessage(message.client, game).catch(() => {});
        touch(game, message.client);
    },

    async handleComponent(interaction, client) {
        const cid = interaction.customId || '';
        if (!cid.startsWith('minas:')) return;
        if (
            interaction.message?.author?.id &&
            client?.user?.id &&
            interaction.message.author.id !== client.user.id
        ) {
            return;
        }

        const parts = cid.split(':');
        const action = parts[1];
        const gameId = parts[2];
        const game = games.get(gameId);

        if (!game) {
            return safeReply(interaction, {
                content: 'Partida expirada. Use o comando de novo.',
                flags: MessageFlags.Ephemeral
            });
        }
        if (interaction.user.id !== game.userId) {
            return safeReply(interaction, {
                content: 'Não é a sua partida.',
                flags: MessageFlags.Ephemeral
            });
        }

        const boardActions = new Set(['cell', 'random', 'cash', 'refresh']);
        if (boardActions.has(action) && !interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate().catch(() => {});
        }

        if (action === 'again') {
            // Carrega config do jogo antigo (aposta, bombas, modo diversão)
            let amount = Math.max(0, Math.floor(Number(game.amount) || 0));
            const fun = !!game.fun;
            const bombCount = Math.min(
                MAX_BOMBS,
                Math.max(1, Math.floor(Number(game.bombCount) || 1))
            );
            const prevMessageId = interaction.message?.id || game.messageId || null;
            const prevChannelId = interaction.channelId || game.channelId;

            if (!fun) {
                if (amount < BET_MIN) amount = BET_MIN;
                if (amount > BET_MAX) amount = BET_MAX;
                const wallet = eter.get(game.userId);
                if (wallet < amount) {
                    return safeReply(interaction, {
                        content:
                            '💸 Valor inválido, você está tentando apostar um valor que você não tem, ✨ **' +
                            fmt(wallet) +
                            '** éter.',
                        flags: MessageFlags.Ephemeral
                    });
                }
                eter.remove(game.userId, amount, { reason: 'mines again' });
            } else {
                amount = 0;
            }

            games.delete(gameId);
            clearTimer(game);

            // Desativa botões do jogo antigo (mantém o resultado visível)
            await safeUpdate(interaction, {
                content: interaction.message.content || startContent(game.userId),
                embeds: interaction.message.embeds,
                components: []
            });

            await minesCash.deleteCashMessage(client, game).catch(() => {});
            await closePreviousGames(game.userId, client);

            const ng = makeGame(game.userId, amount, bombCount, fun, {
                channelId: prevChannelId,
                sourceMessageId: game.sourceMessageId || prevMessageId,
                previousGameId: gameId,
                previousMessageId: prevMessageId
            });

            const payload = panelPayload(ng);
            const sendOpts = {
                content: startContent(game.userId),
                allowedMentions: { users: [game.userId] },
                embeds: payload.embeds,
                components: payload.components,
                files: payload.files || []
            };
            // Responde / “carrega” a mensagem do jogo anterior
            if (prevMessageId) {
                sendOpts.reply = {
                    messageReference: prevMessageId,
                    failIfNotExists: false
                };
            }

            const sent = await interaction.channel.send(sendOpts).catch(() => null);

            if (sent) {
                ng.messageId = sent.id;
                ng.channelId = prevChannelId;
            }
            await minesCash.syncCashMessage(client, ng).catch(() => {});
            touch(ng, client);
            return;
        }

        if (game.dead || game.cashed) {
            return safeReply(interaction, {
                content: 'Esta partida já terminou. Use **novamente** ou o comando.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === 'cell') {
            const idx = parseInt(parts[3], 10);
            if (!Number.isFinite(idx) || idx < 0 || idx >= TOTAL) {
                return safeReply(interaction, {
                    content: 'Casa inválida.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const res = openCell(game, idx);
            if (!res.ok) {
                return safeReply(interaction, {
                    content: res.error || 'Erro.',
                    flags: MessageFlags.Ephemeral
                });
            }
            touch(game, client);
            const payload = res.bomb || res.autoWin ? endPayload(game) : panelPayload(game);
            await safeUpdate(interaction, {
                content: interaction.message.content || startContent(game.userId),
                embeds: payload.embeds,
                components: payload.components,
                files: payload.files || []
            });
            await minesCash.syncCashMessage(client, game).catch(() => {});
            return;
        }

        if (action === 'random') {
            const idx = pickRandom(game);
            if (idx == null) {
                return safeReply(interaction, {
                    content: 'Nenhuma casa.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const res = openCell(game, idx);
            touch(game, client);
            const payload = res.bomb || res.autoWin ? endPayload(game) : panelPayload(game);
            await safeUpdate(interaction, {
                content: interaction.message.content || startContent(game.userId),
                embeds: payload.embeds,
                components: payload.components,
                files: payload.files || []
            });
            await minesCash.syncCashMessage(client, game).catch(() => {});
            return;
        }

        if (action === 'refresh') {
            touch(game, client);
            const payload = panelPayload(game);
            await safeUpdate(interaction, {
                content: interaction.message.content || startContent(game.userId),
                embeds: payload.embeds,
                components: payload.components,
                files: payload.files || []
            });
            return;
        }

        if (action === 'cash') {
            if (game.fun) {
                game.cashed = true;
                const payload = endPayload(game);
                await safeUpdate(interaction, {
                    content: interaction.message.content || startContent(game.userId),
                    embeds: payload.embeds,
                    components: payload.components
                });
                await minesCash.syncCashMessage(client, game).catch(() => {});
                return;
            }
            if (game.opened.size < 1) {
                return safeReply(interaction, {
                    content: 'Abra pelo menos uma casa antes de sacar.',
                    flags: MessageFlags.Ephemeral
                });
            }
            const win = potentialAt(game.amount, game.opened.size, game.bombCount);
            game._lastWin = win;
            game.cashed = true;
            eter.add(game.userId, win, { reason: 'mines cashout' });
            clearTimer(game);
            const payload = endPayload(game);
            await safeUpdate(interaction, {
                content: interaction.message.content || startContent(game.userId),
                embeds: payload.embeds,
                components: payload.components,
                files: payload.files || []
            });
            await minesCash.syncCashMessage(client, game).catch(() => {});
        }
    }
};
