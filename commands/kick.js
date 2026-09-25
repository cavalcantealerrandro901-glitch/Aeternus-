const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

function resolveMember(message, args) {
    const m = message.mentions.members.first();
    if (m) return m;
    const id = String(args[0] || '').replace(/\D/g, '');
    if (id) return message.guild.members.cache.get(id) || null;
    return null;
}

module.exports = {
    name: 'kick',
    aliases: ['expulsar'],
    description: 'Expulsar membro',
    data: new SlashCommandBuilder()
        .setName('expulsar-membro')
        .setDescription('Expulsar membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = resolveMember(message, args);
        if (!member) return message.reply('❌ Mencione o membro ou informe o ID.');
        if (member.id === message.author.id) return message.reply('❌ Você não pode se expulsar.');
        if (!member.kickable) return message.reply('❌ Não consigo expulsar este membro (cargo mais alto).');
        const reason = args.slice(1).join(' ').trim() || 'Sem motivo';
        try {
            await member.kick(`${reason} · por ${message.author.tag}`);
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xf97316)
                        .setTitle('Kick')
                        .setDescription(`**${member.user.tag}**\n${reason}`)
                        .setFooter({ text: `Mod: ${message.author.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await message.reply('❌ Não consegui expulsar.');
        }
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario', true);
        const reason = i.options.getString('motivo') || 'Sem motivo';
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        if (!member.kickable) {
            return i.reply({ content: '❌ Não consigo expulsar este membro (cargo mais alto).', ephemeral: true });
        }
        try {
            await member.kick(`${reason} · por ${i.user.tag}`);
            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xf97316)
                        .setTitle('Kick')
                        .setDescription(`**${user.tag}**\n${reason}`)
                        .setFooter({ text: `Mod: ${i.user.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await i.reply({ content: '❌ Não consegui expulsar.', ephemeral: true });
        }
    }
};
