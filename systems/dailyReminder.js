/**
 * Lembrete de daily por DM — meia-noite (Brasília), 1x por dia.
 * Mensagens personalizadas por nome, sequência, nível e saldo.
 *
 * ENV: DAILY_REMINDER=off para desligar
 */
const { EmbedBuilder } = require('discord.js');
const store = require('../utils/store');
const daily = require('../utils/daily');
const eter = require('../utils/eter');

const CHECK_MS = 60 * 1000;
const BATCH_DELAY_MS = 1200;

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

function fmt(n) {
    if (typeof eter.formatPlain === 'function') return eter.formatPlain(n);
    return Number(n || 0).toLocaleString('pt-BR');
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function buildEmbed(user, st) {
    const name = user?.username || 'viajante';
    const streak = Math.max(0, Number(st.nextStreak || st.streak || 0));
    const level = Math.max(0, Number(st.level || 0));
    const balance = Math.max(0, Number(st.balance || 0));
    const min = st.dailyMin ?? 5000;
    const max = st.dailyMax ?? 15000;
    const multiplier = Number(st.multiplier || 1);
    const inactiveDays = daily.daysSince(st.last);
    const embed = new EmbedBuilder()
        .setFooter({ text: 'AETERNUS ECONOMY • Notificação diária' })
        .setTimestamp();

    if (inactiveDays === 6) {
        return embed
            .setColor(0xf59e0b)
            .setTitle('⚠️ Sua sequência precisa de atenção')
            .setDescription([
                `Olá, **${name}**.`,
                '',
                'Faz **6 dias** desde seu último resgate diário.',
                `Sua sequência anterior era de **${Number(st.streak || 0)} dia(s)**.`,
                '',
                'Resgate hoje para evitar que a sequência seja reiniciada no próximo resgate.',
                '',
                '**Como resgatar**',
                'Use `O.daily` ou `/daily` em um servidor com o Aeternus.'
            ].join('\n'));
    }

    let title = '✨ Seu daily está disponível';
    let color = 0x8b5cf6;
    let intro = 'Uma nova recompensa diária está esperando por você.';
    if (streak >= 30) {
        title = '👑 Sequência lendária';
        color = 0xfbbf24;
        intro = `Sua constância já chegou a **${streak} dias**. Continue sua jornada.`;
    } else if (streak >= 7) {
        title = '🔥 Sequência em andamento';
        color = 0x34d399;
        intro = `Você está construindo uma sequência de **${streak} dias**.`;
    } else if (streak <= 1 && !st.last) {
        title = '🌟 Comece sua jornada diária';
        color = 0x60a5fa;
        intro = 'Faça seu primeiro resgate e comece a construir sua sequência.';
    } else if (streak <= 1) {
        title = '🔄 Recomece sua sequência';
        color = 0xf472b6;
        intro = 'Seu novo ciclo começou. Resgate a recompensa de hoje para continuar.';
    }

    const description = [
        `Olá, **${name}**!`,
        '',
        intro,
        '',
        '**📊 Seu resumo**',
        `🔥 Próxima sequência: **${streak} dia(s)**`,
        level > 0 ? `⭐ Nível: **${level}**` : null,
        `✨ Saldo atual: **${fmt(balance)} éter**`,
        '',
        '**🎁 Recompensa estimada**',
        `✨ ${fmt(min)} – ${fmt(max)} éter`,
        multiplier > 1 ? `Multiplicador atual: **×${multiplier.toFixed(2)}**` : null,
        '',
        '**Resgate agora**',
        'Use `O.daily` ou `/daily` em um servidor com o Aeternus.'
    ].filter((line) => line !== null).join('\n');

    return embed.setColor(color).setTitle(title).setDescription(description);
}

let ticking = false;

async function tick(client) {
    if (!isEnabled() || ticking) return;
    ticking = true;
    try {
        // Não depende de o bot estar online exatamente à meia-noite:
        // avisa no primeiro ciclo disponível; falhas permanentes de DM são registradas no dia para evitar tentativas repetidas a cada minuto.
        const { day } = nowBRT();
        const data = reminders();
        const ids = candidateIds();
        let sent = 0;
        let failedDM = 0;
        let fetchFailed = 0;

        for (const id of ids) {
            if (data[id] === day) continue;

            try {
                const st = daily.status(id);
                // Não avisa quem já resgatou o daily neste dia.
                if (st.claimed) {
                    data[id] = day;
                    continue;
                }

                const user = await client.users.fetch(id).catch(() => null);
                if (!user) {
                    fetchFailed += 1;
                    continue;
                }

                try {
                    await user.send({ embeds: [buildEmbed(user, st)] });
                    data[id] = day;
                    sent += 1;
                    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
                } catch (error) {
                    // Falhas comuns de DM (privacidade, bloqueio ou nenhum servidor em comum)
                    // não precisam poluir os logs nem provocar novas tentativas a cada minuto.
                    const code = Number(error?.code);
                    const message = String(error?.message || '');
                    const cannotDM = code === 50007 ||
                        /Cannot send messages to this user|no mutual guilds/i.test(message);

                    if (cannotDM) {
                        data[id] = day;
                        failedDM += 1;
                    } else {
                        console.warn('[dailyReminder] Erro inesperado ao enviar DM:', error?.message || error);
                    }
                }
            } catch (error) {
                console.warn('[dailyReminder] Falha ao processar lembrete:', error?.message || error);
            }
        }

        saveReminders(data);
        if (sent || failedDM || fetchFailed) {
            console.log(`[dailyReminder] ${day} · enviadas: ${sent} · DMs indisponíveis: ${failedDM} · usuários não encontrados: ${fetchFailed}`);
        }
    } finally {
        ticking = false;
    }
}

function setup(client) {
    if (!isEnabled()) {
        console.log('[dailyReminder] desligado (DAILY_REMINDER=off)');
        return;
    }
    console.log('[dailyReminder] ativo · meia-noite BRT');
    setTimeout(() => tick(client).catch(() => {}), 8000);
    setInterval(() => tick(client).catch(() => {}), CHECK_MS);
}

module.exports = { setup, tick, buildEmbed };
