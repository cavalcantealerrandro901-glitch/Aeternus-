const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const eter = require('../utils/eter');
const { resolveBet } = require('../utils/parseAmount');

/** Grade 4×4 · Discord max 5 rows de botões */
const COLS = 4;
const ROWS = 4;
const TOTAL = COLS * ROWS; // 16
const MAX_BOMBS = 11;
const HOUSE = 0.97; // casa do bot
const IDLE_MS = 7 * 60 * 1000;

const games = new Map();

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

/**
 * Multiplicador progressivo estilo Mines:
 * - Cada gema (casa segura) multiplica pelo risco restante
 * - Mais bombas ⇒ menos casas seguras ⇒ multi sobe mais rápido
 */
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

/** Multi extra ganho ao abrir a próxima gema (delta) */
function multGainNext(opened, bombs) {
    const cur = multAt(opened, bombs);
    const next = multAt(opened + 1, bombs);
    return Number(Math.max(0, next - cur).toFixed(2));
}

/** Multi médio por bomba (comparando 1 bomba vs N bombas na mesma quantidade de gemas) */
function multPerBombHint(opened, bombs) {
    if (opened <= 0 || bombs <= 1) return null;
    const withBombs = multAt(opened, bombs);
    const withOne = multAt(opened, 1);
    const extra = withBombs - withOne;
    return Number((extra / Math.max(1, bombs - 1)).toFixed(2));
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

    let note = '⏳ **7 min sem interação** — partida encerrada.';
    if (game.opened.size > 0 && !game.fun && game.amount > 0) {
        const win = potentialAt(game.amount, game.opened.size, game.bombCount);
        game.cashed = true;
        game._lastWin = win;
        eter.add(game.userId, win, { reason: 'mines auto' });
        note += `\n💵 Saque automático: ✨ **${fmt(win)}**`;
    } else if (game.opened.size > 0 && game.fun) {
        game.cashed = true;
        note += '\n🏁 Diversão encerrada.';
    } else {
        game.dead = true;
        if (!game.fun) note += `\nPrejuízo: ✨ **${fmt(game.amount)}** (nenhuma casa).`;
    }
    clearTimer(game);

    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        const msg = ch ? await ch.messages.fetch(game.messageId).catch(() => null) : null;
        if (msg) {
            await msg
                .edit({
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
            ? '💥 **Boom!** Fim da diversão.'
            : '🏁 **Encerrado** no modo diversão.';
    }
    if (game.cashed) {
        const win = game._lastWin || potentialAt(game.amount, game.opened.size, game.bombCount);
        const profit = win - game.amount;
        return [
            '🎉 **Você ganhou!**',
            `✨ Recebeu **${fmt(win)}**`,
            `📊 Lucro **+${fmt(Math.max(0, profit))}** · Multi ×**${multAt(game.opened.size, game.bombCount)}**`,
            `💎 Gemas **${game.opened.size}** · 💣 Bombas **${game.bombCount}**`
        ].join('\n');
    }
    return [
        '💥 **Explodiu!**',
        `✨ Prejuízo **${fmt(game.amount)}**`,
        `💎 Gemas antes da bomba: **${game.opened.size}**`
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

    let status = '🟢 Em jogo';
    let color = 0x38bdf8;
    if (game.dead) {
        status = '💥 Explodiu';
        color = 0xef4444;
    } else if (game.cashed) {
        status = game.fun ? '🏁 Encerrado' : '💰 Sacado';
        color = 0x22c55e;
    }

    const lines = [
        `**${status}**`,
        '',
        game.fun
            ? '🎮 Modo diversão · sem aposta'
            : `✨ Aposta **${fmt(game.amount)}**`,
        `💣 Bombas **${bombs}** / ${TOTAL}  ·  💎 Seguras **${safeTotal}**`,
        `✅ Abertas **${opened}**  ·  🟢 Restam **${freeLeft}** gemas`
    ];

    // Bloco de multiplicador
    lines.push('', '**Multiplicador**');
    lines.push(`📈 Atual **×${curM.toFixed(2)}**`);
    if (!game.fun && opened > 0) {
        lines.push(`💰 Saque agora ✨ **${fmt(curPay)}**`);
    }
    if (!game.dead && !game.cashed && opened < safeTotal) {
        lines.push(
            `⏩ Próxima gema **×${nextM.toFixed(2)}** (×+${gain.toFixed(2)} por casa)` +
                (game.fun ? '' : ` → ✨ **${fmt(nextPay)}**`)
        );
    }
    if (perBomb != null && opened > 0) {
        lines.push(`💣 Bônus médio por bomba extra ~**×+${perBomb}** (nas gemas atuais)`);
    }
    lines.push(
        `_Quanto mais bombas, maior o multi a cada gema. Casa do bot: ${Math.round((1 - HOUSE) * 100)}%._`
    );

    if (!game.dead && !game.cashed) {
        lines.push('', '-# Toque numa casa ou **Aleatório**. **Sacar** garante o multi atual.');
    }

    const banner = resultBanner(game);
    if (banner) lines.push('', banner);
    if (extra) lines.push('', extra);

    return new EmbedBuilder()
        .setColor(color)
        .setTitle('💎  Mines · 4×4')
        .setDescription(lines.join('\n'));
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
                    label = `💣`;
                    style = ButtonStyle.Danger;
                } else if (opened) {
                    label = `💎`;
                    style = ButtonStyle.Success;
                } else {
                    label = num;
                    style = ButtonStyle.Secondary;
                }
            } else if (opened) {
                label = '💎';
                style = ButtonStyle.Success;
            } else {
                label = num;
                style = ButtonStyle.Primary;
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

function controlsRow(game) {
    const ended = game.dead || game.cashed;
    const pot = potentialAt(game.amount, game.opened.size, game.bombCount);
    const canCash = game.opened.size > 0 && !ended;

    let cashLabel = game.fun ? 'Encerrar' : 'Sacar';
    if (!game.fun && canCash) cashLabel = `Sacar ✨ ${fmt(pot)}`;

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
    return [...boardRows(game, false), controlsRow(game)];
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
            eter.add(game.userId, win, { reason: 'mines clear' });
        }
        return { ok: true, bomb: false, autoWin: true, win };
    }
    return { ok: true, bomb: false };
}

function pickRandom(game) {
    const left = [];
    for (let i = 0; i < TOTAL; i++) {
        if (!game.opened.has(i)) left.push(i);
    }
    if (!left.length) return null;
    return left[Math.floor(Math.random() * left.length)];
}

function endPayload(game, note) {
    return {
        embeds: [panelEmbed(game, note || null)],
        components: fullComponents(game, true)
    };
}

module.exports = {
    name: 'minas',
    aliases: ['mines', 'mine'],
    description: 'Mines 4×4 em éter',

    async execute(message, args, client) {
        const a0 = String(args[0] || '').toLowerCase();
        if (!args.length || a0 === 'help' || a0 === 'ajuda') {
            return message.reply(
                [
                    '💎 **Mines 4×4** · éter ✨',
                    '`O.minas <bombas 1-11> <valor>` — aposta',
                    '`O.minas fun <bombas>` — sem aposta',
                    '',
                    '**Multi** sobe a cada gema. **Mais bombas = multi maior** por casa.',
                    'Saque a qualquer momento depois da 1ª gema.'
                ].join('\n')
            );
        }

        let fun = false;
        let bombCount = 3;
        let amount = 0;

        if (a0 === 'fun' || a0 === 'demo') {
            fun = true;
            bombCount = Math.min(MAX_BOMBS, Math.max(1, parseInt(args[1], 10) || 3));
        } else {
            bombCount = Math.min(MAX_BOMBS, Math.max(1, parseInt(args[0], 10) || 3));
            const bet = resolveBet(args[1], eter.get(message.author.id), { label: '✨' });
            if (!bet.ok) return message.reply(`❌ ${bet.error}`);
            eter.remove(message.author.id, bet.amount, { reason: 'mines bet' });
            amount = bet.amount;
        }

        const game = makeGame(message.author.id, amount, bombCount, fun, {
            channelId: message.channel.id
        });
        const msg = await message.reply({
            embeds: [panelEmbed(game)],
            components: fullComponents(game)
        });
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
            return interaction.reply({ content: 'Partida expirada.', ephemeral: true });
        }
        if (interaction.user.id !== game.userId) {
            return interaction.reply({ content: 'Não é a sua partida.', ephemeral: true });
        }

        if (action === 'again') {
            let amount = game.amount;
            const fun = game.fun;
            const bombCount = game.bombCount;
            if (!fun) {
                const bet = resolveBet(String(game.amount), eter.get(game.userId), { label: '✨' });
                if (!bet.ok) {
                    return interaction.reply({ content: `❌ ${bet.error}`, ephemeral: true });
                }
                eter.remove(game.userId, bet.amount, { reason: 'mines again' });
                amount = bet.amount;
            }
            games.delete(gameId);
            clearTimer(game);
            const ng = makeGame(game.userId, amount, bombCount, fun, {
                channelId: interaction.channelId
            });
            await interaction.update({
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
                embeds: [panelEmbed(game, `🎲 Abriu **#${idx + 1}** · multi ×**${multAt(game.opened.size, game.bombCount)}**`)],
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
            eter.add(game.userId, win, { reason: 'mines cash' });
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
