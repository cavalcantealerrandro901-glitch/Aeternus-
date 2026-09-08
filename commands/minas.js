const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
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
                .then((m) => m.edit(endPayload(game, '_Partida expirada por inatividade._')))
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

function resultBanner(game) {
    if (!game.dead && !game.cashed) return null;
    if (game.cashed && game.fun) {
        return '🏁 **Partida encerrada** (modo diversão · sem éter).';
    }
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

function boardText(game, reveal = false) {
    const ended = game.dead || game.cashed || reveal;
    const lines = [];
    for (let y = 0; y < ROWS; y++) {
        const cells = [];
        for (let x = 0; x < COLS; x++) {
            const i = y * COLS + x;
            const opened = game.opened.has(i);
            const bomb = game.bombs.has(i);
            if (ended) {
                if (bomb) cells.push('💣');
                else if (opened) cells.push('💎');
                else cells.push('⬜');
            } else if (opened) {
                cells.push('💎');
            } else {
                cells.push('`' + String(i + 1).padStart(2, ' ') + '`');
            }
        }
        lines.push(cells.join('  '));
    }
    return lines.join('\n');
}

function tipPhrase(game) {
    if (game.dead || game.cashed) return null;
    return (
        'Clique nas casas do tabuleiro para ganhar mais e aumentar seu multiplicador, ' +
        'mas lembre-se: quanto mais você abre, mais chances de você perder.'
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
        '**Casas** · 💣 **' +
            bombs +
            '** bombas · abertas **' +
            opened +
            '** / restam **' +
            freeLeft +
            '** gemas'
    );
    lines.push('**Multiplicador** · **×' + curM.toFixed(2) + '**');
    if (!game.dead && !game.cashed && opened < safeTotal) {
        lines.push(
            '**Próximo multiplicador** · **×' +
                nextM.toFixed(2) +
                '**' +
                (game.fun ? '' : ' · próximo ganho ✨ **' + fmt(nextPay) + '**')
        );
    } else if (!game.fun && opened > 0) {
        lines.push('**Valor atual** · ✨ **' + fmt(curPay) + '**');
    }

    lines.push('');
    lines.push('────────────────────────');
    lines.push('**Tabuleiro**');
    lines.push(boardText(game, game.dead || game.cashed));
    lines.push('────────────────────────');

    const tip = tipPhrase(game);
    if (tip) {
        lines.push('');
        lines.push(tip);
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

function pickMenuRow(game) {
    const ended = game.dead || game.cashed;
    const options = [];
    for (let i = 0; i < TOTAL; i++) {
        if (game.opened.has(i)) continue;
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel('Casa ' + (i + 1))
                .setValue(String(i))
                .setDescription('Abrir a casa ' + (i + 1))
        );
    }
    if (!options.length) {
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel('Sem casas')
                .setValue('none')
                .setDescription('Nenhuma casa livre')
        );
    }
    const menu = new StringSelectMenuBuilder()
        .setCustomId('minas:pick:' + game.id)
        .setPlaceholder('Escolher casa do tabuleiro…')
        .setDisabled(ended || options[0].data.value === 'none')
        .addOptions(options.slice(0, 25));
    return new ActionRowBuilder().addComponents(menu);
}

function topControlsRow(game) {
    const ended = game.dead || game.cashed;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:random:' + game.id)
            .setLabel('Aleatório')
            .setEmoji('🎲')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(ended),
        new ButtonBuilder()
            .setCustomId('minas:refresh:' + game.id)
            .setLabel('Atualizar')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary)
    );
}

function cashRow(game) {
    const ended = game.dead || game.cashed;
    const pot = potentialAt(game.amount, game.opened.size, game.bombCount);
    const canCash = game.opened.size > 0 && !ended;
    const cashLabel = game.fun ? 'Encerrar' : 'Sacar · ✨ ' + fmt(pot);

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:cash:' + game.id)
            .setLabel(cashLabel.slice(0, 80))
            .setEmoji(game.fun ? '🏁' : '💵')
            .setStyle(ButtonStyle.Success)
            .setDisabled(ended || (!game.fun && !canCash))
    );
}

function againRow(game) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:again:' + game.id)
            .setLabel('Tentar novamente')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary)
    );
}

function fullComponents(game, reveal = false) {
    const ended = game.dead || game.cashed || reveal;
    if (ended) return [againRow(game)];
    return [pickMenuRow(game), topControlsRow(game), cashRow(game)];
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
            return interaction.reply({ content: 'Jogo já encerrado.', flags: 64 });
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
                    '🎲 Abriu **#' + (idx + 1) + '** · multi ×**' + multAt(game.opened.size, game.bombCount) + '**'
                )
            );
        }

        if (action === 'pick') {
            const raw = interaction.values?.[0];
            const idx = Number(raw);
            if (!Number.isInteger(idx) || idx < 0 || idx >= TOTAL) {
                return interaction.reply({ content: 'Casa inválida.', flags: 64 });
            }
            const res = openCell(game, idx);
            if (!res.ok) {
                return interaction.reply({ content: 'Casa já aberta.', flags: 64 });
            }
            if (res.bomb || res.autoWin) return interaction.update(endPayload(game));
            return interaction.update(
                panelPayload(
                    game,
                    '💎 Casa **#' + (idx + 1) + '** · multi ×**' + multAt(game.opened.size, game.bombCount) + '**'
                )
            );
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
            if (res.bomb || res.autoWin) return interaction.update(endPayload(game));
            return interaction.update(
                panelPayload(
                    game,
                    '💎 Casa **#' + (idx + 1) + '** · multi ×**' + multAt(game.opened.size, game.bombCount) + '**'
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
    }
};
