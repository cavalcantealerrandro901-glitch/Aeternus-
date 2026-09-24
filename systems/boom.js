/**
 * Boom / Fundo — avisa no canal configurado quando o comando fica pronto de novo.
 */
const boom = require('../utils/boom');

const CHECK_MS = 60 * 1000; // 1 min

function setup(client) {
    const tick = async () => {
        try {
            const ready = boom.listReadyToNotify();
            for (const guildId of ready) {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) continue;
                const cfg = boom.getConfig(guildId);
                if (!cfg.channelId) {
                    boom.markReadyNotified(guildId);
                    continue;
                }
                const channel = await guild.channels.fetch(cfg.channelId).catch(() => null);
                if (!channel || !channel.isTextBased?.()) {
                    boom.markReadyNotified(guildId);
                    continue;
                }
                const mention = cfg.notifyRoleId ? `<@&${cfg.notifyRoleId}>` : '';
                await channel
                    .send({
                        content:
                            (mention ? mention + ' ' : '') +
                            '✅ **Boom/Fundo disponível de novo!** Use `O.boom` ou `O.fundo`.',
                        allowedMentions: cfg.notifyRoleId
                            ? { roles: [cfg.notifyRoleId] }
                            : { parse: [] }
                    })
                    .catch(() => {});
                boom.markReadyNotified(guildId);
            }
        } catch (e) {
            console.warn('[boom]', e.message);
        }
    };

    const timer = setInterval(tick, CHECK_MS);
    if (typeof timer.unref === 'function') timer.unref();

    // primeira checagem após ready
    const onReady = () => setTimeout(tick, 8000);
    if (client.isReady?.()) onReady();
    else client.once('clientReady', onReady);

    return {
        stop() {
            clearInterval(timer);
        }
    };
}

module.exports = { setup };
