/**
 * Aviso por DM quando o cooldown do crime (O.crime) termina.
 * ENV: CRIME_REMINDER=off → desliga
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');

const CD_MS = 20 * 60 * 1000;
const CHECK_MS = 45 * 1000;
const BATCH_DELAY_MS = 1200;
const COLOR = 0xef4444;

let started = false;

function isEnabled() {
    const v = String(process.env.CRIME_REMINDER || 'on').toLowerCase();
    return v !== 'off' && v !== '0' && v !== 'false' && v !== 'no';
}

function cdMap() {
    return store.load('crimecd.json', {});
}

function notifiedMap() {
    return store.load('crime_reminders.json', {});
}

function saveNotified(data) {
    store.save('crime_reminders.json', data);
}

function buildEmbed(user) {
    const name = user?.username || 'fugitivo';
    const avatar = user.displayAvatarURL?.({ size: 256 }) || null;

    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: 'Aeternus · Crime',
            iconURL: avatar || undefined
        })
        .setTitle('✦ A costa está limpa')
        .setDescription(
            [
                `Olá, **${name}**.`,
                '',
                'O tempo de espera acabou. Você já pode cometer outro crime.',
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '💰 **Ganho:** ✨ 30.000 – 400.000',
                '🚨 **Multa se falhar:** ✨ 20.000 – 100.000',
                '⏱ **Cooldown:** 20 minutos',
                '━━━━━━━━━━━━━━━━━━━━',
                '',
                '**Como agir**',
                '• Prefixo: **`O.crime`**',
                '• Slash: **`/cometer-crime`**'
            ].join('\n')
        );
}

async function sendReady(client, userId, lastCrime) {
    const map = notifiedMap();
    if (Number(map[userId] || 0) >= lastCrime) return { ok: false, reason: 'already' };

    let user;
    try {
        user = await client.users.fetch(userId);
    } catch (_) {
        return { ok: false, reason: 'fetch' };
    }

    try {
        await user.send({ embeds: [buildEmbed(user)] });
        map[userId] = lastCrime;
        saveNotified(map);
        return { ok: true };
    } catch (e) {
        const code = e?.code || e?.rawError?.code;
        if (code === 50007 || code === 50001) {
            map[userId] = lastCrime;
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
        const lastCrime = Number(raw || 0);
        if (!lastCrime) continue;

        if (now < lastCrime + CD_MS) continue;

        if (now - (lastCrime + CD_MS) > 90 * 60 * 1000) {
            const map = notifiedMap();
            if (Number(map[userId] || 0) < lastCrime) {
                map[userId] = lastCrime;
                saveNotified(map);
            }
            continue;
        }

        const r = await sendReady(client, userId, lastCrime);
        if (r.ok) {
            sent++;
            await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
        }
    }

    if (sent > 0) console.log(`[crimeReminder] ${sent} DM(s) de crime enviada(s)`);
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[crimeReminder] desligado (CRIME_REMINDER=off)');
        return;
    }

    const start = () => {
        if (started) return;
        started = true;
        tick(client).catch((e) => console.error('[crimeReminder]', e.message));
        setInterval(() => {
            tick(client).catch((e) => console.error('[crimeReminder]', e.message));
        }, CHECK_MS);
        console.log('[crimeReminder] loop iniciado');
    };

    if (client.user) setTimeout(start, 22_000);
    else {
        const onceReady = () => setTimeout(start, 22_000);
        client.once('clientReady', onceReady);
        client.once('ready', onceReady);
    }

    console.log('[crimeReminder] ativo · avisa no PV quando o cooldown (20 min) acaba');
}

module.exports = { setup, tick, CD_MS };
