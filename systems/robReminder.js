/**
 * Aviso por DM quando o cooldown do roubo (O.roubar) termina.
 * ENV: ROB_REMINDER=off → desliga
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');

const CD_MS = 15 * 60 * 1000;
const CHECK_MS = 45 * 1000;
const BATCH_DELAY_MS = 1200;
const COLOR = 0xa855f7;

let started = false;

function isEnabled() {
    const v = String(process.env.ROB_REMINDER || 'on').toLowerCase();
    return v !== 'off' && v !== '0' && v !== 'false' && v !== 'no';
}

function cdMap() {
    return store.load('robcd.json', {});
}

function notifiedMap() {
    return store.load('rob_reminders.json', {});
}

function saveNotified(data) {
    store.save('rob_reminders.json', data);
}

function buildEmbed(user) {
    const name = user?.username || 'ladrão';
    const avatar = user.displayAvatarURL?.({ size: 256 }) || null;

    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: 'Aeternus · Roubo',
            iconURL: avatar || undefined
        })
        .setTitle('✦ A sombra voltou a cobrir você')
        .setDescription(
            [
                `Olá, **${name}**.`,
                '',
                'O tempo de espera acabou. Você já pode tentar roubar de novo.',
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '🎯 **Chance de sucesso:** 55%',
                '💰 **Em caso de sucesso:** 26% – 40% da carteira da vítima',
                '⚠️ **Em caso de falha:** perde 14% – 22% do seu saldo (vai para o bot)',
                '🏦 Só conta o que está **em mãos** (banco protegido)',
                '⏱ **Cooldown:** 15 minutos',
                '━━━━━━━━━━━━━━━━━━━━',
                '',
                '**Como agir**',
                '• Prefixo: **`O.roubar @usuario`**',
                '• Slash: **`/roubar`**'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus Economy · fique atento às regras do servidor' });
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

        // ignora avisos muito atrasados (> 90 min após liberar)
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

    if (sent > 0) console.log(`[robReminder] ${sent} DM(s) de roubo enviada(s)`);
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[robReminder] desligado (ROB_REMINDER=off)');
        return;
    }

    const start = () => {
        if (started) return;
        started = true;
        tick(client).catch((e) => console.error('[robReminder]', e.message));
        setInterval(() => {
            tick(client).catch((e) => console.error('[robReminder]', e.message));
        }, CHECK_MS);
        console.log('[robReminder] loop iniciado');
    };

    if (client.user) setTimeout(start, 24_000);
    else {
        const onceReady = () => setTimeout(start, 24_000);
        client.once('clientReady', onceReady);
        client.once('ready', onceReady);
    }

    console.log('[robReminder] ativo · avisa no PV quando o cooldown (15 min) acaba');
}

module.exports = { setup, tick, CD_MS };
