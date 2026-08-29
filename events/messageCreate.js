const { getPrefix, getSettings } = require('../utils/settings');
const xp = require('../utils/xp');
const afk = require('../utils/afk');

const xpCd = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (!message.guild || message.author.bot) return;

        try {
            if (afk.has(message.author.id)) {
                afk.clear(message.author.id);
                message.reply('👋 AFK removido.').catch(() => {});
            }
            for (const [id] of message.mentions.users) {
                if (afk.has(id)) {
                    const d = afk.get(id);
                    message.reply(`💤 <@${id}> está AFK: **${d.reason}**`).catch(() => {});
                }
            }
        } catch (_) {}

        try {
            const conf = getSettings(message.guild.id).xp;
            if (conf.enabled !== false && message.content.length >= 3) {
                const key = `${message.guild.id}:${message.author.id}`;
                const now = Date.now();
                const cd = (conf.cooldownSec || 45) * 1000;
                if (!xpCd.has(key) || now - xpCd.get(key) > cd) {
                    xpCd.set(key, now);
                    const gain =
                        (conf.min || 30) +
                        Math.floor(Math.random() * ((conf.max || 77) - (conf.min || 30) + 1));
                    const res = xp.addXp(message.author.id, gain);
                    if (res.leveled) {
                        message.channel
                            .send(
                                `✨ ${message.author} nível **${res.level}** · +❄️ ${res.reward.toLocaleString('pt-BR')}`
                            )
                            .catch(() => {});
                    }
                }
            }
        } catch (_) {}

        const prefix = getPrefix(message.guild.id);
        if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;

        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const name = (args.shift() || '').toLowerCase();
        if (!name) return;

        const cmd = client.commands.get(name);
        if (!cmd?.execute) return;

        try {
            await cmd.execute(message, args, client);
        } catch (e) {
            console.error(`[${name}]`, e);
            message.reply('❌ Erro ao executar.').catch(() => {});
        }
    }
};
