const { EmbedBuilder } = require('discord.js');
const drops = require('../utils/drops');

const timers = new Map();

async function endDrop(client, dropId) {
    const drop = drops.getDrop(dropId);
    if (!drop || drop.ended) return;

    drop.ended = true;
    drops.createDrop(drop);

    try {
        const channel = await client.channels.fetch(drop.channelId).catch(() => null);
        if (!channel?.isTextBased()) {
            drops.removeDrop(dropId);
            return;
        }

        const msg = await channel.messages.fetch(drop.messageId).catch(() => null);
        const winners = drops.pickWinners(drop);
        const totalP = drops.participantCount(drop);

        if (!winners.length) {
            const embed = new EmbedBuilder()
                .setColor(0x64748b)
                .setTitle('🎁 Drop encerrado')
                .setDescription(`Ninguém participou.\n**Prêmio:** ${drop.prize.label}`)
                .setTimestamp();
            if (msg) await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
            else await channel.send({ embeds: [embed] }).catch(() => {});
            drops.removeDrop(dropId);
            return;
        }

        const lines = [];
        for (const w of winners) {
            const paid = drops.payPrize(w.id, drop.prize);
            lines.push(
                paid
                    ? `🏆 <@${w.id}> — **${drop.prize.amount.toLocaleString('pt-BR')}** ${drop.prize.type}`
                    : `🏆 <@${w.id}>`
            );
        }

        const embed = new EmbedBuilder()
            .setColor(0x34d399)
            .setTitle('🎁 Drop finalizado')
            .setDescription(
                [
                    `**Prêmio:** ${drop.prize.label}`,
                    `**Participantes:** ${totalP}`,
                    `**Tickets:** ${drops.totalTickets(drop)}`,
                    '',
                    '**Vencedor(es)**',
                    ...lines
                ].join('\n')
            )
            .setFooter({ text: `Host: ${drop.hostTag || drop.hostId}` })
            .setTimestamp();

        if (msg) {
            await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
            await msg
                .reply({ content: winners.map((w) => `<@${w.id}>`).join(' '), embeds: [embed] })
                .catch(() => {
                    channel
                        .send({ content: winners.map((w) => `<@${w.id}>`).join(' '), embeds: [embed] })
                        .catch(() => {});
                });
        } else {
            await channel
                .send({ content: winners.map((w) => `<@${w.id}>`).join(' '), embeds: [embed] })
                .catch(() => {});
        }
    } catch (e) {
        console.error('[drops] end:', e.message);
    }

    drops.removeDrop(dropId);
    if (timers.has(dropId)) {
        clearTimeout(timers.get(dropId));
        timers.delete(dropId);
    }
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
    };
    if (client.isReady?.()) boot();
    else client.once('clientReady', boot);
}

module.exports = { setup, schedule, endDrop };
