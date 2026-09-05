/**
 * Aviso por DM quando o cooldown do trabalho (O.work) termina.
 *
 * ENV:
 *   WORK_REMINDER=off  → desliga
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');
const workUtil = require('../utils/work');

const CHECK_MS = 30 * 1000;
const BATCH_DELAY_MS = 1000;
const COLOR = 0x22c55e;

function isEnabled() {
    const v = String(process.env.WORK_REMINDER || 'on').toLowerCase();
    return v !== 'off' && v !== '0' && v !== 'false' && v !== 'no';
}

function notifiedMap() {
    return store.load('work_reminders.json', {});
}

function saveNotified(data) {
    store.save('work_reminders.json', data);
}

function workData() {
    return store.load('work.json', {});
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildEmbed(user, data) {
    const name = user?.username || 'trabalhador';
    const rank = workUtil.rankFor?.(data.jobs) || { emoji: '💼', name: 'Cargo' };
    const mins = Math.round((workUtil.COOLDOWN_MS || 45 * 60 * 1000) / 60000);

    const title = pick([
        '✦ Turno liberado',
        '💼 Pronto para trabalhar',
        '✨ Intervalo encerrado'
    ]);

    const body = pick([
        [
            `**${name}**, o descanso acabou.`,
            '',
            `${rank.emoji || '💼'} Cargo: **${rank.name || 'Iniciante'}**`,
            'Um novo turno está disponível — éter à espera.',
            '',
            'No servidor:',
            '**`O.work`**  ou  **`/trabalho`**',
            '',
            `_Cooldown cooldown volta a contar por ~${mins} min após o turno._`
        ].join('\n'),
        [
            `Olá, **${name}**.`,
            '',
            'O intervalo do trabalho terminou.',
            'Quanto antes resgatar, mais cedo sobe o ranking de cargos.',
            '',
            '→ **`O.work`**  ·  **`/trabalho`**'
        ].join('\n'),
        [
            `**${name}**, a fila abriu de novo.`,
            '',
            `${rank.emoji || '💼'} **${rank.name || 'Iniciante'}** · turnos: **${Number(data.jobs || 0)}**`,
            '',
            'Use **`/trabalho`** e garanta o pagamento do turno.'
        ].join('\n')
    ]);

    return new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(title)
        .setDescription(body)
        .setFooter({ text: 'Aeternus · aviso de trabalho' });
}

async function sendReady(client, userId, lastWork, data) {
    const map = notifiedMap();
    // já avisou neste ciclo (mesmo lastWork)
    if (Number(map[userId] || 0) >= lastWork) return { ok: false, reason: 'already' };

    try {
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user || user.bot) return { ok: false, reason: 'invalid' };

        await user.send({ embeds: [buildEmbed(user, data)] });

        map[userId] = lastWork;
        // limpa entradas muito antigas (30 dias)
        const cut = Date.now() - 30 * 864e5;
        for (const [uid, ts] of Object.entries(map)) {
            if (Number(ts) < cut) delete map[uid];
        }
        saveNotified(map);
        return { ok: true };
    } catch (e) {
        const code = e?.code || e?.rawError?.code;
        if (code === 50007 || code === 50001) {
            map[userId] = lastWork;
            saveNotified(map);
            return { ok: false, reason: 'dm_closed' };
        }
        return { ok: false, reason: e.message || 'error' };
    }
}

async function tick(client) {
    if (!isEnabled()) return;
    if (!client?.user) return;

    const cooldown = workUtil.COOLDOWN_MS || 45 * 60 * 1000;
    const now = Date.now();
    const all = workData();
    let sent = 0;

    for (const [userId, raw] of Object.entries(all || {})) {
        if (!/^\d{16,20}$/.test(userId)) continue;
        const data = raw || {};
        const lastWork = Number(data.lastWork || 0);
        if (!lastWork) continue;

        // ainda em cooldown
        if (now < lastWork + cooldown) continue;

        // só avisa se o cooldown acabou há pouco (até 2h) — evita flood em restart
        if (now - (lastWork + cooldown) > 2 * 60 * 60 * 1000) {
            // marca como notificado sem enviar (legado)
            const map = notifiedMap();
            if (Number(map[userId] || 0) < lastWork) {
                map[userId] = lastWork;
                saveNotified(map);
            }
            continue;
        }

        const r = await sendReady(client, userId, lastWork, data);
        if (r.ok) {
            sent++;
            await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
        }
    }

    if (sent > 0) console.log(`[workReminder] ${sent} DM(s) de trabalho enviada(s)`);
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[workReminder] desligado (WORK_REMINDER=off)');
        return;
    }

    const start = () => {
        tick(client).catch((e) => console.error('[workReminder]', e.message));
        setInterval(() => {
            tick(client).catch((e) => console.error('[workReminder]', e.message));
        }, CHECK_MS);
    };

    if (client.user) setTimeout(start, 25_000);
    else {
        client.once('clientReady', () => setTimeout(start, 25_000));
        client.once('ready', () => setTimeout(start, 25_000));
    }

    const mins = Math.round((workUtil.COOLDOWN_MS || 45 * 60 * 1000) / 60000);
    console.log(`[workReminder] ativo · avisa quando o cooldown (~${mins} min) acaba`);
}

module.exports = { setup, tick };
