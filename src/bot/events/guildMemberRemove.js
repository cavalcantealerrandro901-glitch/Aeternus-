const { Events } = require('discord.js');
const { sendLog, baseEmbed } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        // Verifica se foi kick
        let wasKicked = false;
        let executor = null;
        let reason = null;

        try {
            const fetched = await member.guild.fetchAuditLogs({ type: 20, limit: 1 }); // MEMBER_KICK
            const log = fetched.entries.first();
            if (log && log.target.id === member.id && Date.now() - log.createdTimestamp < 5000) {
                wasKicked = true;
                executor = log.executor;
                reason = log.reason;
            }
        } catch {}

        if (wasKicked) {
            const embed = baseEmbed()
                .setColor(0xf97316)
                .setTitle('👢 Membro Expulso')
                .setDescription(`**Usuário:** ${member.user.tag} (\`${member.user.id}\`)`)
                .addFields(
                    { name: 'Moderador', value: executor ? executor.tag : 'Desconhecido', inline: true },
                    { name: 'Motivo', value: reason || 'Nenhum motivo informado', inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL());

            await sendLog(member.guild, 'kick', embed);
        } else {
            const embed = baseEmbed()
                .setColor(0x64748b)
                .setTitle('📤 Membro Saiu')
                .setDescription(`**Usuário:** ${member.user.tag} (\`${member.user.id}\`)`)
                .setThumbnail(member.user.displayAvatarURL());

            await sendLog(member.guild, 'member', embed);
        }
    }
};
