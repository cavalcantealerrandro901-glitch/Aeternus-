const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

function resolveMember(message, args) {
    const m = message.mentions.members.first();
    if (m) return m;
    const id = String(args[0] || '').replace(/\D/g, '');
    if (id) return message.guild.members.cache.get(id) || null;
    return null;
}

module.exports = {
    name: 'mute',
    aliases: ['timeout', 'silenciar'],
    description: 'Silenciar membro (timeout)',
    data: new SlashCommandBuilder()
        .setName('silenciar')
        .setDescription('Silenciar membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(true))
        .addIntegerOption((o) =>
            o
                .setName('minutos')
                .setDescription('Duração em minutos')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10080)
        )
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = resolveMember(message, args);
        if (!member) return message.reply('❌ Mencione o membro ou informe o ID.');
        if (!member.moderatable) return message.reply('❌ Não consigo silenciar este membro (cargo mais alto).');
        const mins = parseInt(args[1], 10);
        if (!mins || mins < 1) return message.reply('❌ Uso: `O.mute @user <minutos> [motivo]`');
        const reason = args.slice(2).join(' ').trim() || 'Sem motivo';
        try {
            await member.timeout(mins * 60 * 1000, `${reason} · por ${message.author.tag}`);
            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x6366f1)
                        .setTitle('Mute')
                        .setDescription(`**${member.user.tag}**\n⏱ **${mins}** min\n${reason}`)
                        .setFooter({ text: `Mod: ${message.author.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await message.reply('❌ Não consegui silenciar.');
        }
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario', true);
        const mins = i.options.getInteger('minutos', true);
        const reason = i.options.getString('motivo') || 'Sem motivo';
        const member = await i.guild.members.fetch(user.id).catch(() => null);
        if (!member) return i.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
        if (!member.moderatable) {
            return i.reply({ content: '❌ Não consigo silenciar este membro (cargo mais alto).', ephemeral: true });
        }
        try {
            await member.timeout(mins * 60 * 1000, `${reason} · por ${i.user.tag}`);
            await i.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x6366f1)
                        .setTitle('Mute')
                        .setDescription(`**${user.tag}**\n⏱ **${mins}** min\n${reason}`)
                        .setFooter({ text: `Mod: ${i.user.tag}` })
                        .setTimestamp()
                ]
            });
        } catch {
            await i.reply({ content: '❌ Não consegui silenciar.', ephemeral: true });
        }
    }
};
