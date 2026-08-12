const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const { todayKey, msUntilNextMidnight } = require('./economy');
const { dailyReadyPhrase } = require('./phrases');

let timer = null;

async function notifyUsers(client) {
    const today = todayKey();
    console.log(`🌙 Daily notifier — verificando ${today}`);

    try {
        const users = await db.getUsersForDailyNotify(today);
        let sent = 0;

        for (const u of users) {
            try {
                const cfg = db.getGuildConfig(u.guildId);
                // respeita toggle do painel (padrão: ligado)
                if (cfg.rewards && cfg.rewards.dailyDm === false) continue;

                const discordUser = await client.users.fetch(u.userId).catch(() => null);
                if (!discordUser) continue;

                const embed = new EmbedBuilder()
                    .setColor(0x7c3aed)
                    .setTitle('🌌 Seu Daily está disponível!')
                    .setDescription(
                        `${dailyReadyPhrase()}\n\n` +
                        `O tributo da meia-noite aguarda.\n` +
                        `Use **/daily** no servidor ou o botão abaixo.`
                    )
                    .setFooter({ text: 'Aeternus · Tributo da meia-noite (BRT)' })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`aeternus_daily_claim:${u.guildId}`)
                        .setLabel('Coletar Daily')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💀')
                );

                await discordUser.send({ embeds: [embed], components: [row] }).catch(() => null);

                await db.UserEconomy.updateOne(
                    { userId: u.userId, guildId: u.guildId },
                    { $set: { dailyNotifiedDate: today } }
                );
                sent++;

                await new Promise(r => setTimeout(r, 500));
            } catch {
                // DM fechada etc.
            }
        }

        console.log(`🌙 Daily notifier — ${sent} DMs enviadas`);
    } catch (err) {
        console.error('Erro no daily notifier:', err.message);
    }
}

function scheduleNext(client) {
    const ms = msUntilNextMidnight();
    console.log(`🌙 Próximo daily notify em ~${Math.round(ms / 60000)} min`);

    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
        await notifyUsers(client);
        scheduleNext(client);
    }, ms + 2000);
}

function startDailyNotifier(client) {
    scheduleNext(client);
    setTimeout(() => notifyUsers(client), 15000);
}

module.exports = { startDailyNotifier, notifyUsers };
