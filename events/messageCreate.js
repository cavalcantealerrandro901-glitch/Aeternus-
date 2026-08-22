const { Events } = require('discord.js');
const { getPrefix } = require('../utils/prefixManager');
const chatXp = require('../utils/chatXp');

function formatAfkTime(ms) {
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        if (!client.afk) client.afk = new Map();

        if (client.afk.has(message.author.id)) {
            const data = client.afk.get(message.author.id);
            if (data.skipOnce) {
                data.skipOnce = false;
                client.afk.set(message.author.id, data);
            } else {
                client.afk.delete(message.author.id);
                const tempo = formatAfkTime(Date.now() - (data.timestamp || Date.now()));
                message
                    .reply(
                        `👋 Bem-vindo de volta, **${message.author.username}**! AFK removido (ausente por ${tempo}).`
                    )
                    .then((msg) => setTimeout(() => msg.delete().catch(() => {}), 6000))
                    .catch(() => {});
            }
        }

        if (message.mentions.users.size > 0) {
            for (const user of message.mentions.users.values()) {
                if (!client.afk.has(user.id) || user.id === message.author.id) continue;
                const data = client.afk.get(user.id);
                const tempo = formatAfkTime(Date.now() - (data.timestamp || Date.now()));
                message
                    .reply(
                        `💤 **${user.username}** está AFK há **${tempo}**.\nMotivo: \`${data.reason || 'Ausente'}\``
                    )
                    .catch(() => {});
            }
        }

        const prefix = getPrefix(message.guild.id);

        // XP por conversa (não em comandos)
        if (!message.content.startsWith(prefix)) {
            try {
                const awarded = chatXp.tryAward(message);
                if (awarded?.result?.leveledUp) {
                    const r = awarded.result;
                    message.channel
                        .send(
                            `🎉 **${message.author.username}** subiu para o nível **${r.levelAfter}**!\n` +
                                `❄️ Ganhou **${r.flocosGained.toLocaleString('pt-BR')}** flocos · Daily ×**${r.dailyMultiplier.toFixed(2)}**`
                        )
                        .then((m) => setTimeout(() => m.delete().catch(() => {}), 12000))
                        .catch(() => {});
                }
            } catch (e) {
                console.error('[chatXp]', e.message);
            }
            return;
        }

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = (args.shift() || '').toLowerCase();
        if (!commandName) return;

        const command =
            client.commands.get(commandName) ||
            client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        try {
            await command.execute(message, args, client);
        } catch (error) {
            console.error(`[CMD ${commandName}]`, error);
            message.reply('Erro ao executar este comando.').catch(() => {});
        }
    }
};
