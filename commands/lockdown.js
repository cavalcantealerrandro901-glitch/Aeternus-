const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'lockdown',
    aliases: ['emergencia'],
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
            return message.reply('❌ Admin apenas.');
        const unlock = ['off', 'desativar', 'end'].includes((args[0] || '').toLowerCase());
        let n = 0;
        for (const ch of message.guild.channels.cache.values()) {
            if (!ch.isTextBased() || ch.isThread()) continue;
            try {
                await ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: unlock ? null : false });
                n++;
            } catch (_) {}
        }
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(unlock ? 0x34d399 : 0xef4444)
                    .setTitle(unlock ? '🔓 Lockdown encerrado' : '🔒 Lockdown ativo')
                    .setDescription(`${n} canais atualizados.`)
            ]
        });
    }
};
