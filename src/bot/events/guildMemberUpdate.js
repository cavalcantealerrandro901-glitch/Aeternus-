const { Events } = require('discord.js');
const { sendLog, baseEmbed } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
        const newTimeout = newMember.communicationDisabledUntilTimestamp;

        // Timeout adicionado
        if (!oldTimeout && newTimeout) {
            const embed = baseEmbed()
                .setColor(0xf59e0b)
                .setTitle('🔇 Timeout Aplicado')
                .setDescription(`**Usuário:** ${newMember.user.tag} (\`${newMember.user.id}\`)`)
                .addFields({ name: 'Expira em', value: `<t:${Math.floor(newTimeout / 1000)}:R>` })
                .setThumbnail(newMember.user.displayAvatarURL());

            try {
                const fetched = await newMember.guild.fetchAuditLogs({ type: 24, limit: 1 }); // MEMBER_UPDATE
                const log = fetched.entries.first();
                if (log && log.target.id === newMember.id) {
                    embed.addFields(
                        { name: 'Moderador', value: `${log.executor.tag}`, inline: true },
                        { name: 'Motivo', value: log.reason || 'Nenhum motivo informado', inline: true }
                    );
                }
            } catch {}

            await sendLog(newMember.guild, 'timeout', embed);
        }

        // Timeout removido
        if (oldTimeout && !newTimeout) {
            const embed = baseEmbed()
                .setColor(0x22c55e)
                .setTitle('🔊 Timeout Removido')
                .setDescription(`**Usuário:** ${newMember.user.tag} (\`${newMember.user.id}\`)`)
                .setThumbnail(newMember.user.displayAvatarURL());

            await sendLog(newMember.guild, 'timeout', embed);
        }
    }
};
