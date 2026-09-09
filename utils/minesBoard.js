const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COLS = 4;
const ROWS = 4;

/**
 * Labels largos e do mesmo tamanho → botões ocupam mais espaço na linha.
 * Discord não permite mudar a altura; a largura vem do texto do rótulo.
 */
function padCell(text) {
    const t = String(text);
    return ('  ' + t + '  ').slice(0, 12);
}

function cellLabel(index, { opened, bomb, ended }) {
    if (ended) {
        if (bomb) return padCell('💣');
        if (opened) return padCell('💎');
        return padCell(String(index + 1).padStart(2, '0'));
    }
    if (opened) return padCell('💎');
    return padCell(String(index + 1).padStart(2, '0'));
}

function boardText(game, reveal = false) {
    const ended = !!(game.dead || game.cashed || reveal);
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
                else cells.push(String(i + 1).padStart(2, '0'));
            } else if (opened) {
                cells.push('💎');
            } else {
                cells.push(String(i + 1).padStart(2, '0'));
            }
        }
        lines.push(cells.join('  '));
    }
    return lines.join('\n');
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

            let style = ButtonStyle.Secondary;
            if (ended) {
                if (bomb) style = ButtonStyle.Danger;
                else if (opened) style = ButtonStyle.Success;
                else style = ButtonStyle.Secondary;
            } else if (opened) {
                style = ButtonStyle.Success;
            } else {
                style = ButtonStyle.Primary;
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

function controlsRow(game) {
    const ended = !!(game.dead || game.cashed);
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:random:' + game.id)
            .setLabel('  Aleatório  ')
            .setEmoji('🎲')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(ended),
        new ButtonBuilder()
            .setCustomId('minas:refresh:' + game.id)
            .setLabel('  Atualizar  ')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary)
    );
}

function againRow(game) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:again:' + game.id)
            .setLabel('  Tentar novamente  ')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary)
    );
}

function fullComponents(game, reveal = false) {
    const ended = !!(game.dead || game.cashed || reveal);
    if (ended) {
        return boardRows(game, true);
    }
    return [...boardRows(game, false), controlsRow(game)];
}

module.exports = {
    boardRows,
    controlsRow,
    againRow,
    fullComponents,
    cellLabel,
    boardText
};
