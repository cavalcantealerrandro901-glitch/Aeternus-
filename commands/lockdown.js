const { PermissionFlagsBits, SlashCommandBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: 'lockdown',
    description: 'Trancar todos os canais de texto',
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Trancar/destrancar o servidor')
        .addStringOption((o) =>
            o
                .setName('acao')
                .setDescription('lock ou unlock')
                .setRequired(true)
                .addChoices(
                    { name: 'Trancar', value: 'lock' },
                    { name: 'Destrancar', value: 'unlock' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Sem permissão.');
        }
        const action = (args[0] || 'lock').toLowerCase();
        await doLockdown(message.guild, action === 'unlock', (p) => message.reply(p));
    },
    async executeSlash(i) {
        const unlock = i.options.getString('acao') === 'unlock';
        await doLockdown(i.guild, unlock, (p) => i.reply(p));
    }
};

async function doLockdown(guild, unlock, reply) {
    let n = 0;
    for (const ch of guild.channels.cache.values()) {
        if (ch.type !== ChannelType.GuildText && ch.type !== ChannelType.GuildAnnouncement) continue;
        try {
            await ch.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: unlock ? null : false
            });
            n++;
        } catch (_) {}
    }
    return reply(unlock ? `🔓 **${n}** canais destrancados.` : `🔒 **${n}** canais trancados.`);
}
