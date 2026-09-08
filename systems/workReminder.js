/**
 * Aviso por DM quando o cooldown do trabalho (O.work) termina.
 * ENV: WORK_REMINDER=off → desliga
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');
const workUtil = require('../utils/work');

const CHECK_MS = 45 * 1000;
const BATCH_DELAY_MS = 1200;
const COLOR = 0x10b981;

let started = false;

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

function buildEmbed(user, data) {
    const name = user?.username || 'trabalhador';
    const rank = workUtil.rankFor?.(data.jobs) || { emoji: '💼', name: 'Iniciante' };
    const mins = Math.round((workUtil.COOLDOWN_MS || 45 * 60 * 1000) / 60000);
    const jobs = Number(data.jobs || 0);
    const avatar = user.displayAvatarURL?.({ size: 256 }) || null;

    return new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({
            name: 'Aeternus · Trabalho',
            iconURL: avatar || undefined
        })
        .setTitle('✦ Seu turno está liberado')
        .setDescription(
            [
                `Olá, **${name}**.`,
                '',
                'O intervalo acabou. Um novo turno de trabalho está **disponível** agora.',
                'Resgate o pagamento e continue subindo de cargo.',
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                `${rank.emoji || '💼'} **Cargo:** ${rank.name || 'Iniciante'}`,
                `📊 **Turnos concluídos:** ${jobs.toLocaleString('pt-BR')}`,
                `⏱ **Próximo cooldown:** ~${mins} minutos após trabalhar`,
                '━━━━━━━━━━━━━━━━━━━━',
                '',
                '**Como trabalhar**',
                '• Prefixo: **`O.work`**',
                '• Slash: **`/trabalho`**',
                '',
                '_Este é um aviso único por turno. Boa sorte no serviço._'
            ].join('\n')
        )
        .setThumbnail(avatar)
        .setFooter({ text: 'Aeternus · aviso de trabalho · 1 DM por ciclo' })
        .setTimestamp();
}

async function sendReady(client, userId, lastWork, data) {
    const map = notifiedMap();
    if (Number(map[userId] || 0) >= lastWork) return { ok: false, reason: 'already' };

    // reserva ANTES do envio (evita 2 DMs em ticks paralelos)
    map[userId] = lastWork;
    saveNotified(map);

    try {
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user || user.bot) return { ok: false, reason: 'invalid' };

        await user.send({ embeds: [buildEmbed(user, data)] });
        return { ok: true };
    } catch (e) {
        const code = e?.code || e?.rawError?.code;
        if (code === 50007 || code === 50001) {
            return { ok: false, reason: 'dm_closed' };
        }
        const m = notifiedMap();
        if (Number(m[userId]) === lastWork) {
            delete m[userId];
            saveNotified(m);
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

        if (now < lastWork + cooldown) continue;

        if (now - (lastWork + cooldown) > 90 * 60 * 1000) {
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
        if (started) return;
        started = true;
        tick(client).catch((e) => console.error('[workReminder]', e.message));
        setInterval(() => {
            tick(client).catch((e) => console.error('[workReminder]', e.message));
        }, CHECK_MS);
        console.log('[workReminder] loop iniciado');
    };

    if (client.user) setTimeout(start, 20_000);
    else {
        const onceReady = () => setTimeout(start, 20_000);
        client.once('clientReady', onceReady);
        client.once('ready', onceReady);
    }

    const mins = Math.round((workUtil.COOLDOWN_MS || 45 * 60 * 1000) / 60000);
    console.log(`[workReminder] ativo · avisa quando o cooldown (~${mins} min) acaba`);
}

module.exports = { setup, tick };
