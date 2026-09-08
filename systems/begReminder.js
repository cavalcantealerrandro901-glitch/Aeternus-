/**
 * Aviso por DM quando o cooldown do beg (O.beg / O.pedir) termina.
 * ENV: BEG_REMINDER=off → desliga
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');

const CD_MS = 60 * 60 * 1000;
const CHECK_MS = 45 * 1000;
const BATCH_DELAY_MS = 1200;
const COLOR = 0x34d399;

let started = false;

function isEnabled() {
    const v = String(process.env.BEG_REMINDER || 'on').toLowerCase();
    return v !== 'off' && v !== '0' && v !== 'false' && v !== 'no';
}

function cdMap() {
    return store.load('begcd.json', {});
}

function notifiedMap() {
    return store.load('beg_reminders.json', {});
}

function saveNotified(data) {
    store.save('beg_reminders.json', data);
}

function buildEmbed(user) {
    const name = user?.globalName || user?.username || 'amigo';
    const avatar = user.displayAvatarURL?.({ size: 256 }) || null;

    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: 'Aeternus · Pedir',
            iconURL: avatar || undefined
        })
        .setTitle('🙏 A generosidade voltou a sorrir')
        .setDescription(
            [
                `**${name}**, o tempo de espera terminou.`,
                '',
                'Alguém no servidor pode te ajudar de novo —',
                'um novo pedido está **liberado agora**.',
                '',
                '┌─────────────────────────┐',
                '│  ✨ **100.000 – 600.000** éter',
                '│  ⏱ Próximo pedido em **1 hora**',
                '└─────────────────────────┘',
                '',
                'Use **`O.pedir`** ou **`/pedir`** no servidor',
                'e receba sua parte de éter.',
                '',
                '_Boa sorte — e não demore demais._'
            ].join('\n')
        )
        .setThumbnail(avatar || null)
        .setFooter({ text: 'Aeternus · economia · pedido liberado' })
        .setTimestamp();
}

async function sendReady(client, userId, lastBeg) {
    const map = notifiedMap();
    if (Number(map[userId] || 0) >= lastBeg) return { ok: false, reason: 'already' };

    let user;
    try {
        user = await client.users.fetch(userId);
    } catch (_) {
        return { ok: false, reason: 'fetch' };
    }

    try {
        await user.send({ embeds: [buildEmbed(user)] });
        map[userId] = lastBeg;
        saveNotified(map);
        return { ok: true };
    } catch (e) {
        const code = e?.code || e?.rawError?.code;
        if (code === 50007 || code === 50001) {
            map[userId] = lastBeg;
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
        const lastBeg = Number(raw || 0);
        if (!lastBeg) continue;

        if (now < lastBeg + CD_MS) continue;

        if (now - (lastBeg + CD_MS) > 2 * 60 * 60 * 1000) {
            const map = notifiedMap();
            if (Number(map[userId] || 0) < lastBeg) {
                map[userId] = lastBeg;
                saveNotified(map);
            }
            continue;
        }

        const r = await sendReady(client, userId, lastBeg);
        if (r.ok) {
            sent++;
            await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
        }
    }

    if (sent > 0) console.log(`[begReminder] ${sent} DM(s) de beg enviada(s)`);
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[begReminder] desligado (BEG_REMINDER=off)');
        return;
    }

    const start = () => {
        if (started) return;
        started = true;
        tick(client).catch((e) => console.error('[begReminder]', e.message));
        setInterval(() => {
            tick(client).catch((e) => console.error('[begReminder]', e.message));
        }, CHECK_MS);
        console.log('[begReminder] loop iniciado');
    };

    if (client.user) setTimeout(start, 24_000);
    else {
        const onceReady = () => setTimeout(start, 24_000);
        client.once('clientReady', onceReady);
        client.once('ready', onceReady);
    }

    console.log('[begReminder] ativo · avisa no PV quando o cooldown (1h) acaba');
}

module.exports = { setup, tick, CD_MS };
