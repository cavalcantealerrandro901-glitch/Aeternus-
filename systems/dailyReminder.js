/**
 * Lembrete de daily por DM — 1 aviso por usuário por dia (BRT).
 *
 * ENV:
 *   DAILY_REMINDER=off     → desliga
 *   DAILY_REMINDER_HOUR=12 → hora BRT preferencial (0-23), padrão 12
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');
const daily = require('../utils/daily');
const eter = require('../utils/eter');

const COLOR = 0x22c55e;
const INTERVAL_MS = 30 * 60 * 1000; // 30 min
const BATCH_DELAY_MS = 1200; // espaço entre DMs (rate limit)

function reminders() {
    return store.load('daily_reminders.json', {});
}

function saveReminders(data) {
    store.save('daily_reminders.json', data);
}

function hourBRT() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: 'numeric',
        hour12: false
    }).formatToParts(new Date());
    return Number(parts.find((p) => p.type === 'hour')?.value || 0);
}

function preferredHour() {
    const h = parseInt(process.env.DAILY_REMINDER_HOUR || '12', 10);
    if (Number.isNaN(h)) return 12;
    return Math.max(0, Math.min(23, h));
}

function isEnabled() {
    const v = String(process.env.DAILY_REMINDER || 'on').toLowerCase();
    return v !== 'off' && v !== '0' && v !== 'false' && v !== 'no';
}

/** Usuários que já interagiram com economia / daily */
function candidateIds() {
    const ids = new Set();
    try {
        const d = store.load('daily.json', {});
        for (const id of Object.keys(d || {})) ids.add(id);
    } catch (_) {}
    try {
        const e = eter.all ? eter.all() : store.load('eter.json', {});
        for (const id of Object.keys(e || {})) ids.add(id);
    } catch (_) {}
    try {
        const x = store.load('xp.json', {});
        for (const id of Object.keys(x || {})) ids.add(id);
    } catch (_) {}
    return [...ids].filter((id) => /^\d{16,20}$/.test(id));
}

function buildEmbed() {
    return new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('Daily disponível')
        .setDescription(
            [
                'Sua **recompensa diária** ainda não foi resgatada hoje.',
                '',
                'Use no servidor:',
                '`O.daily` ou `/diario`',
                '',
                'Resgate até meia-noite (Brasília) para manter a sequência.'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · lembrete automático (1x por dia)' });
}

async function sendOne(client, userId, today) {
    const st = daily.status(userId, null);
    if (st.claimed) return { ok: false, reason: 'claimed' };

    const map = reminders();
    if (map[userId] === today) return { ok: false, reason: 'already' };

    try {
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user || user.bot) return { ok: false, reason: 'invalid' };

        await user.send({ embeds: [buildEmbed()] });

        map[userId] = today;
        // limpa registros antigos (> 3 dias)
        const cutoff = (() => {
            const d = new Date(today + 'T12:00:00');
            d.setDate(d.getDate() - 3);
            return d.toLocaleDateString('en-CA');
        })();
        for (const [uid, day] of Object.entries(map)) {
            if (day < cutoff) delete map[uid];
        }
        saveReminders(map);
        return { ok: true };
    } catch (e) {
        // DM fechada / bloqueado — marca o dia para não insistir
        const code = e?.code || e?.rawError?.code;
        if (code === 50007 || code === 50001) {
            map[userId] = today;
            saveReminders(map);
            return { ok: false, reason: 'dm_closed' };
        }
        return { ok: false, reason: e.message || 'error' };
    }
}

async function runPass(client) {
    if (!isEnabled()) return;
    if (!client?.isReady?.() && !client?.user) return;

    const hour = hourBRT();
    const prefer = preferredHour();
    // só dispara a partir da hora configurada até 22h BRT
    if (hour < prefer || hour >= 23) return;

    const today = daily.todayKey();
    const ids = candidateIds();
    if (!ids.length) return;

    let sent = 0;
    let skipped = 0;

    for (const id of ids) {
        const r = await sendOne(client, id, today);
        if (r.ok) sent++;
        else skipped++;
        if (r.ok) await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
    }

    if (sent > 0) {
        console.log(`[dailyReminder] ${sent} DM(s) enviada(s) · ${skipped} ignorado(s) · ${today}`);
    }
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[dailyReminder] desligado (DAILY_REMINDER=off)');
        return;
    }

    const start = () => {
        runPass(client).catch((e) => console.error('[dailyReminder]', e.message));
        setInterval(() => {
            runPass(client).catch((e) => console.error('[dailyReminder]', e.message));
        }, INTERVAL_MS);
    };

    if (client.isReady?.() || client.user) {
        // pequena espera após boot
        setTimeout(start, 20_000);
    } else {
        client.once('clientReady', () => setTimeout(start, 20_000));
        client.once('ready', () => setTimeout(start, 20_000));
    }

    console.log(
        `[dailyReminder] ativo · a partir das ${preferredHour()}h BRT · intervalo 30min`
    );
}

module.exports = { setup, runPass };
