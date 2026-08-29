const { EmbedBuilder } = require('discord.js');
const drops = require('../utils/drops');

const timers = new Map();

async function finishDrop(client, dropId, { isReroll = false } = {}) {
    const drop = drops.getDrop(dropId);
    if (!drop) return;
    if (!isReroll && drop.ended) return;

    try {
        const channel = await client.channels.fetch(drop.channelId).catch(() => null);
        if (!channel?.isTextBased()) {
            if (!isReroll) drops.removeDrop(dropId);
            return;
        }

        const msg = await channel.messages.fetch(drop.messageId).catch(() => null);
        const winners = drops.pickWinners(drop, drop.lastWinners || []);
        const totalP = drops.participantCount(drop);
        const rerollId = drop.rerollId || drop.messageId;

        if (!winners.length) {
            const embed = new EmbedBuilder()
                .setColor(0x64748b)
                .setTitle(isReroll ? '🔁 Reroll — sem participantes' : '🎁 Drop encerrado')
                .setDescription(`Ninguém elegível.\n**Prêmio:** ${drop.prize?.label || '—'}`)
                .setTimestamp();
            if (msg) await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
            else await channel.send({ embeds: [embed] }).catch(() => {});
            drop.ended = true;
            drops.createDrop(drop);
            return;
        }

        const lines = [];
        for (const w of winners) {
            let paid = false;
            if (drop.autopix) {
                paid = drops.payPrize(w.id, drop.prize);
            }
            if (paid) {
                lines.push(
                    `🏆 <@${w.id}> — recebeu **${drop.prize.amount.toLocaleString('pt-BR')}** ${drop.prize.type}`
                );
            } else {
                lines.push(`🏆 <@${w.id}>`);
            }
        }

        drop.ended = true;
        drop.lastWinners = winners.map((w) => w.id);
        drop.endedAt = Date.now();
        drops.createDrop(drop);

        const embed = new EmbedBuilder()
            .setColor(isReroll ? 0xfbbf24 : 0x34d399)
            .setTitle(isReroll ? '🔁 Reroll finalizado' : '🎁 Drop finalizado')
            .setDescription(
                [
                    `**Prêmio:** ${drop.prize.label}`,
                    `**Participantes:** ${totalP}`,
                    `**Tickets:** ${drops.totalTickets(drop)}`,
                    drop.autopix ? '**Pagamento:** autopix' : '**Pagamento:** manual (staff)',
                    '',
                    '**Vencedor(es)**',
                    ...lines,
                    '',
                    `🔁 Para re-sortear, envie no chat:`,
                    `\`reroll ${rerollId}\``
                ].join('\n')
            )
            .setFooter({ text: `Host: ${drop.hostTag || drop.hostId} · ID ${rerollId}` })
            .setTimestamp();

        const mentions = winners.map((w) => `<@${w.id}>`).join(' ');

        if (msg) {
            await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
            await msg.reply({ content: mentions, embeds: [embed] }).catch(() => {
                channel.send({ content: mentions, embeds: [embed] }).catch(() => {});
            });
        } else {
            await channel.send({ content: mentions, embeds: [embed] }).catch(() => {});
        }
    } catch (e) {
        console.error('[drops] finish:', e.message);
    }

    if (timers.has(dropId)) {
        clearTimeout(timers.get(dropId));
        timers.delete(dropId);
    }
}

async function endDrop(client, dropId) {
    return finishDrop(client, dropId, { isReroll: false });
}

async function rerollDrop(client, dropIdOrRerollId) {
    const drop =
        drops.getDrop(dropIdOrRerollId) ||
        drops.findByRerollId(dropIdOrRerollId) ||
        drops.findByMessageId(dropIdOrRerollId);
    if (!drop) return { ok: false, error: 'Drop não encontrado com esse ID.' };
    if (!drop.ended) return { ok: false, error: 'Esse drop ainda está em andamento.' };
    if (!Object.keys(drop.participants || {}).length)
        return { ok: false, error: 'Sem participantes para re-sortear.' };

    await finishDrop(client, drop.id, { isReroll: true });
    return { ok: true, drop };
}

function schedule(client, drop) {
    if (!drop?.id || drop.ended) return;
    if (timers.has(drop.id)) clearTimeout(timers.get(drop.id));

    const left = drop.endsAt - Date.now();
    if (left <= 0) {
        endDrop(client, drop.id);
        return;
    }

    const t = setTimeout(() => endDrop(client, drop.id), Math.min(left, 2147483647));
    timers.set(drop.id, t);
}

function setup(client) {
    const boot = () => {
        const active = drops.listActive();
        console.log(`🎁 Drops ativos: ${active.length}`);
        for (const d of active) schedule(client, d);
        // limpa drops finalizados há mais de 14 dias
        drops.cleanupOld(14);
    };
    if (client.isReady?.()) boot();
    else client.once('clientReady', boot);
}

module.exports = { setup, schedule, endDrop, rerollDrop, finishDrop };
