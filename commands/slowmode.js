const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'slowmode',
    aliases: ['slow', 'modolento'],
    description: 'Modo lento do canal',
    data: new SlashCommandBuilder()
        .setName('modo-lento')
        .setDescription('Modo lento')
        .addIntegerOption((o) =>
            o
                .setName('segundos')
                .setDescription('0 a 21600')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ Sem permissão.');
        }
        const sec = parseInt(args[0], 10);
        if (Number.isNaN(sec) || sec < 0 || sec > 21600) {
            return message.reply('❌ Use 0–21600 segundos.');
        }
        try {
            await message.channel.setRateLimitPerUser(sec);
            await message.reply(sec === 0 ? '⚡ Slowmode desativado.' : `🐢 Modo lento: **${sec}s**`);
        } catch {
            await message.reply('❌ Não consegui alterar.');
        }
    },

    async executeSlash(i) {
        const sec = i.options.getInteger('segundos', true);
        try {
            await i.channel.setRateLimitPerUser(sec);
            await i.reply(sec === 0 ? '⚡ Slowmode desativado.' : `🐢 Modo lento: **${sec}s**`);
        } catch {
            await i.reply({ content: '❌ Não consegui alterar.', ephemeral: true });
        }
    }
};
