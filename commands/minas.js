const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');
let WIN_IMG_FROM_UTIL = null;
try {
    const mw = require('../utils/minesWinImage');
    WIN_IMG_FROM_UTIL = mw.WIN_IMG_PATH;
    if (typeof mw.ensureMinesWinImage === 'function') mw.ensureMinesWinImage();
} catch (_) {}

const COLS = 4;
const ROWS = 4;
const TOTAL = COLS * ROWS;
const MAX_BOMBS = 11;
const HOUSE = 0.97;
const IDLE_MS = 7 * 60 * 1000;

const WIN_IMG_PATH = WIN_IMG_FROM_UTIL || path.join(__dirname, '..', 'assets', 'mines-win.jpg');
const LOSE_IMG_PATH = path.join(__dirname, '..', 'assets', 'mines-lose.jpg');

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
    const emb = panelEmbed(game, extra);
    const files = minesResultFiles(game);
    if (game.cashed && !game.fun && files.some((f) => f.name === 'mines-win.jpg')) {
        emb.setThumbnail('attachment://mines-win.jpg');
    } else if (game.dead && files.some((f) => f.name === 'mines-lose.jpg')) {
        emb.setThumbnail('attachment://mines-lose.jpg');
    }
    const payload = { embeds: [emb], components: fullComponents(game, reveal) };
    payload.files = files.length ? files : [];
    return payload;
}

const games = new Map();

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function multAt(opened, bombs) {
    if (opened <= 0) return 1;
    let m = 1;
    for (let i = 0; i < opened; i++) {
        const safeLeft = TOTAL - bombs - i;
        const tilesLeft = TOTAL - i;
        if (safeLeft <= 0 || tilesLeft <= 0) break;
        m *= tilesLeft / safeLeft;
    }
    return Number(Math.max(1, m * HOUSE).toFixed(2));
}

function multGainNext(opened, bombs) {
    const cur = multAt(opened, bombs);
    const next = multAt(opened + 1, bombs);
    return Number(Math.max(0, next - cur).toFixed(2));
}

function multPerBombHint(opened, bombs) {
    if (opened <= 0 || bombs <= 1) return null;
    const withBombs = multAt(opened, bombs);
    const withOne = multAt(opened, 1);
    return Number(((withBombs - withOne) / Math.max(1, bombs - 1)).toFixed(2));
}

function potentialAt(amount, opened, bombs) {
    if (!amount || opened <= 0) return 0;
    return Math.floor(amount * multAt(opened, bombs));
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
    game._timer = setTimeout(() => autoEnd(game, client).catch(() => {}), IDLE_MS);
}

async function autoEnd(game, client) {
    if (!games.has(game.id) || game.dead || game.cashed) return;
    let note = '\u23f3 **7 min sem intera\u00e7\u00e3o** \u2014 partida encerrada.';
    if (game.opened.size > 0 && !game.fun) {
        const win = potentialAt(game.amount, game.opened.size, game.bombCount);
        game.cashed = true;
        game._lastWin = win;
        eter.add(game.userId, win, { reason: 'mines auto' });
        note += '\n\ud83d\udcb5 Saque autom\u00e1tico: \u2728 **' + fmt(win) + '**';
    } else {
        game.cashed = true;
    }
    clearTimer(game);
    try {
        const ch = game.channelId ? await client.channels.fetch(game.channelId).catch(() => null) : null;
        if (ch && game.messageId) {
            const msg = await ch.messages.fetch(game.messageId).catch(() => null);
            if (msg) await msg.edit(panelPayload(game, note, true)).catch(() => {});
        }
    } catch (_) {}
}

function resultBanner(game) {
    if (!game.dead && !game.cashed) return null;
    if (game.fun) {
        return game.dead
            ? '\ud83d\udca5 **Boom!** A divers\u00e3o acabou por aqui.'
            : '\ud83c\udfc1 **Encerrado.** Boa partida no modo divers\u00e3o.';
    }
    if (game.cashed) {
        const win = game._lastWin || potentialAt(game.amount, game.opened.size, game.bombCount);
        const profit = Math.max(0, win - game.amount);
        const casas = game.opened.size;
        return [
            '\u2705 **Saque seguro.** Voc\u00ea n\u00e3o encontrou nenhuma bomba.',
            'Acertou **' + casas + '** casa' + (casas === 1 ? '' : 's') +
                ' e levou **' + fmt(win) + '** \u2728, com lucro de **' + fmt(profit) + '**.',
            'Multi final **\u00d7' + multAt(casas, game.bombCount) + '** \u00b7 Bombas no tabuleiro **' + game.bombCount + '**'
        ].join('\n');
    }
    return [
        '\ud83d\udca5 **Explodiu!** A bomba esteve no seu caminho.',
        'Voc\u00ea perdeu a aposta de **' + fmt(game.amount) + '** \u2728.',
        'Casas seguras antes da bomba: **' + game.opened.size + '**'
    ].join('\n');
}

function panelEmbed(game, extra) {
    const opened = game.opened.size;
    const bombs = game.bombCount;
    const safeTotal = TOTAL - bombs;
    const freeLeft = Math.max(0, safeTotal - opened);
    const curM = multAt(opened, bombs);
    const nextM = opened < safeTotal ? multAt(opened + 1, bombs) : curM;
    const gain = multGainNext(opened, bombs);
    const perBomb = multPerBombHint(opened, bombs);
    const curPay = potentialAt(game.amount, opened, bombs);
    const nextPay = potentialAt(game.amount, opened + 1, bombs);

    let status = '\ud83d\udfe2 Em jogo';
    let color = 0x38bdf8;
    if (game.dead) {
        status = '\ud83d\udca5 Explodiu';
        color = 0xef4444;
    } else if (game.cashed) {
        status = game.fun ? '\ud83c\udfc1 Encerrado' : '\ud83d\udcb0 Sacado';
        color = 0x22c55e;
    }

    const lines = [
        '**' + status + '**',
        '',
        game.fun ? '\ud83c\udfae Modo divers\u00e3o \u00b7 sem aposta' : '\u2728 Aposta **' + fmt(game.amount) + '**',
        '\ud83d\udca3 Bombas **' + bombs + '** / ' + TOTAL + '  \u00b7  \ud83d\udc8e Seguras **' + safeTotal + '**',
        '\u2705 Abertas **' + opened + '**  \u00b7  \ud83d\udfe2 Restam **' + freeLeft + '** gemas'
    ];

    lines.push('', '**Multiplicador**');
    lines.push('\ud83d\udcc8 Atual **\u00d7' + curM.toFixed(2) + '**');
    if (!game.fun && opened > 0) {
        lines.push('\ud83d\udcb0 Saque agora \u2728 **' + fmt(curPay) + '**');
    }
    if (!game.dead && !game.cashed && opened < safeTotal) {
        lines.push(
            '\u23e9 Pr\u00f3xima gema **\u00d7' + nextM.toFixed(2) + '** (\u00d7+' + gain.toFixed(2) + ' por casa)' +
                (game.fun ? '' : ' \u2192 \u2728 **' + fmt(nextPay) + '**')
        );
    }
    if (perBomb != null && opened > 0) {
        lines.push('\ud83d\udca3 B\u00f4nus m\u00e9dio por bomba extra: **\u00d7+' + perBomb.toFixed(2) + '**');
    }

    const banner = resultBanner(game);
    if (banner) lines.push('', banner);
    if (extra) lines.push('', extra);

    const emb = new EmbedBuilder()
        .setColor(color)
        .setTitle('\ud83d\udc8e  Mines \u00b7 4\u00d74')
        .setDescription(lines.join('\n'));

    if (!game.dead && !game.cashed) {
        emb.setFooter({
            text: 'Escolha uma casa ou use Aleat\u00f3rio. Sacar garante o valor atual sem risco de bomba.'
        });
    } else if (game.cashed && !game.fun) {
        const win = game._lastWin || potentialAt(game.amount, game.opened.size, game.bombCount);
        const profit = Math.max(0, win - game.amount);
        emb.setFooter({
            text:
                'Sacou sem bomba \u00b7 ' +
                game.opened.size +
                ' casa(s) \u00b7 levou ' +
                fmt(win) +
                ' \u2728 \u00b7 lucro ' +
                fmt(profit)
        });
    } else if (game.dead) {
        emb.setFooter({ text: 'Fim de jogo \u00b7 a pr\u00f3xima partida pode ser a sua.' });
    }

    if (game.cashed && !game.fun) {
        const u = minesResultThumb('win');
        if (u) emb.setThumbnail(u);
    } else if (game.dead) {
        const u = minesResultThumb('lose');
        if (u) emb.setThumbnail(u);
    }

    return emb;
}

function boardRows(game, reveal = false) {
    const ended = game.dead || game.cashed || reveal;
    const rows = [];
    for (let y = 0; y < ROWS; y++) {
        const row = new ActionRowBuilder();
        for (let x = 0; x < COLS; x++) {
            const i = y * COLS + x;
            const num = String(i + 1);
            const opened = game.opened.has(i);
            const bomb = game.bombs.has(i);
            let label = '\u00b7';
            let style = ButtonStyle.Secondary;
            if (ended) {
                if (bomb) {
                    label = '\ud83d\udca3';
                    style = ButtonStyle.Danger;
                } else if (opened) {
                    label = '\ud83d\udc8e';
                    style = ButtonStyle.Success;
                } else {
                    label = num;
                    style = ButtonStyle.Secondary;
                }
            } else if (opened) {
                label = '\ud83d\udc8e';
                style = ButtonStyle.Success;
            } else {
                label = num;
                style = ButtonStyle.Primary;
            }
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('minas:cell:' + game.id + ':' + i)
                    .setLabel(label.slice(0, 80))
                    .setStyle(style)
                    .setDisabled(ended || opened)
            );
        }
        rows.push(row);
    }
    return rows;
}

function controlsRow(game) {
    const ended = game.dead || game.cashed;
    const pot = potentialAt(game.amount, game.opened.size, game.bombCount);
    const canCash = game.opened.size > 0 && !ended;
    let cashLabel = game.fun ? 'Encerrar' : 'Sacar \u2728 ' + fmt(pot);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:random:' + game.id)
            .setLabel('Aleat\u00f3rio')
            .setEmoji('\ud83c\udfb2')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(ended),
        new ButtonBuilder()
            .setCustomId('minas:refresh:' + game.id)
            .setLabel('Atualizar')
            .setEmoji('\ud83d\udd04')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('minas:cash:' + game.id)
            .setLabel(cashLabel.slice(0, 80))
            .setEmoji(game.fun ? '\ud83c\udfc1' : '\ud83d\udcb5')
            .setStyle(ButtonStyle.Success)
            .setDisabled(ended || (!game.fun && !canCash))
    );
}

function againRow(game) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:again:' + game.id)
            .setLabel('Tentar novamente')
            .setEmoji('\ud83d\udd01')
            .setStyle(ButtonStyle.Primary)
    );
}

function fullComponents(game, reveal = false) {
    const ended = game.dead || game.cashed || reveal;
    if (ended) return [...boardRows(game, true), againRow(game)];
    return [...boardRows(game, false), controlsRow(game)];
}

function makeGame(userId, amount, bombCount, fun, meta = {}) {
    const id = userId + '_' + Date.now();
    const bombs = new Set();
    const maxBombs = Math.min(Math.max(1, bombCount), MAX_BOMBS, TOTAL - 1);
    while (bombs.size < maxBombs) bombs.add(Math.floor(Math.random() * TOTAL));
    const g = {
        id,
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
        _lastWin: 0,
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

function endPayload(game, note) {
    return panelPayload(game, note || null, true);
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mine'],
    description: 'Jogo Mines 4x4',
    data: null,

    async execute(message, args, client) {
        let fun = false;
        let amount = 0;
        let bombCount = 3;
        if (!args.length || ['fun', 'diversao', 'divers\u00e3o'].includes(String(args[0]).toLowerCase())) {
            fun = true;
            bombCount = Math.min(MAX_BOMBS, Math.max(1, parseInt(args[1], 10) || 3));
        } else if (args.length === 1) {
            const bet = resolveBet(args[0], eter.get(message.author.id), { label: '\u2728' });
            if (!bet.ok) return message.reply('\u274c ' + bet.error);
            eter.remove(message.author.id, bet.amount, { reason: 'mines bet' });
            amount = bet.amount;
        } else {
            bombCount = Math.min(MAX_BOMBS, Math.max(1, parseInt(args[0], 10) || 3));
            const bet = resolveBet(args[1], eter.get(message.author.id), { label: '\u2728' });
            if (!bet.ok) return message.reply('\u274c ' + bet.error);
            eter.remove(message.author.id, bet.amount, { reason: 'mines bet' });
            amount = bet.amount;
        }

        const game = makeGame(message.author.id, amount, bombCount, fun, {
            channelId: message.channel.id
        });
        const msg = await message.reply(panelPayload(game));
        game.messageId = msg.id;
        touch(game, client || message.client);
    },

    async handleComponent(interaction, client) {
        const parts = (interaction.customId || '').split(':');
        if (parts[0] !== 'minas') return;
        const action = parts[1];
        const gameId = parts[2];
        const game = games.get(gameId);

        if (!game) {
            return interaction.reply({ content: 'Partida expirada.', flags: 64 });
        }
        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: 'N\u00e3o \u00e9 a sua partida.', flags: 64 });
        }

        if (action === 'again') {
            let amount = game.amount;
            const fun = game.fun;
            const bombCount = game.bombCount;
            if (!fun) {
                const bet = resolveBet(String(game.amount), eter.get(game.userId), { label: '\u2728' });
                if (!bet.ok) {
                    return interaction.reply({ content: '\u274c ' + bet.error, flags: 64 });
                }
                eter.remove(game.userId, bet.amount, { reason: 'mines again' });
                amount = bet.amount;
            }
            games.delete(gameId);
            clearTimer(game);
            const ng = makeGame(game.userId, amount, bombCount, fun, {
                channelId: interaction.channelId
            });
            await interaction.update(panelPayload(ng));
            ng.messageId = interaction.message.id;
            ng.channelId = interaction.channelId;
            touch(ng, client);
            return;
        }

        if ((game.dead || game.cashed) && action !== 'refresh') {
            return interaction.reply({ content: 'Jogo j\u00e1 encerrado.', flags: 64 });
        }

        touch(game, client);

        if (action === 'refresh') {
            const ended = game.dead || game.cashed;
            return interaction.update(panelPayload(game, ended ? null : '_Atualizado._', ended));
        }

        if (action === 'random') {
            const idx = pickRandom(game);
            if (idx == null) {
                return interaction.reply({ content: 'Nenhuma casa.', flags: 64 });
            }
            const res = openCell(game, idx);
            if (res.bomb || res.autoWin) return interaction.update(endPayload(game));
            return interaction.update(
                panelPayload(
                    game,
                    '\ud83c\udfb2 Abriu **#' + (idx + 1) + '** \u00b7 multi \u00d7**' + multAt(game.opened.size, game.bombCount) + '**'
                )
            );
        }

        if (action === 'cash') {
            if (game.fun) {
                game.cashed = true;
                return interaction.update(endPayload(game));
            }
            if (!game.opened.size) {
                return interaction.reply({
                    content: 'Abra pelo menos uma casa antes de sacar.',
                    flags: 64
                });
            }
            game.cashed = true;
            const win = potentialAt(game.amount, game.opened.size, game.bombCount);
            game._lastWin = win;
            eter.add(game.userId, win, { reason: 'mines cash' });
            return interaction.update(endPayload(game));
        }

        if (action === 'cell') {
            const idx = parseInt(parts[3], 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= TOTAL) {
                return interaction.reply({ content: 'Casa inv\u00e1lida.', flags: 64 });
            }
            if (game.opened.has(idx)) return interaction.deferUpdate().catch(() => {});
            const res = openCell(game, idx);
            if (res.bomb || res.autoWin) return interaction.update(endPayload(game));
            return interaction.update(panelPayload(game));
        }
    }
};
