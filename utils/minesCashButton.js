/**
 * Mensagem final de vitória/perda (depois do tabuleiro) + botão "Tentar novamente".
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function padLabel(text, width = 16) {
    const t = String(text);
    if (t.length >= width) return t.slice(0, width);
    const left = Math.floor((width - t.length) / 2);
    const right = width - t.length - left;
    return ' '.repeat(left) + t + ' '.repeat(right);
}

function resultBanner(game, potentialAt) {
    if (!game.dead && !game.cashed) return null;

    if (game._idleAuto) {
        if (game.fun) return '⏱️ Tempo esgotado. Clique no botão abaixo e tente novamente!!!';
        const win = game._lastWin || 0;
        if (game.opened.size > 0) {
            return (
                '⏱️ Tempo esgotado — saque automático de ✨ **' +
                fmt(win) +
                '**. Clique no botão abaixo e tente novamente!!!'
            );
        }
        return (
            '⏱️ Tempo esgotado — aposta devolvida (✨ **' +
            fmt(win) +
            '**). Clique no botão abaixo e tente novamente!!!'
        );
    }

    if (game.cashed && game.fun) {
        return '🏁 Partida encerrada (diversão). Clique no botão abaixo e tente novamente!!!';
    }

    if (game.cashed && !game.fun) {
        const win =
            game._lastWin ||
            (typeof potentialAt === 'function'
                ? potentialAt(game.amount, game.opened.size, game.bombCount)
                : 0);
        const profit = Math.max(0, win - game.amount);
        return (
            'Parabéns! Você conseguiu sair sem encontrar nenhuma bomba, sacando a tempo ✨ **' +
            fmt(win) +
            '** éter com um lucro de ✨ **' +
            fmt(profit) +
            '**. Clique no botão abaixo e tente novamente!!!'
        );
    }

    return (
        'Cabô!!! Você encontrou uma bomba e teve uma perda de ✨ **' +
        fmt(game.amount) +
        '** éter. Mas não desanime, clique no botão abaixo e tenta recuperar!!!'
    );
}

function buildResultEmbed(game, potentialAt) {
    const text = resultBanner(game, potentialAt);
    if (!text) return null;
    let color = 0x5865f2;
    if (game.dead) color = 0xed4245;
    else if (game.cashed) color = 0x57f287;
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(game.dead ? '💥 Resultado' : '✅ Resultado')
        .setDescription(String(text));
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

function isMinesCashMessage(msg, gameId) {
    if (!msg?.components?.length) return false;
    try {
        for (const row of msg.components) {
            for (const c of row.components || []) {
                const id = c.customId || c.data?.custom_id || '';
                if (id === 'minas:cash:' + gameId || id === 'minas:again:' + gameId) {
                    const hasCell = (msg.components || []).some((r) =>
                        (r.components || []).some((x) =>
                            String(x.customId || x.data?.custom_id || '').includes('minas:cell:')
                        )
                    );
                    return !hasCell;
                }
            }
        }
    } catch (_) {}
    return false;
}

async function purgeDuplicateCashMessages(ch, game) {
    if (!ch?.messages?.fetch) return;
    try {
        const fetched = await ch.messages.fetch({ limit: 25 }).catch(() => null);
        if (!fetched) return;
        const botId = ch.client?.user?.id;
        for (const m of fetched.values()) {
            if (botId && m.author?.id !== botId) continue;
            if (game.messageId && m.id === game.messageId) continue;
            if (game.cashMessageId && m.id === game.cashMessageId) continue;
            if (isMinesCashMessage(m, game.id)) {
                await m.delete().catch(() => {});
            }
        }
    } catch (_) {}
}

/**
 * Envia/atualiza a mensagem FINAL (depois do tabuleiro) com embed de vitória/perda + again.
 */
async function syncCashMessage(client, game, potentialAt) {
    if (!client || !game?.channelId) return;
    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (!ch?.isTextBased?.()) return;

        const ended = !!(game.dead || game.cashed);
        if (!ended) {
            if (game.cashMessageId) {
                const old = await ch.messages.fetch(game.cashMessageId).catch(() => null);
                if (old) await old.delete().catch(() => {});
                game.cashMessageId = null;
            }
            await purgeDuplicateCashMessages(ch, game);
            return;
        }

        const emb = buildResultEmbed(game, potentialAt);
        if (!emb) return;

        const payload = {
            content: '<@' + game.userId + '>',
            embeds: [emb],
            components: [againRow(game)],
            allowedMentions: { users: [game.userId] }
        };

        if (game.cashMessageId) {
            const existing = await ch.messages.fetch(game.cashMessageId).catch(() => null);
            if (existing) {
                await existing.edit(payload).catch(() => {});
                await purgeDuplicateCashMessages(ch, game);
                return;
            }
            game.cashMessageId = null;
        }

        const ref = game.messageId
            ? await ch.messages.fetch(game.messageId).catch(() => null)
            : null;
        const sent = ref
            ? await ref.reply(payload).catch(() => ch.send(payload))
            : await ch.send(payload);
        if (sent?.id) game.cashMessageId = sent.id;
        await purgeDuplicateCashMessages(ch, game);
    } catch (e) {
        console.warn('[minesCash] sync:', e.message);
    }
}

async function deleteCashMessage(client, game) {
    if (!client || !game?.channelId) return;
    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (!ch?.isTextBased?.()) return;
        if (game.cashMessageId) {
            const m = await ch.messages.fetch(game.cashMessageId).catch(() => null);
            if (m) await m.delete().catch(() => {});
            game.cashMessageId = null;
        }
        await purgeDuplicateCashMessages(ch, game);
    } catch (_) {}
}

module.exports = {
    syncCashMessage,
    deleteCashMessage,
    purgeDuplicateCashMessages,
    buildResultEmbed,
    resultBanner
};
