const { Events } = require('discord.js');
const { sendLog, baseEmbed } = require('../utils/logger');

module.exports = {
    name: Events.GuildBanRemove,
    async execute(ban) {
        const embed = baseEmbed()
            .setColor(0x22c55e)
            .setTitle('🔓 Membro Desbanido')
            .setDescription(`**Usuário:** ${ban.user.tag} (\`${ban.user.id}\`)`)
            .setThumbnail(ban.user.displayAvatarURL());

        try {
            const fetched = await ban.guild.fetchAuditLogs({ type: 23, limit: 1 }); // MEMBER_BAN_REMOVE
            const log = fetched.entries.first();
            if (log && log.target.id === ban.user.id) {
                embed.addFields({ name: 'Moderador', value: `${log.executor.tag}`, inline: true });
            }
        } catch {}

        await sendLog(ban.guild, 'ban', embed);
    }
};
