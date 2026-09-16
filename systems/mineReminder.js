/**
 * Aviso por DM quando o cooldown do minerar (O.minerar) termina.
 * ENV: MINE_REMINDER=off → desliga
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');

const CD_MS = 5 * 60 * 1000;
const CHECK_MS = 40 * 1000;
const BATCH_DELAY_MS = 1200;
const COLOR = 0x22d3ee;

let started = false;

function isEnabled() {
    const v = String(process.env.MINE_REMINDER || 'on').toLowerCase();
    return v !== 'off' && v !== '0' && v !== 'false' && v !== 'no';
}

function cdMap() {
    return store.load('minecd.json', {});
}

function notifiedMap() {
    return store.load('mine_reminders.json', {});
}

function saveNotified(data) {
    store.save('mine_reminders.json', data);
}

function buildEmbed(user) {
    const name = user?.username || 'minerador';
    const avatar = user.displayAvatarURL?.({ size: 256 }) || null;

    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: 'Aeternus · Mineração',
            iconURL: avatar || undefined
        })
        .setTitle('✦ A picareta esfriou')
        .setDescription(
            [
                `Olá, **${name}**.`,
                '',
                'Sua picareta está pronta de novo. As cavernas esperam por você.',
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '⛏️ **Minérios:** carvão · ferro · ouro · diamante · esmeralda…',
                '💎 **Raros:** diamante, esmeralda e netherita',
                '⏱ **Cooldown:** 5 minutos',
                '━━━━━━━━━━━━━━━━━━━━',
                '',
                '**Como agir**',
                '• Prefixo: **`O.minerar`**',
                '• Slash: **`/minerar`**'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · Mundo de mineração' });
}

async function sendReady(client, userId, lastTs) {
    const map = notifiedMap();
    if (Number(map[userId] || 0) >= lastTs) return { ok: false, reason: 'already' };

    let user;
    try {
        user = await client.users.fetch(userId);
    } catch (_) {
        return { ok: false, reason: 'fetch' };
    }

    try {
        await user.send({ embeds: [buildEmbed(user)] });
        map[userId] = lastTs;
        saveNotified(map);
        return { ok: true };
    } catch (e) {
        const code = e?.code || e?.rawError?.code;
        if (code === 50007 || code === 50001) {
            map[userId] = lastTs;
            saveNotified(map);
            return { ok: false, reason: 'dm_closed' };
        }
        return { ok: false, reason: e.message || 'error' };
    }
}

async function tick(client) {
    if (!isEnabled()) return;
    if (!client?.user) return;

    const now = Date.now();
    const all = cdMap();
    let sent = 0;

    for (const [userId, raw] of Object.entries(all || {})) {
        if (!/^\d{16,20}$/.test(userId)) continue;
        const lastTs = Number(raw || 0);
        if (!lastTs) continue;

        if (now < lastTs + CD_MS) continue;

        if (now - (lastTs + CD_MS) > 90 * 60 * 1000) {
            const map = notifiedMap();
            if (Number(map[userId] || 0) < lastTs) {
                map[userId] = lastTs;
                saveNotified(map);
            }
            continue;
        }

        const r = await sendReady(client, userId, lastTs);
        if (r.ok) {
            sent++;
            await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
        }
    }

    if (sent > 0) console.log(`[mineReminder] ${sent} DM(s) de mineração enviada(s)`);
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[mineReminder] desligado (MINE_REMINDER=off)');
        return;
    }

    const start = () => {
        if (started) return;
        started = true;
        tick(client).catch((e) => console.error('[mineReminder]', e.message));
        setInterval(() => {
            tick(client).catch((e) => console.error('[mineReminder]', e.message));
        }, CHECK_MS);
        console.log('[mineReminder] loop iniciado');
    };

    if (client.user) setTimeout(start, 26_000);
    else {
        const onceReady = () => setTimeout(start, 26_000);
        client.once('clientReady', onceReady);
        client.once('ready', onceReady);
    }

    console.log('[mineReminder] ativo · avisa no PV quando o cooldown (5 min) acaba');
}

module.exports = { setup, tick, CD_MS };
