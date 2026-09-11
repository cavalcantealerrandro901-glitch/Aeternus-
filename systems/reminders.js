const { EmbedBuilder } = require('discord.js');
const reminders = require('../utils/reminders');

const CHECK_MS = 20_000;
const COLOR = 0x38bdf8;

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

    try {
        const ch = await client.channels.fetch(rec.channelId).catch(() => null);
        if (ch?.isTextBased?.()) {
            await ch
                .send({
                    content: `<@${rec.userId}>`,
                    embeds: [emb]
                })
                .catch(() => {});
        }
    } catch (_) {}

    try {
        const user = await client.users.fetch(rec.userId).catch(() => null);
        if (user && !user.bot) {
            await user.send({ embeds: [emb] }).catch(() => {});
        }
    } catch (_) {}

    reminders.markSent(rec.id);
}

async function tick(client) {
    const list = reminders.due();
    for (const rec of list) {
        try {
            await deliver(client, rec);
        } catch (e) {
            console.warn('[reminders]', e.message);
        }
    }
}

function setup(client) {
    console.log('[reminders] ativo · checagem a cada 20s');
    const run = () => tick(client).catch((e) => console.error('[reminders]', e.message));
    setTimeout(run, 15_000);
    setInterval(run, CHECK_MS);
}

module.exports = { setup, tick };
