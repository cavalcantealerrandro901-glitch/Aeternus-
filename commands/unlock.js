const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'unlock',
    aliases: ['destrancar'],
    description: 'Destrancar o canal atual',
    data: new SlashCommandBuilder()
        .setName('destrancar-canal')
        .setDescription('Destrancar o canal')
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ Sem permissão.');
        }
        const reason = args.join(' ').trim() || 'Sem motivo';
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: null
            });
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22c55e)
                        .setTitle('Unlock')
                        .setDescription(`Canal **destrancado**.\n${reason}`)
                        .setFooter({ text: `Mod: ${message.author.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await message.reply('❌ Não consegui destrancar.');
        }
    },

    async executeSlash(i) {
        const reason = i.options.getString('motivo') || 'Sem motivo';
        try {
            await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x22c55e)
                        .setTitle('Unlock')
                        .setDescription(`Canal **destrancado**.\n${reason}`)
                        .setFooter({ text: `Mod: ${i.user.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await i.reply({ content: '❌ Não consegui destrancar.', ephemeral: true });
        }
    }
};
