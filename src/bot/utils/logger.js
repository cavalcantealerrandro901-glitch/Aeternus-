const { EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

async function sendLog(guild, type, embed) {
    try {
        const config = db.getGuildConfig(guild.id);
        if (!config.logs || !config.logs.channel) return;
        if (config.logs[type] === false) return;

        const channel = guild.channels.cache.get(config.logs.channel);
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
