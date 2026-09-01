const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const C = {
    win: 0x34d399,
    lose: 0xf43f5e,
    draw: 0xfbbf24,
    info: 0xa78bfa,
    dark: 0x0f172a,
    gold: 0xf59e0b,
    neon: 0x22d3ee
};

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function resultEmbed({ title, win, lines = [], footer, user, color }) {
    let col = color || C.info;
    if (win === true) col = C.win;
    else if (win === false) col = C.lose;
    else if (win === 'draw') col = C.draw;

    const emb = new EmbedBuilder()
        .setColor(col)
        .setTitle(title)
        .setDescription(lines.filter((l) => l !== undefined && l !== null && l !== '').join('\n'))
        .setTimestamp();
    if (footer) emb.setFooter({ text: footer });
    if (user) {
        emb.setAuthor({
            name: user.username || user.globalName || user.tag || 'Jogador',
            iconURL:
                typeof user.displayAvatarURL === 'function'
                    ? user.displayAvatarURL({ size: 64 })
                    : undefined
        });
    }
    return emb;
}

function betFooter() {
    return '❄️ Apostas: 1k · 2.5m · all · half · Aeternus Casino';
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

function crystalResult({ title, win, amount, payout, balance, extra, user, mult }) {
    let moneyLine;
    if (win === true) {
        const multTxt = mult ? ` (×${mult})` : '';
        moneyLine = `✨ **Ganhou** +❄️ **${fmt(payout)}**${multTxt}`;
    } else if (win === 'draw') {
        moneyLine = `🤝 **Empate** · aposta devolvida ❄️ **${fmt(amount)}**`;
    } else {
        moneyLine = `💫 **Perdeu** −❄️ **${fmt(amount)}**`;
    }

    const profit =
        win === true && payout != null && amount != null
            ? `📈 Lucro: ❄️ **${fmt(payout - amount)}**`
            : null;

    return resultEmbed({
        title,
        win,
        user,
        lines: [extra || '', '', moneyLine, profit, '', `💼 Saldo: ❄️ **${fmt(balance)}**`].filter(Boolean),
        footer: betFooter()
    });
}

function casinoFrame(title, bodyLines = []) {
    return [
        '```',
        `  ╔════════════════════════════╗`,
        `  ║  ${String(title).padEnd(26).slice(0, 26)}║`,
        `  ╚════════════════════════════╝`,
        '```',
        ...bodyLines
    ].join('\n');
}

module.exports = {
    C,
    fmt,
    resultEmbed,
    betFooter,
    againRow,
    crystalResult,
    casinoFrame
};
