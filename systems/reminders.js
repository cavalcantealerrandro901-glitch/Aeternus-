const { EmbedBuilder } = require('discord.js');
const reminders = require('../utils/reminders');

const CHECK_MS = 20_000;
const COLOR = 0x38bdf8;
let ticking = false;

async function deliver(client, rec) {
    const emb = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('⏰ Lembrete')
        .setDescription(rec.text)
        .addFields(
            {
                name: 'Agendado para',
                value: `<t:${Math.floor(rec.at / 1000)}:F>`,
                inline: true
            },
            {
                name: 'Criado',
                value: `<t:${Math.floor(rec.createdAt / 1000)}:R>`,
                inline: true
            }
        )
        .setFooter({ text: `ID ${rec.id}` })
        .setTimestamp();

    let delivered = false;

    try {
        const ch = await client.channels.fetch(rec.channelId).catch(() => null);
        if (ch?.isTextBased?.() && typeof ch.send === 'function') {
            await ch.send({
                content: `<@${rec.userId}>`,
                embeds: [emb],
                allowedMentions: { users: [rec.userId] }
            });
            delivered = true;
        }
    } catch (error) {
        console.warn(`[reminders] Canal indisponível para ${rec.id}:`, error?.message || error);
    }

    try {
        const user = await client.users.fetch(rec.userId).catch(() => null);
        if (user && !user.bot) {
            await user.send({ embeds: [emb] });
            delivered = true;
        }
    } catch (error) {
        // DM indisponível é comum; o lembrete ainda pode ter sido entregue no canal.
        if (!delivered) console.warn(`[reminders] DM indisponível para ${rec.id}:`, error?.message || error);
    }

    if (delivered) {
        reminders.markSent(rec.id);
        return true;
    }

    // Não marcar como enviado: o próximo ciclo pode tentar novamente.
    return false;
}

async function tick(client) {
    if (ticking) return;
    ticking = true;
    try {
        const list = reminders.due();
        for (const rec of list) {
            try {
                await deliver(client, rec);
            } catch (e) {
                console.warn('[reminders] Falha ao entregar lembrete:', e.message);
            }
        }
    } finally {
        ticking = false;
    }
}

function setup(client) {
    console.log('[reminders] ativo · checagem a cada 20s');
    const run = () => tick(client).catch((e) => console.error('[reminders]', e.message));
    setTimeout(run, 15_000);
    setInterval(run, CHECK_MS);
}

module.exports = { setup, tick };
