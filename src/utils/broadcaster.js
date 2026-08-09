const db = require('../database/db');
const { sendMessage } = require('./messageSender');

/**
 * Transmite um anúncio/atualização para todos os canais configurados nos servidores
 */
async function broadcastUpdate(client, { title, description, version, fields = [] }) {
    let successCount = 0;
    let failCount = 0;

    const guilds = Array.from(client.guilds.cache.values());

    for (const guild of guilds) {
        const guildConfig = db.getGuildConfig(guild.id);
        const updatesConfig = guildConfig.updates;

        if (!updatesConfig || !updatesConfig.updatesChannel) continue;

        const channel = guild.channels.cache.get(updatesConfig.updatesChannel);
        if (!channel) continue;

        try {
            // Define o tipo de menção configurado pelo servidor
            let mention = '';
            if (updatesConfig.mentionType === 'here') mention = '@here';
            if (updatesConfig.mentionType === 'everyone') mention = '@everyone';
            if (updatesConfig.mentionType === 'role' && updatesConfig.mentionRoleId) {
                mention = `<@&${updatesConfig.mentionRoleId}>`;
            }

            const embedPayload = {
                title: `🚀 ${title}`,
                description: description,
                color: '#38bdf8',
                fields: [
                    ...fields,
                    { name: '📌 Versão', value: `\`${version}\``, inline: true }
                ],
                thumbnail: client.user.displayAvatarURL()
            };

            await sendMessage(channel, {
                mention: mention,
                embed: embedPayload,
                guild: guild
            });

            successCount++;

            // Pausa de 250ms entre cada envio para evitar Rate Limit da API
            await new Promise(resolve => setTimeout(resolve, 250));

        } catch (err) {
            console.error(`❌ Falha ao enviar transmissão para o servidor ${guild.name} (${guild.id}):`, err.message);
            failCount++;
        }
    }

    return { successCount, failCount };
}

module.exports = { broadcastUpdate };
