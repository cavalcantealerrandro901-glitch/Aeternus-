const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

async function sendLog(guild, type, embed) {
    try {
        const config = db.getGuildConfig(guild.id);
        const logs = config.logs || {};

        let enabled = false;
        let channelId = null;

        if (logs[type] && typeof logs[type] === 'object') {
            enabled = !!logs[type].enabled;
            channelId = logs[type].channel || null;
        } else if (logs[type] === true || logs[type] === undefined) {
            // Formato antigo
            enabled = logs[type] !== false;
            channelId = logs.channel || null;
        }

        // Compatibilidade: messageEdit usa canal de message se não configurado
        if (type === 'messageEdit' && !channelId && logs.message) {
            if (typeof logs.message === 'object') {
                enabled = enabled || !!logs.message.enabled;
                channelId = logs.message.channel || null;
            }
        }

        if (!enabled || !channelId) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return;

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Erro ao enviar log:', err.message);
    }
}

function baseEmbed() {
    return new EmbedBuilder()
        .setTimestamp()
        .setFooter({ text: 'Aeternus Logs' });
}

module.exports = { sendLog, baseEmbed };
