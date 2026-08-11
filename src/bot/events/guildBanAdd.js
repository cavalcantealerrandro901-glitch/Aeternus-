const { Events } = require('discord.js');
const { sendLog, baseEmbed } = require('../utils/logger');

module.exports = {
    name: Events.GuildBanAdd,
    async execute(ban) {
        const embed = baseEmbed()
            .setColor(0xef4444)
            .setTitle('🔨 Membro Banido')
            .setDescription(`**Usuário:** ${ban.user.tag} (\`${ban.user.id}\`)`)
            .setThumbnail(ban.user.displayAvatarURL());

        // Tenta pegar o motivo e o moderador via Audit Log
        try {
            const fetched = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 }); // 22 = MEMBER_BAN_ADD
            const log = fetched.entries.first();
            if (log && log.target.id === ban.user.id) {
                embed.addFields(
                    { name: 'Moderador', value: `${log.executor.tag}`, inline: true },
                    { name: 'Motivo', value: log.reason || 'Nenhum motivo informado', inline: true }
                );
            }
        } catch {}

        await sendLog(ban.guild, 'ban', embed);
    }
};
