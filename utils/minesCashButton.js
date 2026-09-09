/**
 * Mensagem externa do Mines (fora do embed):
 * dica + botão Sacar + número da partida
 * No fim: texto de resultado + botão Tentar novamente
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function cashRow(game, potentialFn) {
    const ended = !!(game.dead || game.cashed);
    const pot =
        typeof potentialFn === 'function'
            ? potentialFn(game.amount, game.opened.size, game.bombCount)
            : 0;
    const canCash = game.opened.size > 0 && !ended;
    const cashLabel = game.fun
        ? 'Encerrar'
        : 'Sacar ' + fmt(pot) + ' Éter';

    return new ActionRowBuilder().addComponents(
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
            .setLabel('Tentar novamente')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Primary)
    );
}

function tipLine() {
    return 'Avalie o risco antes de revelar a próxima casa.';
}

function partidaLine(game) {
    const n = game.number != null ? game.number : '—';
    return '🎮 Partida nº **#' + n + '**';
}

function cashPayload(game, potentialFn, resultText) {
    const ended = !!(game.dead || game.cashed);

    if (ended) {
        const lines = [];
        if (resultText) lines.push(String(resultText));
        lines.push(partidaLine(game));
        return {
            content: lines.join('\n'),
            components: [againRow(game)],
            embeds: []
        };
    }

    const pot =
        typeof potentialFn === 'function'
            ? potentialFn(game.amount, game.opened.size, game.bombCount)
            : 0;
    const lines = [tipLine(), partidaLine(game)];
    if (!game.fun && game.opened.size > 0) {
        lines.splice(1, 0, 'Valor atual se sacar agora: **✨ ' + fmt(pot) + '**');
    }

    return {
        content: lines.join('\n'),
        components: [cashRow(game, potentialFn)],
        embeds: []
    };
}

async function syncCashMessage(client, game, potentialFn, resultText) {
    if (!client || !game?.channelId) return;
    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (!ch || !ch.isTextBased?.()) return;

        const payload = cashPayload(game, potentialFn, resultText);

        if (game.cashMessageId) {
            const m = await ch.messages.fetch(game.cashMessageId).catch(() => null);
            if (m) {
                await m.edit(payload).catch(() => {});
                return;
            }
        }

        const sent = await ch.send(payload).catch(() => null);
        if (sent) game.cashMessageId = sent.id;
    } catch (e) {
        console.warn('[minesCash] sync:', e.message);
    }
}

async function deleteCashMessage(client, game) {
    if (!client || !game?.channelId || !game.cashMessageId) return;
    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        const m = await ch?.messages?.fetch(game.cashMessageId).catch(() => null);
        if (m) await m.delete().catch(() => {});
    } catch (_) {}
    game.cashMessageId = null;
}

module.exports = {
    cashRow,
    againRow,
    cashPayload,
    syncCashMessage,
    deleteCashMessage,
    tipLine,
    partidaLine
};
