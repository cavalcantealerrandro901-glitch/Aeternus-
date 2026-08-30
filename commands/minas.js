const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const cristais = require('../utils/cristais');
const { resolveBet } = require('../utils/parseAmount');
const { fmt, betFooter, C } = require('../utils/gameStyle');

/** 4×4 = 16 casas · 4 rows grade + 1 row controles */
const COLS = 4;
const ROWS = 4;
const TOTAL = COLS * ROWS;
const MAX_BOMBS = 15;
const HOUSE = 0.96;
const IDLE_MS = 7 * 60 * 1000;

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
    if (!games.has(game.id)) return;
    if (game.dead || game.cashed) {
        games.delete(game.id);
        return;
    }

    let note = '⏱️ **7 min sem interação** — partida encerrada.';

    if (game.opened.size > 0 && !game.fun && game.amount > 0) {
        const win = potentialAt(game.amount, game.opened.size, game.bombCount);
        game.cashed = true;
        game._lastWin = win;
        cristais.add(game.userId, win);
        note += `\n💵 Saque automático: 💠 **${fmt(win)}**`;
    } else if (game.opened.size > 0 && game.fun) {
        game.cashed = true;
        note += '\n🏁 Diversão encerrada automaticamente.';
    } else {
        game.dead = true;
        note += game.fun
            ? ''
            : '\nNenhuma casa aberta — aposta perdida.';
    }

    clearTimer(game);

    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (!ch?.isTextBased()) {
            games.delete(game.id);
            return;
        }
        const msg = await ch.messages.fetch(game.messageId).catch(() => null);
        if (msg) {
            await msg.edit({
                content: `<@${game.userId}>`,
                embeds: [panelEmbed(game, note)],
                components: fullComponents(game, true)
            }).catch(() => {});
        }
    } catch (_) {}
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
    let phrase = 'Escolha com calma. Cada gema sobe o multi — e o risco.';

    if (game.dead) {
        status = '💥 Explodiu';
        color = C.lose;
        phrase = 'Mina no caminho. A mesa fechou.';
    } else if (game.cashed) {
        status = game.fun ? '🏁 Encerrado' : '💰 Sacado';
        color = C.win;
        phrase = game.fun
            ? 'Partida de diversão finalizada.'
            : `Lucro garantido: 💠 **${fmt(game._lastWin || curPay)}**.`;
    }

    const lines = [
        `**${status}**`,
        '',
        game.fun ? '🎮 Modo diversão · sem aposta' : `💠 Aposta **${fmt(game.amount)}**`,
        `💎 Abertas **${opened}** / **${safeTotal}**  ·  💣 Minas **${bombs}**`,
        `🟩 Livres **${freeLeft}** / **${safeTotal}**  ·  📦 Casas **${TOTAL}**`
    ];

    if (!game.fun) {
        lines.push(
            `📈 Multi atual **×${curM}**${opened > 0 ? ` → 💠 **${fmt(curPay)}**` : ''}`,
            opened < safeTotal && !game.dead && !game.cashed
                ? `⏭️ Próximo multi **×${nextM}** → 💠 **${fmt(nextPay)}** _(abrir +1)_`
                : null
        );
    }

    // frase depois da área dos botões (instrução / humor)
    lines.push('', `💬 ${phrase}`);

    if (extra) lines.push('', extra);

    return new EmbedBuilder()
        .setColor(color)
        .setTitle('💎  Mines · 4×4')
        .setDescription(lines.filter((x) => x != null).join('\n'))
        .setFooter({
            text: game.fun
                ? 'O.mines <1-15> · diversão · AFK 7 min'
                : `Multi por probabilidade · AFK 7 min · ${betFooter()}`
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
                } else {
                    label = num;
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

/**
 * Linha de controles:
 *  Aleatório | Atualizar | Sacar/Encerrar (valor se parar)
 */
function controlRow(game) {
    const ended = game.dead || game.cashed;
    const pot = potentialAt(game.amount, game.opened.size, game.bombCount);
    const canCash = game.opened.size > 0 && !ended;

    let cashLabel = game.fun ? 'Encerrar' : 'Sacar';
    if (!game.fun && canCash) cashLabel = `Sacar ${fmt(pot)}`;
    else if (!game.fun && !canCash) cashLabel = 'Sacar';

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
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`minas:cash:${game.id}`)
            .setLabel(cashLabel.slice(0, 80))
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
    if (ended) return [...boardRows(game, true), againRow(game)];
    return [...boardRows(game, false), controlRow(game)];
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
        _timer: null,
        _last: Date.now()
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
        if (!game.fun && game.amount > 0) {
            win = potentialAt(game.amount, game.opened.size, game.bombCount);
            game._lastWin = win;
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
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function endPayload(game, note) {
    clearTimer(game);
    return {
        embeds: [panelEmbed(game, note || null)],
        components: fullComponents(game, true)
    };
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mine', 'campo'],
    description: 'Mines 4×4',

    async execute(message, args, client) {
        const bombsRaw = parseInt(args[0], 10);
        if (!Number.isFinite(bombsRaw) || bombsRaw < 1 || bombsRaw > MAX_BOMBS) {
            return message.reply(
                [
                    '💎 **Mines 4×4**',
                    '🎮 `O.mines <1-15>` — diversão',
                    '💠 `O.mines <bombas> <valor|all|half>` — aposta',
                    '⏱️ Sem interação por **7 min** → saque automático se houver gemas.'
                ].join('\n')
            );
        }

        let game;
        if (args[1] == null || args[1] === '') {
            game = makeGame(message.author.id, 0, bombsRaw, true);
        } else {
            const bet = resolveBet(args[1], cristais.get(message.author.id), { label: '💠' });
            if (!bet.ok) return message.reply(`❌ ${bet.error}`);
            cristais.remove(message.author.id, bet.amount);
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
                content: '⏱️ Jogo expirado. Use o comando de novo.',
                ephemeral: true
            });
        }
        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: 'Não é o seu Mines.', ephemeral: true });
        }

        // ── Tentar novamente → nova partida + menção ───────────────
        if (action === 'again') {
            let ng;
            if (game.fun) {
                ng = makeGame(game.userId, 0, game.bombCount, true, {
                    channelId: interaction.channelId
                });
            } else {
                const bet = resolveBet(String(game.amount), cristais.get(game.userId), {
                    label: '💠'
                });
                if (!bet.ok) {
                    return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
                }
                cristais.remove(game.userId, bet.amount);
                ng = makeGame(game.userId, bet.amount, game.bombCount, false, {
                    channelId: interaction.channelId
                });
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

        if (game.dead || game.cashed) {
            if (action !== 'refresh') {
                return interaction.reply({ content: 'Jogo já encerrado.', ephemeral: true });
            }
        }

        touch(game, client);

        if (action === 'refresh') {
            const ended = game.dead || game.cashed;
            return interaction.update({
                embeds: [panelEmbed(game, ended ? null : '_Painel atualizado._')],
                components: fullComponents(game, ended)
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
                return interaction.update(endPayload(game, `Casa **#${idx + 1}** era mina.`));
            }
            if (res.autoWin) return interaction.update(endPayload(game));
            return interaction.update({
                embeds: [panelEmbed(game, `🎲 Abriu **#${idx + 1}**`)],
                components: fullComponents(game)
            });
        }

        if (action === 'cash') {
            if (game.dead || game.cashed) {
                return interaction.reply({ content: 'Indisponível.', ephemeral: true });
            }
            if (game.fun) {
                game.cashed = true;
                return interaction.update(endPayload(game, 'Partida de diversão encerrada.'));
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
            cristais.add(game.userId, win);
            return interaction.update(
                endPayload(game, `Saldo: 💠 **${fmt(cristais.get(game.userId))}**`)
            );
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
                return interaction.update(endPayload(game, `Casa **#${idx + 1}** era mina.`));
            }
            if (res.autoWin) return interaction.update(endPayload(game));
            return interaction.update({
                embeds: [panelEmbed(game)],
                components: fullComponents(game)
            });
        }
    }
};
