const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COLS = 4;
const ROWS = 4;

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

/** Rótulos com mesma largura visual → botões mais retos */
function padLabel(text, width = 10) {
    const t = String(text);
    if (t.length >= width) return t.slice(0, width);
    const left = Math.floor((width - t.length) / 2);
    const right = width - t.length - left;
    return ' '.repeat(left) + t + ' '.repeat(right);
}

function cellLabel(index, { opened, bomb, ended }) {
    if (ended) {
        if (bomb) return padLabel('💣');
        if (opened) return padLabel('💎');
        return padLabel(String(index + 1).padStart(2, '0'));
    }
    if (opened) return padLabel('💎');
    return padLabel(String(index + 1).padStart(2, '0'));
}

function boardRows(game, reveal = false) {
    const ended = !!(game.dead || game.cashed || reveal);
    const rows = [];

    for (let y = 0; y < ROWS; y++) {
        const row = new ActionRowBuilder();
        for (let x = 0; x < COLS; x++) {
            const i = y * COLS + x;
            const opened = game.opened.has(i);
            const bomb = game.bombs.has(i);

            let style = ButtonStyle.Primary;
            if (ended) {
                if (bomb) style = ButtonStyle.Danger;
                else if (opened) style = ButtonStyle.Success;
                else style = ButtonStyle.Secondary;
            } else if (opened) {
                style = ButtonStyle.Success;
            }

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('minas:cell:' + game.id + ':' + i)
                    .setLabel(cellLabel(i, { opened, bomb, ended }).slice(0, 80))
                    .setStyle(style)
                    .setDisabled(ended || opened)
            );
        }
        rows.push(row);
    }
    return rows;
}

/** Linha única: Aleatório · Atualizar · Sacar */
function controlsRow(game, potentialFn) {
    const ended = !!(game.dead || game.cashed);
    const pot =
        typeof potentialFn === 'function'
            ? potentialFn(game.amount, game.opened.size, game.bombCount)
            : 0;
    const canCash = game.opened.size > 0 && !ended;
    const cashLabel = game.fun
        ? padLabel('Encerrar')
        : padLabel('Sacar ' + fmt(pot));

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:random:' + game.id)
            .setLabel(padLabel('Aleatório'))
            .setEmoji('🎲')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(ended),
        new ButtonBuilder()
            .setCustomId('minas:refresh:' + game.id)
            .setLabel(padLabel('Atualizar'))
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false),
        new ButtonBuilder()
            .setCustomId('minas:cash:' + game.id)
            .setLabel(String(cashLabel).slice(0, 80))
            .setEmoji(game.fun ? '🏁' : '🟩')
            .setStyle(ButtonStyle.Success)
            .setDisabled(ended || (!game.fun && !canCash))
    );
}

function againRow(game) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:again:' + game.id)
            .setLabel(padLabel('Tentar novamente', 16))
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary)
    );
}

/**
 * Tudo na mesma mensagem (máx. 5 rows):
 * 4 tabuleiro + 1 controles  OU  4 tabuleiro + 1 again
 */
function fullComponents(game, reveal = false, potentialFn = null) {
    const ended = !!(game.dead || game.cashed || reveal);
    if (ended) {
        return [...boardRows(game, true), againRow(game)];
    }
    return [...boardRows(game, false), controlsRow(game, potentialFn)];
}

module.exports = {
    boardRows,
    controlsRow,
    againRow,
    fullComponents,
    cellLabel,
    padLabel
};
