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

function resultEmbed({
    title,
    win,
    lines = [],
    footer,
    user,
    thumb
}) {
    const emb = new EmbedBuilder()
        .setColor(win === true ? C.win : win === false ? C.lose : C.info)
        .setTitle(title)
        .setDescription(lines.filter(Boolean).join('\n'))
        .setTimestamp();
    if (footer) emb.setFooter({ text: footer });
    if (user) emb.setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 64 }) });
    if (thumb) emb.setThumbnail(thumb);
    return emb;
}

function betFooter() {
    return 'Apostas: 1k · 2.5m · all · half';
}

function againRow(customId, label = 'Jogar de novo') {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔁')
    );
}

function crystalResult({ title, win, amount, payout, balance, extra, user }) {
    const delta = win ? payout : amount;
    const sign = win ? '+' : '−';
    return resultEmbed({
        title,
        win,
        user,
        lines: [
            extra,
            '',
            win
                ? `✨ **Ganhou** ${sign}💠 **${fmt(delta)}**`
                : `💫 **Perdeu** ${sign}💠 **${fmt(delta)}**`,
            `💼 Saldo: 💠 **${fmt(balance)}**`
        ],
        footer: betFooter()
    });
}

module.exports = { C, fmt, resultEmbed, betFooter, againRow, crystalResult };
