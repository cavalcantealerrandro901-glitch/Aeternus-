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
const minesCash = require('../utils/minesCashButton');
const { fullComponents } = require('../utils/minesBoard');
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

const games = new Map();

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
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
        files.push(new (require('discord.js').AttachmentBuilder)(WIN_IMG_PATH, { name: 'mines-win.jpg' }));
    } else if (game.dead && fs.existsSync(LOSE_IMG_PATH)) {
        files.push(new (require('discord.js').AttachmentBuilder)(LOSE_IMG_PATH, { name: 'mines-lose.jpg' }));
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

function clearTimer(game) {
    if (game?._timer) {
        clearTimeout(game._timer);
        game._timer = null;
    }
}

function touch(game, client) {
    game._last = Date.now();
    clearTimer(game);
    game._timer = setTimeout(() => {
        if (!games.has(game.id) || game.dead || game.cashed) return;
        game.cashed = true;
        if (!game.fun && game.opened.size > 0) {
            const win = potentialAt(game.amount, game.opened.size, game.bombCount);
            game._lastWin = win;
            eter.add(game.userId, win, { reason: 'mines idle cash' });
        } else if (!game.fun && game.opened.size === 0) {
            game.cashed = true;
            eter.add(game.userId, game.amount, { reason: 'mines idle refund' });
        }
        games.delete(game.id);
        if (client && game.channelId && game.messageId) {
            client.channels
                .fetch(game.channelId)
                .then((ch) => ch.messages.fetch(game.messageId))
                .then(async (m) => {
                    await m.edit(endPayload(game, '_Partida expirada por inatividade._'));
                    await minesCash.syncCashMessage(client, game, potentialAt);
                })
                .catch(() => {});
        }
    }, IDLE_MS);
}

function multAt(opened, bombs) {
    if (opened <= 0) return 1;
    let m = 1;
    for (let i = 0; i < opened; i++) {
        const left = TOTAL - i;
        const safe = left - bombs;
        if (safe <= 0 || left <= 0) break;
        m *= (left / safe) * HOUSE;
    }
    return Math.max(1, Math.round(m * 100) / 100);
}

function potentialAt(amount, opened, bombs) {
    return Math.floor(Number(amount || 0) * multAt(opened, bombs));
}

function eterRankFooter(userId) {
    const bal = eter.get(userId);
    const entries = Object.entries(eter.all() || {})
        .map(([id, v]) => ({ id, value: Number(v || 0) }))
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value);
    const idx = entries.findIndex((e) => e.id === String(userId));
    const total = entries.length || 1;
    if (idx < 0) {
        return '_🏆 Rank · sem posição global · saldo ✨ ' + fmt(bal) + ' · O.rank_';
    }
    const pos = idx + 1;
    let medal = '#' + pos;
    if (pos === 1) medal = '🥇 #1';
    else if (pos === 2) medal = '🥈 #2';
    else if (pos === 3) medal = '🥉 #3';
    return '_🏆 Rank global ' + medal + ' de ' + total + ' · ✨ ' + fmt(bal) + ' · O.rank_';
}

function resultBanner(game) {
    if (!game.dead && !game.cashed) return null;
    if (game.cashed && game.fun) return '🏁 **Partida encerrada** (modo diversão · sem éter).';
    if (game.cashed && !game.fun) {
        const win = game._lastWin || potentialAt(game.amount, game.opened.size, game.bombCount);
        const profit = Math.max(0, win - game.amount);
        const casas = game.opened.size;
        return [
            '✅ **Saque seguro.** Você não encontrou nenhuma bomba.',
            'Acertou **' + casas + '** casa' + (casas === 1 ? '' : 's') +
                ' e levou **' + fmt(win) + '** ✨, com lucro de **' + fmt(profit) + '**.',
            'Multi final **×' + multAt(casas, game.bombCount) + '** · Bombas no tabuleiro **' + game.bombCount + '**'
        ].join('\n');
    }
    return [
        '💥 **Explodiu!** A bomba esteve no seu caminho.',
        'Você perdeu a aposta de **' + fmt(game.amount) + '** ✨.',
        'Casas seguras antes da bomba: **' + game.opened.size + '**'
    ].join('\n');
}

function tipPhrase(game) {
    if (game.dead || game.cashed) return null;
    return (
        '_Clique nas casas do tabuleiro para ganhar mais e aumentar seu multiplicador, ' +
        'mas lembre-se: quanto mais você abre, mais chances de você perder._'
    );
}

function panelEmbed(game, extra) {
    const opened = game.opened.size;
    const bombs = game.bombCount;
    const safeTotal = TOTAL - bombs;
    const freeLeft = Math.max(0, safeTotal - opened);
    const curM = multAt(opened, bombs);
    const nextM = opened < safeTotal ? multAt(opened + 1, bombs) : curM;
    const nextPay = potentialAt(game.amount, opened + 1, bombs);
    const curPay = potentialAt(game.amount, opened, bombs);

    let status = '🟢 Em jogo';
    let color = 0x38bdf8;
    if (game.dead) {
        status = '💥 Explodiu';
        color = 0xef4444;
    } else if (game.cashed) {
        status = game.fun ? '🏁 Encerrado' : '💰 Sacado';
        color = 0x22c55e;
    }

    const lines = [];
    lines.push('**' + status + '**');
    lines.push('');
    lines.push(
        game.fun
            ? '**Aposta** · modo diversão (sem éter)'
            : '**Aposta** · ✨ **' + fmt(game.amount) + '**'
    );
    lines.push(
        '**Casas** · 💣 **' + bombs + '** bombas · abertas **' + opened + '** / restam **' + freeLeft + '** gemas'
    );
    lines.push('**Multiplicador** · **×' + curM.toFixed(2) + '**');
    if (!game.dead && !game.cashed && opened < safeTotal) {
        lines.push(
            '**Próximo multiplicador** · **×' + nextM.toFixed(2) + '**' +
                (game.fun ? '' : ' · próximo ganho ✨ **' + fmt(nextPay) + '**')
        );
    } else if (!game.fun && opened > 0) {
        lines.push('**Valor atual** · ✨ **' + fmt(curPay) + '**');
    }

    const banner = resultBanner(game);
    if (banner) {
        lines.push('');
        lines.push(banner);
    }
    if (extra) {
        lines.push('');
        lines.push(extra);
    }

    const tip = tipPhrase(game);
    if (tip) {
        lines.push('');
        lines.push(tip);
    }
    lines.push(eterRankFooter(game.userId));

    const emb = new EmbedBuilder()
        .setColor(color)
        .setTitle('💎  Mines · 4×4')
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
        cashMessageId: null,
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

        const low = args.map((a) => String(a).toLowerCase());
        if (low.includes('fun') || low.includes('diversao') || low.includes('diversão')) {
            fun = true;
        }

        if (!fun) {
            const raw = args.find((a) => !/^(fun|diversao|diversão)$/i.test(a) && a);
            if (!raw) {
                return message.reply('Uso: `O.minas <valor> [bombas]` ou `O.minas fun [bombas]`');
            }
            const bet = resolveBet(String(raw), eter.get(message.author.id), { label: '✨' });
            if (!bet.ok) return message.reply('❌ ' + bet.error);
            amount = bet.amount;
            eter.remove(message.author.id, amount, { reason: 'mines bet' });
        }

        const bombArg = args.find((a) => /^\d+$/.test(a) && Number(a) >= 1 && Number(a) <= MAX_BOMBS);
        if (bombArg) bombCount = Math.min(MAX_BOMBS, Math.max(1, Number(bombArg)));

        for (const [id, g] of games) {
            if (g.userId === message.author.id && !g.dead && !g.cashed) {
                games.delete(id);
                clearTimer(g);
            }
        }

        const game = makeGame(message.author.id, amount, bombCount, fun, {
            channelId: message.channel.id
        });
        const msg = await message.reply(panelPayload(game));
        game.messageId = msg.id;
        game.channelId = message.channel.id;
        await minesCash.syncCashMessage(client, game, potentialAt);
        touch(game, client);
    },

    async executeSlash(i) {
        return i.reply({ content: 'Use o prefixo: `O.minas <valor> [bombas]`', flags: 64 });
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
            return interaction.reply({ content: 'Não é a sua partida.', flags: 64 });
        }

        if (action === 'again') {
            let amount = game.amount;
            const fun = game.fun;
            const bombCount = game.bombCount;
            if (!fun) {
                const bet = resolveBet(String(game.amount), eter.get(game.userId), { label: '✨' });
                if (!bet.ok) {
                    return interaction.reply({ content: '❌ ' + bet.error, flags: 64 });
                }
                eter.remove(game.userId, bet.amount, { reason: 'mines again' });
                amount = bet.amount;
            }
            games.delete(gameId);
            clearTimer(game);
            await minesCash.deleteCashMessage(client, game);
            const ng = makeGame(game.userId, amount, bombCount, fun, {
                channelId: interaction.channelId
            });
            await interaction.update(panelPayload(ng));
            ng.messageId = interaction.message.id;
            ng.channelId = interaction.channelId;
            await minesCash.syncCashMessage(client, ng, potentialAt);
            touch(ng, client);
            return;
        }

        if ((game.dead || game.cashed) && action !== 'refresh') {
            return interaction.reply({ content: 'Jogo já encerrado.', flags: 64 });
        }

        touch(game, client);

        if (action === 'refresh') {
            const ended = game.dead || game.cashed;
            await interaction.update(panelPayload(game, ended ? null : '_Atualizado._', ended));
            await minesCash.syncCashMessage(client, game, potentialAt);
            return;
        }

        if (action === 'random') {
            const idx = pickRandom(game);
            if (idx == null) {
                return interaction.reply({ content: 'Nenhuma casa.', flags: 64 });
            }
            const res = openCell(game, idx);
            if (res.bomb || res.autoWin) {
                await interaction.update(endPayload(game));
                await minesCash.syncCashMessage(client, game, potentialAt);
                return;
            }
            await interaction.update(
                panelPayload(
                    game,
                    '🎲 Abriu **#' + (idx + 1) + '** · multi ×**' + multAt(game.opened.size, game.bombCount) + '**'
                )
            );
            await minesCash.syncCashMessage(client, game, potentialAt);
            return;
        }

        if (action === 'cell') {
            const idx = Number(parts[3]);
            if (!Number.isInteger(idx) || idx < 0 || idx >= TOTAL) {
                return interaction.reply({ content: 'Casa inválida.', flags: 64 });
            }
            const res = openCell(game, idx);
            if (!res.ok) {
                return interaction.reply({ content: 'Casa já aberta.', flags: 64 });
            }
            if (res.bomb || res.autoWin) {
                await interaction.update(endPayload(game));
                await minesCash.syncCashMessage(client, game, potentialAt);
                return;
            }
            await interaction.update(
                panelPayload(
                    game,
                    '💎 Casa **#' + (idx + 1) + '** · multi ×**' + multAt(game.opened.size, game.bombCount) + '**'
                )
            );
            await minesCash.syncCashMessage(client, game, potentialAt);
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

            if (onCashMsg) {
                await interaction.update(minesCash.cashPayload(game, potentialAt));
                try {
                    const ch = interaction.channel;
                    const main = await ch.messages.fetch(game.messageId);
                    await main.edit(end);
                } catch (_) {}
            } else {
                await interaction.update(end);
                await minesCash.syncCashMessage(client, game, potentialAt);
            }
            return;
        }
    }
};
