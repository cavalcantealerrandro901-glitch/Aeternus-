const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const flocos = require('../utils/flocos');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

/**
 * 4 colunas × 4 linhas = 16 casas
 * row4: Aleatório | Atualizar
 * row5: Sacar / Encerrar
 * (Discord max 5 ActionRows; texto entre botões só no embed)
 */
const COLS = 4;
const ROWS = 4;
const TOTAL = COLS * ROWS;
const MAX_BOMBS = 11;
const HOUSE = 0.96;
const IDLE_MS = 7 * 60 * 1000;
const BOMB_CHANCE = 0.26; // 26% de chance de bomba no botão aleatório

const games = new Map();

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

    let note = '⏱️ **7 min sem interação** — partida encerrada.';
    if (game.opened.size > 0 && !game.fun && game.amount > 0) {
        const win = potentialAt(game.amount, game.opened.size, game.bombCount);
        game.cashed = true;
        game._lastWin = win;
        flocos.add(game.userId, win, { reason: 'mines auto' });
        note += `\n💵 Saque automático: ❄️ **${fmt(win)}**`;
    } else if (game.opened.size > 0 && game.fun) {
        game.cashed = true;
        note += '\n🏁 Diversão encerrada.';
    } else {
        game.dead = true;
        if (!game.fun) note += `\nPrejuízo: ❄️ **${fmt(game.amount)}** (nenhuma casa).`;
    }
    clearTimer(game);

    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        const msg = ch ? await ch.messages.fetch(game.messageId).catch(() => null) : null;
        if (msg) {
            await msg
                .edit({
                    content: `<@${game.userId}>`,
                    embeds: [panelEmbed(game, note)],
                    components: fullComponents(game, true)
                })
                .catch(() => {});
        }
    } catch (_) {}
}

function resultBanner(game) {
    if (!game.dead && !game.cashed) return null;
    if (game.fun) {
        return game.dead
            ? '💢 *Mina…* Você pode tentar novamente.'
            : '✨ *Campo encerrado no modo diversão.*';
    }
    if (game.cashed && !game.dead) {
        const win = game._lastWin || potentialAt(game.amount, game.opened.size, game.bombCount);
        const profit = win - game.amount;
        return [
            `🎉 **Você ganhou!**`,
            `❄️ Recebeu **${fmt(win)}** flocos`,
            `📊 Lucro **+${fmt(Math.max(0, profit))}** · Multi ×**${multAt(game.opened.size, game.bombCount)}**`,
            `💎 Gemas **${game.opened.size}** · 💣 Minas **${game.bombCount}**`
        ].join('\n');
    }
    // perdeu
    return [
        `😢 **Você perdeu.**`,
        `💸 Prejuízo de ❄️ **${fmt(game.amount)}** flocos`,
        `_Tente novamente — a próxima pode ser sua._`
    ].join('\n');
}

function panelEmbed(game, extra) {
    const opened = game.opened.size;
    const bombs = game.bombCount;
    const safeTotal = TOTAL - bombs;
    const freeLeft = Math.max(0, safeTotal - opened);
    const curM = multAt(opened, bombs);
    const nextM = opened < safeTotal ? multAt(opened + 1, bombs) : curM;
    const curPay = potentialAt(game.amount, opened, bombs);
    const nextPay = potentialAt(game.amount, opened + 1, bombs);

    let status = '🟢 Em jogo';
    let color = 0x38bdf8;
    if (game.dead) {
        status = '💥 Explodiu';
        color = C.lose;
    } else if (game.cashed) {
        status = game.fun ? '🏁 Encerrado' : '💰 Sacado';
        color = C.win;
    }

    // frase "meia apagada" (depois dos botões aleatório/atualizar, no embed)
    const softPhrase =
        game.dead || game.cashed
            ? null
            : '-# Toque em uma casa ou use **Aleatório**. O multi sobe a cada gema.';

    const lines = [
        `**${status}**`,
        '',
        game.fun ? '🎮 Modo diversão · sem aposta' : `❄️ Aposta **${fmt(game.amount)}** flocos`,
        `💎 Abertas **${opened}** / **${safeTotal}**  ·  💣 Minas **${bombs}**`,
        `🟩 Livres **${freeLeft}** / **${safeTotal}**  ·  📦 Casas **${TOTAL}**`
    ];

    if (!game.fun) {
        lines.push(
            `📈 Multi atual **×${curM}**${opened > 0 ? ` → ❄️ **${fmt(curPay)}**` : ''}`,
            opened < safeTotal && !game.dead && !game.cashed
                ? `⏭️ Próximo multi **×${nextM}** → ❄️ **${fmt(nextPay)}** _(abrir +1)_`
                : null
        );
    }

    if (softPhrase) lines.push('', softPhrase);

    const banner = resultBanner(game);
    if (banner) lines.push('', banner);
    if (extra) lines.push('', extra);

    return new EmbedBuilder()
        .setColor(color)
        .setTitle('💎  Mines · 4×4')
        .setDescription(lines.filter((x) => x != null).join('\n'))
        .setFooter({
            text: game.fun
                ? 'O.mines <1-11> · AFK 7 min'
                : `Flocos ❄️ · AFK 7 min · ${betFooter()}`
        })
        .setTimestamp();
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
            let label = '·';
            let style = ButtonStyle.Secondary;
            if (ended) {
                if (bomb) {
                    label = `💣${num}`;
                    style = ButtonStyle.Danger;
                } else if (opened) {
                    label = `💎${num}`;
                    style = ButtonStyle.Success;
                } else label = num;
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

function topControls(game) {
    const ended = game.dead || game.cashed;
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
    );
}

function cashRow(game) {
    const ended = game.dead || game.cashed;
    const pot = potentialAt(game.amount, game.opened.size, game.bombCount);
    const canCash = game.opened.size > 0 && !ended;

    let label = game.fun ? 'Encerrar' : 'Sacar';
    if (!game.fun && canCash) label = `Sacar ❄️ ${fmt(pot)}`;

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`minas:cash:${game.id}`)
            .setLabel(label.slice(0, 80))
            .setEmoji(game.fun ? '🏁' : '💵')
            .setStyle(ButtonStyle.Success)
            .setDisabled(ended || (!game.fun && !canCash))
    );
}

function againRow(game) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`minas:again:${game.id}`)
            .setLabel('Tentar novamente')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary)
    );
}

function fullComponents(game, reveal = false) {
    const ended = game.dead || game.cashed || reveal;
    if (ended) {
        // tabuleiro revelado + tentar novamente
        return [...boardRows(game, true), againRow(game)];
    }
    // grade + aleatório/atualizar + sacar
    return [...boardRows(game, false), topControls(game), cashRow(game)];
}

function makeGame(userId, amount, bombCount, fun, meta = {}) {
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
        cashed: false,
        _lastWin: 0,
        channelId: meta.channelId || null,
        messageId: meta.messageId || null,
        _timer: null
    };
    games.set(id, g);
    return g;
}

// Função para obter vizinhos de uma célula
function getNeighbors(idx) {
    const neighbors = [];
    const row = Math.floor(idx / COLS);
    const col = idx % COLS;

    for (let r = Math.max(0, row - 1); r <= Math.min(ROWS - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(COLS - 1, col + 1); c++) {
            const nIdx = r * COLS + c;
            if (nIdx !== idx) neighbors.push(nIdx);
        }
    }
    return neighbors;
}

// Função para abrir casas ao redor de uma bomba
function openAdjacentCells(game, bombIdx) {
    const neighbors = getNeighbors(bombIdx);
    const toOpen = [];
    
    for (const nIdx of neighbors) {
        if (!game.opened.has(nIdx) && !game.bombs.has(nIdx)) {
            toOpen.push(nIdx);
        }
    }
    
    // Abrir as casas adjacentes
    toOpen.forEach(idx => game.opened.add(idx));
    return toOpen;
}

function openCell(game, idx) {
    if (game.dead || game.cashed || game.opened.has(idx)) return { ok: false };
    if (game.bombs.has(idx)) {
        game.dead = true;
        clearTimer(game);
        // Abrir casas adjacentes à bomba
        openAdjacentCells(game, idx);
        return { ok: true, bomb: true };
    }
    game.opened.add(idx);
    if (game.opened.size >= TOTAL - game.bombCount) {
        game.cashed = true;
        clearTimer(game);
        let win = 0;
        if (!game.fun && game.amount > 0) {
            win = potentialAt(game.amount, game.opened.size, game.bombCount);
            game._lastWin = win;
            flocos.add(game.userId, win, { reason: 'mines clear' });
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
    
    // 26% de chance de escolher uma bomba se houver disponível
    if (any.length > 0 && game.bombs.size > 0 && Math.random() < BOMB_CHANCE) {
        const bombPool = any.filter(i => game.bombs.has(i));
        if (bombPool.length > 0) {
            return bombPool[Math.floor(Math.random() * bombPool.length)];
        }
    }
    
    // Caso contrário, escolher uma casa segura ou qualquer uma
    const pool = safe.length ? safe : any;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function endPayload(game, note) {
    clearTimer(game);
    return {
        content: `<@${game.userId}>`,
        embeds: [panelEmbed(game, note || null)],
        components: fullComponents(game, true)
    };
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mine', 'campo'],
    description: 'Mines 4×4 em flocos',

    async execute(message, args, client) {
        const bombsRaw = parseInt(args[0], 10);
        if (!Number.isFinite(bombsRaw) || bombsRaw < 1 || bombsRaw > MAX_BOMBS) {
            return message.reply(
                [
                    '💎 **Mines 4×4** · moeda ❄️ flocos',
                    '🎮 `O.mines <1-11>` — diversão',
                    '❄️ `O.mines <bombas> <valor|all|half>` — aposta',
                    '⏱️ AFK 7 min → saque automático se houver gemas.'
                ].join('\n')
            );
        }

        let game;
        if (args[1] == null || args[1] === '') {
            game = makeGame(message.author.id, 0, bombsRaw, true);
        } else {
            const bet = resolveBet(args[1], flocos.get(message.author.id), { label: '❄️' });
            if (!bet.ok) return message.reply(`❌ ${bet.error}`);
            flocos.remove(message.author.id, bet.amount, { reason: 'mines bet' });
            game = makeGame(message.author.id, bet.amount, bombsRaw, false);
        }

        const msg = await message.reply({
            embeds: [panelEmbed(game)],
            components: fullComponents(game)
        });
        game.channelId = msg.channel.id;
        game.messageId = msg.id;
        touch(game, client || message.client);
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const game = games.get(parts[2]);
        const client = interaction.client;

        if (!game) {
            return interaction.reply({
                content: '⏱️ Jogo expirado.',
                ephemeral: true
            });
        }
        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: 'Não é o seu Mines.', ephemeral: true });
        }

        if (action === 'again') {
            let ng;
            if (game.fun) {
                ng = makeGame(game.userId, 0, game.bombCount, true);
            } else {
                const bet = resolveBet(String(game.amount), flocos.get(game.userId), { label: '❄️' });
                if (!bet.ok) {
                    return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
                }
                flocos.remove(game.userId, bet.amount, { reason: 'mines again' });
                ng = makeGame(game.userId, bet.amount, game.bombCount, false);
            }
            clearTimer(game);
            games.delete(parts[2]);

            await interaction.update({
                content: `<@${game.userId}> · nova mesa`,
                embeds: [panelEmbed(ng)],
                components: fullComponents(ng)
            });
            ng.messageId = interaction.message.id;
            ng.channelId = interaction.channelId;
            touch(ng, client);
            return;
        }

        if ((game.dead || game.cashed) && action !== 'refresh') {
            return interaction.reply({ content: 'Jogo já encerrado.', ephemeral: true });
        }

        touch(game, client);

        if (action === 'refresh') {
            const ended = game.dead || game.cashed;
            return interaction.update({
                embeds: [panelEmbed(game, ended ? null : '_Atualizado._')],
                components: fullComponents(game, ended)
            });
        }

        if (action === 'random') {
            const idx = pickRandom(game);
            if (idx == null) {
                return interaction.reply({ content: 'Nenhuma casa.', ephemeral: true });
            }
            const res = openCell(game, idx);
            if (res.bomb || res.autoWin) return interaction.update(endPayload(game));
            return interaction.update({
                embeds: [panelEmbed(game, `🎲 Abriu **#${idx + 1}**`)],
                components: fullComponents(game)
            });
        }

        if (action === 'cash') {
            if (game.fun) {
                game.cashed = true;
                return interaction.update(endPayload(game));
            }
            if (!game.opened.size) {
                return interaction.reply({
                    content: 'Abra pelo menos uma casa antes de sacar.',
                    ephemeral: true
                });
            }
            game.cashed = true;
            const win = potentialAt(game.amount, game.opened.size, game.bombCount);
            game._lastWin = win;
            flocos.add(game.userId, win, { reason: 'mines cash' });
            return interaction.update(endPayload(game));
        }

        if (action === 'cell') {
            const idx = parseInt(parts[3], 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= TOTAL) {
                return interaction.reply({ content: 'Casa inválida.', ephemeral: true });
            }
            if (game.opened.has(idx)) return interaction.deferUpdate().catch(() => {});
            const res = openCell(game, idx);
            if (res.bomb || res.autoWin) return interaction.update(endPayload(game));
            return interaction.update({
                embeds: [panelEmbed(game)],
                components: fullComponents(game)
            });
        }
    }
};
