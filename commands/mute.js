const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'mute',
    aliases: ['silenciar', 'timeout'],
    description: 'Silenciar membro',
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
                .setMaxValue(40320)
        )
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ Sem permissão.');
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Mencione o membro.');
        const mins = parseInt(args.find((a) => /^\d+$/.test(a)) || '0', 10);
        if (!mins) return message.reply('❌ Informe os minutos.');
        const reason = args.filter((a) => !a.startsWith('<@') && !/^\d+$/.test(a)).join(' ') || 'Sem motivo';
        try {
            await member.timeout(mins * 60 * 1000, reason);
            await message.reply(`🔇 ${member} silenciado por **${mins}** min.`);
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
        try {
            await member.timeout(mins * 60 * 1000, reason);
            await i.reply(`🔇 ${member} silenciado por **${mins}** min.`);
        } catch {
            await i.reply({ content: '❌ Não consegui silenciar.', ephemeral: true });
        }
    }
};
