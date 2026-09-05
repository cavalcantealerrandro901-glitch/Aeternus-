/**
 * Lembrete de daily por DM — dispara à meia-noite (Brasília), 1x por dia.
 *
 * ENV:
 *   DAILY_REMINDER=off  → desliga
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');
const daily = require('../utils/daily');
const eter = require('../utils/eter');

const COLOR = 0xa78bfa;
const CHECK_MS = 60 * 1000; // verifica a cada 1 min
const BATCH_DELAY_MS = 1200;

/** Evita rodar duas vezes no mesmo minuto de virada */
let lastRunDay = null;

function reminders() {
    return store.load('daily_reminders.json', {});
}

function saveReminders(data) {
    store.save('daily_reminders.json', data);
}

function nowBRT() {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    return {
        day: `${parts.year}-${parts.month}-${parts.day}`,
        hour: Number(parts.hour),
        minute: Number(parts.minute)
    };
}

function isEnabled() {
    const v = String(process.env.DAILY_REMINDER || 'on').toLowerCase();
    return v !== 'off' && v !== '0' && v !== 'false' && v !== 'no';
}

function candidateIds() {
    const ids = new Set();
    try {
        for (const id of Object.keys(store.load('daily.json', {}) || {})) ids.add(id);
    } catch (_) {}
    try {
        const e = typeof eter.all === 'function' ? eter.all() : store.load('eter.json', {});
        for (const id of Object.keys(e || {})) ids.add(id);
    } catch (_) {}
    try {
        for (const id of Object.keys(store.load('xp.json', {}) || {})) ids.add(id);
    } catch (_) {}
    return [...ids].filter((id) => /^\d{16,20}$/.test(id));
}

function buildEmbed(user) {
    const name = user?.username || 'viajante';

    return new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('✦ Um novo ciclo começou')
        .setDescription(
            [
                `Olá, **${name}**.`,
                '',
                'A meia-noite abriu a **recompensa diária**.',
                'Éter fresco, sequência intacta — se você resgatar hoje.',
                '',
                'No servidor, use:',
                '**`O.daily`**  ou  **`/diario`**',
                '',
                '_Quanto mais dias seguidos, mais a jornada conta._'
            ].join('\n')
        )
        .setFooter({ text: 'Aeternus · só este aviso por dia' });
}

async function sendOne(client, userId, today) {
    const st = daily.status(userId, null);
    if (st.claimed) return { ok: false, reason: 'claimed' };

    const map = reminders();
    if (map[userId] === today) return { ok: false, reason: 'already' };

    try {
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user || user.bot) return { ok: false, reason: 'invalid' };

        await user.send({ embeds: [buildEmbed(user)] });

        map[userId] = today;

        // limpa avisos com mais de 4 dias
        const cut = new Date(today + 'T12:00:00');
        cut.setDate(cut.getDate() - 4);
        const cutoff = cut.toLocaleDateString('en-CA');
        for (const [uid, day] of Object.entries(map)) {
            if (String(day) < cutoff) delete map[uid];
        }
        saveReminders(map);
        return { ok: true };
    } catch (e) {
        const code = e?.code || e?.rawError?.code;
        if (code === 50007 || code === 50001) {
            map[userId] = today;
            saveReminders(map);
            return { ok: false, reason: 'dm_closed' };
        }
        return { ok: false, reason: e.message || 'error' };
    }
}

async function runMidnightPass(client) {
    if (!isEnabled()) return;
    if (!client?.user) return;

    const { day, hour, minute } = nowBRT();

    // Janela: 00:00–00:04 BRT (várias tentativas se o bot reiniciar)
    if (hour !== 0 || minute > 4) return;
    if (lastRunDay === day) return;

    lastRunDay = day;
    console.log(`[dailyReminder] meia-noite BRT · ${day} · enviando DMs…`);

    const ids = candidateIds();
    let sent = 0;
    let skipped = 0;

    for (const id of ids) {
        const r = await sendOne(client, id, day);
        if (r.ok) {
            sent++;
            await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
        } else {
            skipped++;
        }
    }

    console.log(`[dailyReminder] concluído · ${sent} enviada(s) · ${skipped} ignorado(s)`);
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[dailyReminder] desligado (DAILY_REMINDER=off)');
        return;
    }

    const tick = () => {
        runMidnightPass(client).catch((e) => console.error('[dailyReminder]', e.message));
    };

    const start = () => {
        tick();
        setInterval(tick, CHECK_MS);
    };

    if (client.user) setTimeout(start, 15_000);
    else {
        client.once('clientReady', () => setTimeout(start, 15_000));
        client.once('ready', () => setTimeout(start, 15_000));
    }

    console.log('[dailyReminder] ativo · disparo à meia-noite (Brasília)');
}

module.exports = { setup, runMidnightPass };
