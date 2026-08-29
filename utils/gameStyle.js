const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const C = {
    win: 0x34d399,
    lose: 0xf43f5e,
    draw: 0xfbbf24,
    info: 0xa78bfa,
    dark: 0x0f172a
};

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function resultEmbed({ title, win, lines = [], footer, user }) {
    let color = C.info;
    if (win === true) color = C.win;
    else if (win === false) color = C.lose;
    else if (win === 'draw') color = C.draw;

    const emb = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(lines.filter((l) => l !== undefined && l !== null).join('\n'))
        .setTimestamp();
    if (footer) emb.setFooter({ text: footer });
    if (user) {
        emb.setAuthor({
            name: user.username || user.globalName || 'Jogador',
            iconURL: typeof user.displayAvatarURL === 'function' ? user.displayAvatarURL({ size: 64 }) : undefined
        });
    }
    return emb;
}

function betFooter() {
    return '💠 Apostas: 1k · 2.5m · all · half';
}

function againRow(customId, label = 'Jogar de novo') {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(String(customId).slice(0, 100))
            .setLabel(String(label).slice(0, 80))
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔁')
    );
}

/**
 * @param {object} opts
 * @param {true|false|'draw'} opts.win
 */
function crystalResult({ title, win, amount, payout, balance, extra, user }) {
    let moneyLine;
    if (win === true) {
        moneyLine = `✨ **Ganhou** +💠 **${fmt(payout)}**`;
    } else if (win === 'draw') {
        moneyLine = `🤝 **Empate** · aposta devolvida 💠 **${fmt(amount)}**`;
    } else {
        moneyLine = `💫 **Perdeu** −💠 **${fmt(amount)}**`;
    }

    return resultEmbed({
        title,
        win,
        user,
        lines: [extra || '', '', moneyLine, `💼 Saldo: 💠 **${fmt(balance)}**`],
        footer: betFooter()
    });
}

module.exports = { C, fmt, resultEmbed, betFooter, againRow, crystalResult };
