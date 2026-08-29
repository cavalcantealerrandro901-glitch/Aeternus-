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
        let users = [];

        if (msg) {
            const reaction = msg.reactions.cache.get(drop.emoji) || msg.reactions.cache.find((r) => r.emoji.name === drop.emoji);
            if (reaction) {
                const fetched = await reaction.users.fetch().catch(() => null);
                if (fetched) {
                    users = [...fetched.values()].filter((u) => !u.bot && u.id !== drop.hostId);
                }
            }
        }

        // shuffle
        for (let i = users.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [users[i], users[j]] = [users[j], users[i]];
        }

        const winners = users.slice(0, Math.max(1, drop.winners || 1));

        if (!winners.length) {
            const embed = new EmbedBuilder()
                .setColor(0x64748b)
                .setTitle('🎁 Drop encerrado')
                .setDescription(`Ninguém participou.\n**Prêmio:** ${drop.prize.label}`)
                .setTimestamp();
            if (msg) await msg.edit({ embeds: [embed] }).catch(() => {});
            else await channel.send({ embeds: [embed] }).catch(() => {});
            drops.removeDrop(dropId);
            return;
        }

        const lines = [];
        for (const w of winners) {
            const paid = drops.payPrize(w.id, drop.prize);
            lines.push(
                paid
                    ? `🏆 ${w} — recebeu automaticamente **${drop.prize.amount.toLocaleString('pt-BR')}** ${drop.prize.type}`
                    : `🏆 ${w}`
            );
        }

        const embed = new EmbedBuilder()
            .setColor(0x34d399)
            .setTitle('🎁 Drop finalizado')
            .setDescription(
                [
                    `**Prêmio:** ${drop.prize.label}`,
                    `**Participantes:** ${users.length}`,
                    '',
                    '**Vencedor(es)**',
                    ...lines
                ].join('\n')
            )
            .setFooter({ text: `Host: ${drop.hostTag || drop.hostId}` })
            .setTimestamp();

        if (msg) {
            await msg.edit({ embeds: [embed] }).catch(() => {});
            await msg.reply({ content: winners.map((w) => `${w}`).join(' '), embeds: [embed] }).catch(() => {
                channel.send({ content: winners.map((w) => `${w}`).join(' '), embeds: [embed] }).catch(() => {});
            });
        } else {
            await channel.send({ content: winners.map((w) => `${w}`).join(' '), embeds: [embed] }).catch(() => {});
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
