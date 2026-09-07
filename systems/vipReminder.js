/**
 * Notificações automáticas de VIP por DM
 * - Avisos antes de expirar: 7d, 3d, 1d, 12h
 * - Aviso quando expira
 *
 * ENV: VIP_REMINDER=off para desligar
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');
const vip = require('../utils/vip');

const CHECK_MS = 5 * 60 * 1000;
const BATCH_DELAY_MS = 800;
const COLOR = 0xa78bfa;
const COLOR_END = 0xf43f5e;

const MARKS = [
    { key: '7d', ms: 7 * 864e5, label: '7 dias' },
    { key: '3d', ms: 3 * 864e5, label: '3 dias' },
    { key: '1d', ms: 1 * 864e5, label: '1 dia' },
    { key: '12h', ms: 12 * 3600e3, label: '12 horas' },
    { key: 'expired', ms: 0, label: 'expirado' }
];

function isEnabled() {
    const v = String(process.env.VIP_REMINDER || 'on').toLowerCase();
    return v !== 'off' && v !== '0' && v !== 'false' && v !== 'no';
}

function notifiedMap() {
    return store.load('vip_reminders.json', {});
}

function saveNotified(data) {
    store.save('vip_reminders.json', data);
}

function allVipEntries() {
    const all = store.load('vips.json', {});
    const out = [];
    for (const [guildId, map] of Object.entries(all || {})) {
        for (const [userId, rec] of Object.entries(map || {})) {
            out.push({ guildId, userId, ...rec });
        }
    }
    return out;
}

function markKey(guildId, userId, mark) {
    return `${guildId}:${userId}:${mark}`;
}

function alreadySent(map, guildId, userId, mark, registeredAt) {
    const k = markKey(guildId, userId, mark);
    const prev = map[k];
    if (!prev) return false;
    return Number(prev) >= Number(registeredAt || 0);
}

function markSent(map, guildId, userId, mark, registeredAt) {
    map[markKey(guildId, userId, mark)] = Number(registeredAt || Date.now());
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildExpiringEmbed(user, rec, markLabel, leftLabel) {
    const name = user?.username || 'membro';
    const label = vip.vipLabel(rec);
    const title = pick([
        '✦ Seu VIP está acabando',
        '⏳ VIP perto do fim',
        '✨ Lembrete de VIP'
    ]);
    const body = pick([
        [
            `**${name}**, o seu **${label}** termina em breve.`,
            '',
            `⏱ Resta aproximadamente **${leftLabel}**.`,
            rec.expiresAt
                ? `📅 Expira em <t:${Math.floor(rec.expiresAt / 1000)}:F>`
                : '',
            '',
            'Renove com a staff do servidor para continuar com os benefícios.'
        ]
            .filter(Boolean)
            .join('\n'),
        [
            `Olá, **${name}**.`,
            '',
            `O plano **${label}** está com **${leftLabel}** restantes.`,
            'Se quiser manter o VIP, fale com a moderação do servidor.'
        ].join('\n')
    ]);

    return new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(title)
        .setDescription(body)
        .addFields(
            { name: 'VIP', value: `**${label}**`, inline: true },
            { name: 'Aviso', value: markLabel, inline: true }
        )
        .setFooter({ text: 'Aeternus · notificação de VIP' });
}

function buildExpiredEmbed(user, rec) {
    const name = user?.username || 'membro';
    const label = vip.vipLabel(rec);
    return new EmbedBuilder()
        .setColor(COLOR_END)
        .setTitle('VIP expirado')
        .setDescription(
            [
                `**${name}**, o seu **${label}** chegou ao fim.`,
                '',
                'Os benefícios deste plano não estão mais ativos.',
                'Para renovar, fale com a moderação do servidor.'
            ].join('\n')
        )
        .addFields({ name: 'VIP', value: `**${label}**`, inline: true })
        .setFooter({ text: 'Aeternus · notificação de VIP' });
}

async function processEntry(client, entry, map) {
    const { guildId, userId, expiresAt, registeredAt } = entry;
    if (!expiresAt) return;

    const left = Number(expiresAt) - Date.now();

    for (const mark of MARKS) {
        if (mark.key === 'expired') {
            if (left > 0) continue;
        } else if (left > mark.ms) {
            continue;
        }

        if (alreadySent(map, guildId, userId, mark.key, registeredAt)) continue;

        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user || user.bot) {
                markSent(map, guildId, userId, mark.key, registeredAt);
                continue;
            }

            const emb =
                mark.key === 'expired'
                    ? buildExpiredEmbed(user, entry)
                    : buildExpiringEmbed(user, entry, mark.label, vip.timeLeft(expiresAt));

            await user.send({ embeds: [emb] });
            markSent(map, guildId, userId, mark.key, registeredAt);
            console.log(
                `[vipReminder] ${mark.key} → ${user.tag} guild=${guildId}`
            );
            await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        } catch (e) {
            markSent(map, guildId, userId, mark.key, registeredAt);
            console.warn(`[vipReminder] falha DM ${userId}:`, e.message);
        }
    }
}

async function tick(client) {
    if (!isEnabled()) return;
    const entries = allVipEntries().filter((e) => e.expiresAt);
    if (!entries.length) return;

    const map = notifiedMap();
    for (const entry of entries) {
        await processEntry(client, entry, map);
    }
    saveNotified(map);

    const cut = Date.now() - 90 * 864e5;
    let dirty = false;
    for (const [k, ts] of Object.entries(map)) {
        if (Number(ts) < cut) {
            delete map[k];
            dirty = true;
        }
    }
    if (dirty) saveNotified(map);
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[vipReminder] desligado (VIP_REMINDER=off)');
        return;
    }
    console.log('[vipReminder] ativo · avisos 7d / 3d / 1d / 12h / expirado');

    const run = () => tick(client).catch((e) => console.error('[vipReminder]', e.message));
    setTimeout(run, 20_000);
    setInterval(run, CHECK_MS);
}

module.exports = { setup };
