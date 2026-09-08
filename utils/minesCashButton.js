/**
 * Botão de saque do Mines — mensagem separada (só o botão).
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

function cashRow(game, potentialFn) {
    const ended = game.dead || game.cashed;
    const pot =
        typeof potentialFn === 'function'
            ? potentialFn(game.amount, game.opened.size, game.bombCount)
            : 0;
    const canCash = game.opened.size > 0 && !ended;
    const cashLabel = game.fun ? 'Encerrar' : 'Sacar · ✨ ' + fmt(pot);

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('minas:cash:' + game.id)
            .setLabel(String(cashLabel).slice(0, 80))
            .setEmoji(game.fun ? '🏁' : '💵')
            .setStyle(ButtonStyle.Success)
            .setDisabled(ended || (!game.fun && !canCash))
    );
}

function cashPayload(game, potentialFn) {
    return {
        content: '​',
        components: [cashRow(game, potentialFn)]
    };
}

async function syncCashMessage(client, game, potentialFn) {
    if (!client || !game?.channelId) return;
    try {
        const ch = await client.channels.fetch(game.channelId).catch(() => null);
        if (!ch || !ch.isTextBased?.()) return;

        const payload = cashPayload(game, potentialFn);

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
    cashPayload,
    syncCashMessage,
    deleteCashMessage
};
