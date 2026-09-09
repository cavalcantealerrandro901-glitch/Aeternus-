const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
const minesCash = require('../utils/minesCashButton');
const { fullComponents } = require('../utils/minesBoard');
let WIN_IMG_FROM_UTIL = null;
try {
    const mw = require('../utils/minesWinImage');
    WIN_IMG_FROM_UTIL = mw.WIN_IMG_PATH;
    if (typeof mw.ensureMinesWinImage === 'function') mw.ensureMinesWinImage();
} catch (_) {}

const COLS = 4,
    ROWS = 4,
    TOTAL = 16,
    MAX_BOMBS = 11;
const HOUSE = 0.96;
const IDLE_MS = 6 * 60 * 1000;
const BET_MIN = 100;
const BET_MAX = 50_000_000;
const IDLE_CASH_RATE = 0.5;

const WIN_IMG_PATH = WIN_IMG_FROM_UTIL || path.join(__dirname, '..', 'assets', 'mines-win.jpg');
const LOSE_IMG_PATH = path.join(__dirname, '..', 'assets', 'mines-lose.jpg');
const games = new Map();
let PARTIDA_SEQ = 1000;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function fmtWhen(ts) {
    const d = new Date(ts || Date.now());
    const pad = (x) => String(x).padStart(2, '0');
    return (
        pad(d.getDate()) +
        '/' +
        pad(d.getMonth() + 1) +
        '/' +
        d.getFullYear() +
        ' às ' +
        pad(d.getHours()) +
        ':' +
        pad(d.getMinutes())
    );
}

function minesResultThumb(kind) {
    const envWin = String(process.env.MINES_IMG_WIN || process.env.MINES_WIN_IMAGE || '').trim();
    const envLose = String(process.env.MINES_IMG_LOSE || process.env.MINES_LOSE_IMAGE || '').trim();
    const base = String(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(/\/$/, '');
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

function panelPayload(game, extra, reveal) {
    const emb = panelEmbed(game, extra, reveal);
    const files = minesResultFiles(game);
    if (game.cashed && !game.fun && files.some((f) => f.name === 'mines-win.jpg')) {
        emb.setThumbnail('attachment://mines-win.jpg');
    } else if (game.dead && files.some((f) => f.name === 'mines-lose.jpg')) {
        emb.setThumbnail('attachment://mines-lose.jpg');
    }
    return {
        embeds: [emb],
        components: fullComponents(game, reveal),
        files: files.length ? files : []
    };
}

function clearTimer(game) {
    if (game?._timer) {
        clearTimeout(game._timer);
        game._timer = null;
    }
}

function touch(game, client) {
    clearTimer(game);
    game._last = Date.now();
    game._timer = setTimeout(async () => {
        if (!games.has(game.id) || game.dead || game.cashed) return;
        game.cashed = true;
        game._idleAuto = true;
        let note = null;
        if (!game.fun && game.opened.size > 0) {
            const full = potentialAt(game.amount, game.opened.size, game.bombCount);
            const win = Math.max(0, Math.floor(full * IDLE_CASH_RATE));
            game._lastWin = win;
            if (win > 0) eter.add(game.userId, win, { reason: 'mines idle auto' });
            note =
                '⏱️ **Tempo esgotado (6 min).**\n' +
                'Como não houve interação, o **saque automático** foi aplicado.\n' +
                'Você recebeu a **metade** (**✨ ' +
                fmt(win) +
                '**) por conta da inatividade.\n' +
                '_(Valor cheio seria ✨ ' +
                fmt(full) +
                '.)_';
        } else if (!game.fun && game.opened.size === 0) {
            game._lastWin = game.amount;
            eter.add(game.userId, game.amount, { reason: 'mines idle refund' });
            note =
                '⏱️ **Tempo esgotado (6 min).**\n' +
                'Nenhuma casa foi aberta — a aposta de **✨ ' +
                fmt(game.amount) +
                '** foi **devolvida**.';
        } else {
            note = '⏱️ **Tempo esgotado (6 min).** Partida encerrada por inatividade.';
        }
        try {
            const ch = await client.channels.fetch(game.channelId).catch(() => null);
            if (ch?.isTextBased?.()) {
                if (game.messageId) {
                    const main = await ch.messages.fetch(game.messageId).catch(() => null);
                    if (main) await main.edit(panelPayload(game, null, true)).catch(() => {});
                }
                await minesCash.syncCashMessage(client, game, potentialAt, resultBanner(game) || note);
            }
        } catch (e) {
            console.warn('[mines] idle end:', e.message);
        }
    }, IDLE_MS);
}

function multAt(opened, bombs) {
    opened = Math.max(0, Number(opened) || 0);
    bombs = Math.min(MAX_BOMBS, Math.max(1, Number(bombs) || 1));
    if (opened <= 0) return 1;

    let m = 1;
    const safe = TOTAL - bombs;
    const density = bombs / TOTAL;

    for (let i = 0; i < opened; i++) {
        const cellsLeft = TOTAL - i;
        const safeLeft = safe - i;
        if (safeLeft <= 0 || cellsLeft <= 0) break;
        const fair = cellsLeft / safeLeft;
        const stepBoost = 1 + density * 0.42 + (bombs / MAX_BOMBS) * 0.12;
        m *= fair * stepBoost;
    }

    const bombPower = 1 + Math.pow(bombs / MAX_BOMBS, 1.15) * 1.15;
    m = m * HOUSE * bombPower;
    m = Math.max(1 + opened * (0.08 + density * 0.12), m);
    if (m > 500) m = 500;

    return Math.max(1, Math.round(m * 100) / 100);
}

function potentialAt(amount, opened, bombs) {
    return Math.floor(Number(amount || 0) * multAt(opened, bombs));
}

function resultBanner(game) {
    if (!game.dead && !game.cashed) return null;
    if (game._idleAuto) {
        if (game.fun) return '⏱️ Encerrado por inatividade (modo diversão).';
        const win = game._lastWin || 0;
        if (game.opened.size > 0) {
            return (
                '⏱️ Saque automático por inatividade.\n' +
                'Você recebeu a metade: **✨ ' +
                fmt(win) +
                '**.\n' +
                'Casas abertas: **' +
                game.opened.size +
                '** · Multi ×' +
                multAt(game.opened.size, game.bombCount)
            );
        }
        return '⏱️ Tempo esgotado — aposta devolvida (**✨ ' + fmt(win) + '**).';
    }
    if (game.cashed && game.fun) return '🏁 Partida encerrada (modo diversão · sem éter).';
    if (game.cashed && !game.fun) {
        const win = game._lastWin || potentialAt(game.amount, game.opened.size, game.bombCount);
        const profit = Math.max(0, win - game.amount);
        const casas = game.opened.size;
        return (
            '✅ **Você sacou com segurança.**\n' +
            'Sem bombas · **' +
            casas +
            '** casa' +
            (casas === 1 ? '' : 's') +
            ' aberta' +
            (casas === 1 ? '' : 's') +
            ' · levou **✨ ' +
            fmt(win) +
            '** (lucro **✨ ' +
            fmt(profit) +
            '**).\n' +
            'Multi final **×' +
            multAt(casas, game.bombCount) +
            '** · Bombas **' +
            game.bombCount +
            '**'
        );
    }
    return (
        '💥 **Explodiu!** Você perdeu a aposta de **✨ ' +
        fmt(game.amount) +
        '**.\n' +
        'Casas seguras antes da bomba: **' +
        game.opened.size +
        '**'
    );
}

function panelEmbed(game, extra, reveal) {
    const opened = game.opened.size;
    const bombs = game.bombCount;
    const safeTotal = TOTAL - bombs;
    const curM = multAt(opened, bombs);
    const nextM = opened < safeTotal ? multAt(opened + 1, bombs) : curM;
    const nextPay = potentialAt(game.amount, opened + 1, bombs);
    const curPay = potentialAt(game.amount, opened, bombs);

    let color = 0x5865f2;
    if (game.dead) color = 0xed4245;
    else if (game.cashed) color = 0x57f287;
    else if (opened > 0) color = 0xfee75c;

    const left1 = game.fun
        ? '💰 Aposta: diversão'
        : '💰 Aposta: **' + fmt(game.amount) + ' Éter**';
    const right1 = '📈 Multiplicador: **' + curM.toFixed(2) + 'x**';
    const left2 =
        '💣 Minas: **' + bombs + '** (**' + opened + '/' + safeTotal + '**)';
    const right2 = game.fun
        ? '⚡ Próx. Multiplicador: **' + nextM.toFixed(2) + 'x**'
        : opened < safeTotal
          ? '⚡ Próx. Multiplicador: **' +
            nextM.toFixed(2) +
            'x** (✨ **' +
            fmt(nextPay) +
            ' Éter**)'
          : '⚡ Multi final: **' + curM.toFixed(2) + 'x** (✨ **' + fmt(curPay) + '**)';

    const lines = [
        left1 + '       ' + right1,
        left2 + '       ' + right2,
        '',
        '─────────────────────────────────',
        '',
        '───────── ' + fmtWhen(game._last || Date.now()) + ' ─────────'
    ];

    if (extra) {
        lines.push('', String(extra));
    }

    const emb = new EmbedBuilder()
        .setColor(color)
        .setTitle('💣 AETERNUS MINES')
        .setDescription(lines.join('\n'));

    if (game.cashed && !game.fun) {
        const u = minesResultThumb('win');
        if (u) emb.setThumbnail(u);
    } else if (game.dead) {
        const u = minesResultThumb('lose');
        if (u) emb.setThumbnail(u);
    }
    return emb;
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
    for (let i = 0; i < TOTAL; i++) if (!game.opened.has(i)) free.push(i);
    if (!free.length) return null;
    return free[Math.floor(Math.random() * free.length)];
}

function openCell(game, idx) {
    if (game.dead || game.cashed || game.opened.has(idx)) return { ok: false };
    if (game.bombs.has(idx)) {
        game.dead = true;
        return { ok: true, bomb: true };
    }
    game.opened.add(idx);
    const safeTotal = TOTAL - game.bombCount;
    if (game.opened.size >= safeTotal) {
        game.cashed = true;
        let win = 0;
        if (!game.fun) {
            win = potentialAt(game.amount, game.opened.size, game.bombCount);
            game._lastWin = win;
            eter.add(game.userId, win, { reason: 'mines clear' });
        }
        return { ok: true, bomb: false, autoWin: true, win };
    }
    return { ok: true, bomb: false };
}

function endPayload(game) {
    return panelPayload(game, null, true);
}

async function finishExternal(client, game) {
    const text = resultBanner(game);
    await minesCash.syncCashMessage(client, game, potentialAt, text);
}

async function closePreviousGames(userId, client) {
    const toClose = [];
    for (const [id, g] of games) {
        if (g.userId === userId && !g.dead && !g.cashed) {
            toClose.push([id, g]);
        }
    }
    for (const [id, g] of toClose) {
        clearTimer(g);
        g.cashed = true;
        g._idleAuto = false;
        g._lastWin = 0;
        try {
            if (client && g.channelId && g.messageId) {
                const ch = await client.channels.fetch(g.channelId).catch(() => null);
                if (ch?.isTextBased?.()) {
                    const main = await ch.messages.fetch(g.messageId).catch(() => null);
                    if (main) {
                        await main
                            .edit({
                                content: '⏹️ Partida anterior encerrada.',
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

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mina'],
    description: 'Mines 4×4 — abra casas, suba o multiplicador e saque antes da bomba.',
    usage: '<aposta> [bombas 1-11] | fun [bombas]',
    category: 'economia',

    async execute(message, args, client) {
        const fun = String(args[0] || '').toLowerCase() === 'fun';
        let amount = 0;
        let bombCount = 3;

        if (fun) {
            bombCount = Math.min(MAX_BOMBS, Math.max(1, parseInt(args[1], 10) || 3));
        } else {
            const bet = resolveBet(args[0], eter.get(message.author.id), { label: '✨' });
            if (!bet.ok) return message.reply('❌ ' + bet.error);
            if (bet.amount < BET_MIN || bet.amount > BET_MAX) {
                return message.reply(
                    '❌ Aposta entre **✨ ' + fmt(BET_MIN) + '** e **✨ ' + fmt(BET_MAX) + '**.'
                );
            }
            amount = bet.amount;
            bombCount = Math.min(MAX_BOMBS, Math.max(1, parseInt(args[1], 10) || 3));
            eter.remove(message.author.id, amount, { reason: 'mines start' });
        }

        await closePreviousGames(message.author.id, client);

        const game = makeGame(message.author.id, amount, bombCount, fun, {
            channelId: message.channel.id
        });
        const payload = panelPayload(game);
        const msg = await message.reply({
            content: '<@' + message.author.id + '>',
            allowedMentions: { users: [message.author.id] },
            embeds: payload.embeds,
            components: payload.components,
            files: payload.files || []
        });
        game.messageId = msg.id;
        game.channelId = message.channel.id;
        await minesCash.syncCashMessage(client, game, potentialAt);
        touch(game, client);
    },

    async executeSlash(i) {
        const argsRaw = i.options?.getString?.('args') || '';
        const args = argsRaw.trim() ? argsRaw.trim().split(/\s+/) : [];
        return this.execute(
            {
                author: i.user,
                channel: i.channel,
                reply: (p) =>
                    i.deferred || i.replied ? i.followUp(p) : i.reply(p)
            },
            args,
            i.client
        );
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
        if (parts[0] !== 'minas') return;
        const action = parts[1];
        const gameId = parts[2];
        const game = games.get(gameId);

        if (!game) return interaction.reply({ content: 'Partida expirada.', flags: 64 });
        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: 'Não é a sua partida.', flags: 64 });
        }

        if (action === 'again') {
            let amount = game.amount;
            const fun = game.fun;
            const bombCount = game.bombCount;
            if (!fun) {
                const bet = resolveBet(String(game.amount), eter.get(game.userId), { label: '✨' });
                if (!bet.ok) return interaction.reply({ content: '❌ ' + bet.error, flags: 64 });
                if (bet.amount < BET_MIN || bet.amount > BET_MAX) {
                    return interaction.reply({
                        content:
                            '❌ Aposta entre **✨ ' +
                            fmt(BET_MIN) +
                            '** e **✨ ' +
                            fmt(BET_MAX) +
                            '**.',
                        flags: 64
                    });
                }
                eter.remove(game.userId, bet.amount, { reason: 'mines again' });
                amount = bet.amount;
            }
            games.delete(gameId);
            clearTimer(game);

            try {
                await interaction.update({
                    content: '⏹️ Partida anterior encerrada · nova em andamento.',
                    embeds: [],
                    components: []
                });
            } catch (_) {
                await interaction.deferUpdate().catch(() => {});
            }

            await minesCash.deleteCashMessage(client, game).catch(() => {});
            await closePreviousGames(game.userId, client);

            const ng = makeGame(game.userId, amount, bombCount, fun, {
                channelId: interaction.channelId
            });

            const payload = panelPayload(ng);
            const sent = await interaction.channel
                .send({
                    content: '<@' + game.userId + '>',
                    allowedMentions: { users: [game.userId] },
                    embeds: payload.embeds,
                    components: payload.components,
                    files: payload.files || []
                })
                .catch(() => null);

            if (sent) {
                ng.messageId = sent.id;
                ng.channelId = interaction.channelId;
            }
            await minesCash.syncCashMessage(client, ng, potentialAt);
            touch(ng, client);
            return;
        }

        if ((game.dead || game.cashed) && action !== 'refresh') {
            return interaction.reply({ content: 'Jogo já encerrado.', flags: 64 });
        }

        touch(game, client);

        if (action === 'refresh') {
            await interaction.update(panelPayload(game, null, game.dead || game.cashed));
            await minesCash.syncCashMessage(
                client,
                game,
                potentialAt,
                game.dead || game.cashed ? resultBanner(game) : null
            );
            return;
        }

        if (action === 'random') {
            const idx = pickRandom(game);
            if (idx == null) return interaction.reply({ content: 'Nenhuma casa.', flags: 64 });
            const res = openCell(game, idx);
            await interaction.update(
                res.bomb || res.autoWin ? endPayload(game) : panelPayload(game)
            );
            if (res.bomb || res.autoWin) await finishExternal(client, game);
            else await minesCash.syncCashMessage(client, game, potentialAt);
            return;
        }

        if (action === 'cell') {
            const idx = Number(parts[3]);
            if (!Number.isInteger(idx) || idx < 0 || idx >= TOTAL) {
                return interaction.reply({ content: 'Casa inválida.', flags: 64 });
            }
            const res = openCell(game, idx);
            if (!res.ok) return interaction.reply({ content: 'Casa já aberta.', flags: 64 });
            await interaction.update(
                res.bomb || res.autoWin ? endPayload(game) : panelPayload(game)
            );
            if (res.bomb || res.autoWin) await finishExternal(client, game);
            else await minesCash.syncCashMessage(client, game, potentialAt);
            return;
        }

        if (action === 'cash') {
            if (game.fun) {
                game.cashed = true;
            } else if (!game.opened.size) {
                return interaction.reply({
                    content: 'Abra pelo menos uma casa antes de sacar.',
                    flags: 64
                });
            } else {
                game.cashed = true;
                const win = potentialAt(game.amount, game.opened.size, game.bombCount);
                game._lastWin = win;
                eter.add(game.userId, win, { reason: 'mines cash' });
            }

            const end = endPayload(game);
            const onCashMsg =
                game.cashMessageId && interaction.message?.id === game.cashMessageId;
            const resultText = resultBanner(game);

            if (onCashMsg) {
                await interaction.update(minesCash.cashPayload(game, potentialAt, resultText));
                try {
                    const main = await interaction.channel.messages.fetch(game.messageId);
                    await main.edit(end);
                } catch (_) {}
            } else {
                await interaction.update(end);
                await minesCash.syncCashMessage(client, game, potentialAt, resultText);
            }
        }
    }
};
