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

        const conf = drops.guildDropConf(drop.guildId) || {};
        const configuredColor = /^#[0-9a-fA-F]{6}$/.test(String(drop.winnerResultColor || conf.winnerResultColor || drop.embedColor || conf.embedColor || ''))
            ? String(drop.winnerResultColor || conf.winnerResultColor || drop.embedColor || conf.embedColor)
            : (isReroll ? '#FBBF24' : '#34D399');
        const winnerMentions = winners.map((w) => `<@${w.id}>`).join(' ');
        const winnerNames = winners.map((w) => `<@${w.id}>`).join(', ');
        const replace = (text) => String(text || '').replace(/\\{(\\w+)\\}/g, (_, key) => ({
            winners: winnerNames,
            winners_count: winners.length,
            prize: drop.prize?.label || '—',
            participants: totalP,
            tickets: drops.totalTickets(drop),
            reroll: rerollId
        }[key] ?? ''));

        const victoryMessage = replace(
            drop.winnerMessage ||
            conf.winnerMessage ||
            '🏆 Parabéns {winners}! Você venceu o drop de **{prize}**.'
        );

        const embed = new EmbedBuilder()
            .setColor(configuredColor)
            .setTitle(replace(drop.winnerTitle || conf.winnerTitle || (isReroll ? '🔁 Reroll finalizado' : '🎉 Resultado do drop')))
            .setDescription([
                victoryMessage,
                '',
                `**Prêmio:** ${drop.prize.label}`,
                `**Participantes:** ${totalP}`,
                `**Tickets:** ${drops.totalTickets(drop)}`,
                drop.autopix ? '**Pagamento:** automático' : '**Pagamento:** manual (staff)',
                '',
                '**Vencedor(es)**',
                ...lines,
                '',
                `🔁 Reroll: \`${rerollId}\``
            ].join('\\n'))
            .setFooter({ text: 'Aeternus • Resultado do drop' })
            .setTimestamp();

        const mentions = (drop.winnerMention ?? conf.winnerMention) !== false ? winnerMentions : '';
        if (drop.winnerImage || conf.winnerImage) embed.setThumbnail(drop.winnerImage || conf.winnerImage);
        if (drop.winnerBanner || conf.winnerBanner) embed.setImage(drop.winnerBanner || conf.winnerBanner);

        if (msg) {
            await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
            if ((drop.resultSeparate ?? conf.resultSeparate) !== false) {
                await msg.reply({ content: mentions || undefined, embeds: [embed] }).catch(() => {
                    channel.send({ content: mentions || undefined, embeds: [embed] }).catch(() => {});
                });
            }
        } else {
            await channel.send({ content: mentions || undefined, embeds: [embed] }).catch(() => {});
        }

        if ((drop.winnerDm ?? conf.winnerDm) !== false) {
            const dmEmbed = new EmbedBuilder()
                .setColor(configuredColor)
                .setTitle(isReroll ? '🔁 Você venceu o reroll!' : '🏆 Você venceu o drop!')
                .setDescription(replace(
                    drop.winnerMessage ||
                    conf.winnerMessage ||
                    'Parabéns {winners}! Você venceu o drop de **{prize}**.'
                ))
                .setFooter({ text: 'Aeternus • Resultado do drop' })
                .setTimestamp();

            const dmFailures = [];
            for (const winner of winners) {
                const user = await client.users.fetch(winner.id).catch(() => null);
                if (!user) { dmFailures.push(winner.id); continue; }
                const sent = await user.send({ embeds: [dmEmbed] }).then(() => true).catch(() => false);
                if (!sent) dmFailures.push(winner.id);
            }
            if (dmFailures.length && (drop.deliveryFailureMessage || conf.deliveryFailureMessage)) {
                const failureText = replace(drop.deliveryFailureMessage || conf.deliveryFailureMessage)
                    .replace(/\{failed_winners\}/g, dmFailures.map((id) => `<@${id}>`).join(', '));
                await channel.send({ content: failureText }).catch(() => {});
            }
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
    const conf = drops.guildDropConf(drop.guildId) || {};
    if ((drop.rerollEnabled ?? conf.rerollEnabled) === false) return { ok: false, error: 'O reroll está desativado para este servidor.' };
    const maxRerolls = Math.max(0, Math.min(20, Number(drop.maxRerolls ?? conf.maxRerolls) || 0));
    if (maxRerolls <= 0) return { ok: false, error: 'O reroll está desativado para este servidor.' };
    if (Number(drop.rerollCount || 0) >= maxRerolls) return { ok: false, error: `Limite de ${maxRerolls} reroll(s) atingido.` };
    if (!Object.keys(drop.participants || {}).length)
        return { ok: false, error: 'Sem participantes para re-sortear.' };

    drop.rerollCount = Number(drop.rerollCount || 0) + 1;
    drops.createDrop(drop);
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
