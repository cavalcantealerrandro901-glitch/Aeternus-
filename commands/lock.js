const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'lock',
    aliases: ['trancar'],
    description: 'Trancar o canal atual',
    data: new SlashCommandBuilder()
        .setName('trancar-canal')
        .setDescription('Trancar o canal')
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ Sem permissão.');
        }
        const reason = args.join(' ').trim() || 'Sem motivo';
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            });
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('Lock')
                        .setDescription(`Canal **trancado**.\n${reason}`)
                        .setFooter({ text: `Mod: ${message.author.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await message.reply('❌ Não consegui trancar.');
        }
    },

    async executeSlash(i) {
        const reason = i.options.getString('motivo') || 'Sem motivo';
        try {
            await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xef4444)
                        .setTitle('Lock')
                        .setDescription(`Canal **trancado**.\n${reason}`)
                        .setFooter({ text: `Mod: ${i.user.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await i.reply({ content: '❌ Não consegui trancar.', ephemeral: true });
        }
    }
};
