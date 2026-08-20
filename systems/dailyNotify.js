/**
 * Avisa no DM à meia-noite (horário de Brasília) que o daily está disponível.
 */
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const cristais = require('../utils/cristais');
const { getPanelBase } = require('../utils/panelUrl');

const FILE = path.join(__dirname, '..', 'data', 'daily.json');

function readDaily() {
    if (!fs.existsSync(FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(FILE, 'utf8') || '{}');
    } catch {
        return {};
    }
}

function brasiliaParts(d = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    });
    const parts = Object.fromEntries(fmt.formatToParts(d).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
    return {
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        day: `${parts.year}-${parts.month}-${parts.day}`
    };
}

function setup(client) {
    let lastPingDay = null;

    const tick = async () => {
        const { hour, minute, day } = brasiliaParts();
        // Janela 00:00–00:02 para não perder o minuto
        if (hour !== 0 || minute > 2) return;
        if (lastPingDay === day) return;
        lastPingDay = day;

        const data = readDaily();
        const url = `${getPanelBase()}/daily.html`;

        for (const [userId, info] of Object.entries(data)) {
            if (info && info.notify === false) continue;
            try {
                const user = await client.users.fetch(userId).catch(() => null);
                if (!user) continue;

                const streak = info.streak || 0;
                const mult = cristais.dailyMultiplier(userId);
                const level = cristais.levelFromTotal(cristais.get(userId));

                const embed = new EmbedBuilder()
                    .setColor(0x38bdf8)
                    .setTitle('🎁 Daily disponível')
                    .setDescription(
                        `Já passou da **meia-noite** — sua recompensa diária liberou.\n\n` +
                            `**Sequência:** ${streak} dia(s)\n` +
                            `**🧊 Cristais:** nível ${level} · multi **×${mult.toFixed(2)}**\n\n` +
                            `[Resgatar no painel](${url})`
                    )
                    .setFooter({ text: 'Aeternus · ❄️ flocos' })
                    .setTimestamp();

                await user.send({ embeds: [embed] }).catch(() => {
                    /* DM fechado */
                });
            } catch (e) {
                console.error('dailyNotify', userId, e.message);
            }
        }

        console.log(`🎁 Daily notify enviado (${day} BRT)`);
    };

    setInterval(tick, 30 * 1000);
    console.log('🧩 [SISTEMA] dailyNotify.js (meia-noite BRT)');
}

module.exports = { setup };
module.exports.setup = setup;
