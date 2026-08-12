const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database/db');
const { todayKey, msUntilNextMidnight } = require('./economy');
const { aiDailyReady, dailyReadyPhrase } = require('./phrases');

let timer = null;

async function notifyUsers(client) {
    const today = todayKey();
    console.log(`Daily notifier — ${today}`);

    try {
        const users = await db.getUsersForDailyNotify(today);
        let sent = 0;

        for (const u of users) {
            try {
                const cfg = db.getGuildConfig(u.guildId);
                if (cfg.rewards && cfg.rewards.dailyDm === false) continue;

                const discordUser = await client.users.fetch(u.userId).catch(() => null);
                if (!discordUser) continue;

                const phrase = (await aiDailyReady()) || dailyReadyPhrase();

                const embed = new EmbedBuilder()
                    .setColor(0x7c3aed)
                    .setTitle('Daily disponível')
                    .setDescription(
                        `${phrase}\n\nUse **/daily** no servidor ou o botão abaixo.`
                    )
                    .setFooter({ text: 'Aeternus' })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`aeternus_daily_claim:${u.guildId}`)
                        .setLabel('Coletar Daily')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('💰')
                );

                await discordUser.send({ embeds: [embed], components: [row] }).catch(() => null);

                await db.UserEconomy.updateOne(
                    { userId: u.userId, guildId: u.guildId },
                    { $set: { dailyNotifiedDate: today } }
                );
                sent++;
                if (sent % 5 === 0) await new Promise((r) => setTimeout(r, 1200));
            } catch {}
        }

        console.log(`Daily notifier: ${sent} DM(s)`);
    } catch (err) {
        console.error('Daily notifier erro:', err.message);
    }
}

function scheduleNext(client) {
    const ms = msUntilNextMidnight() + 2000;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
        await notifyUsers(client);
        scheduleNext(client);
    }, ms);
    console.log(`Próximo daily notify em ${Math.round(ms / 60000)} min`);
}

function startDailyNotifier(client) {
    scheduleNext(client);
}

module.exports = { startDailyNotifier, notifyUsers };
