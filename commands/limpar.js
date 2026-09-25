const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'limpar',
    aliases: ['clear', 'purge'],
    description: 'Apagar mensagens do canal',
    data: new SlashCommandBuilder()
        .setName('limpar-chat')
        .setDescription('Limpar mensagens')
        .addIntegerOption((o) =>
            o
                .setName('quantidade')
                .setDescription('1 a 100')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ Sem permissão.');
        }
        const n = Math.min(100, Math.max(1, parseInt(args[0], 10) || 0));
        if (!n) return message.reply('❌ Uso: `O.limpar <1-100>`');
        await message.delete().catch(() => {});
        const deleted = await message.channel.bulkDelete(n, true).catch(() => null);
        const m = await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x38bdf8)
                    .setTitle('Limpar')
                    .setDescription(`🧹 **${deleted?.size || 0}** mensagens apagadas.`)
                    .setFooter({ text: `Mod: ${message.author.tag}` })
                    .setTimestamp()
            ]
        });
        setTimeout(() => m.delete().catch(() => {}), 4000);
    },

    async executeSlash(i) {
        const n = i.options.getInteger('quantidade', true);
        await i.deferReply({ ephemeral: true });
        const deleted = await i.channel.bulkDelete(n, true).catch(() => null);
        await i.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x38bdf8)
                    .setTitle('Limpar')
                    .setDescription(`🧹 **${deleted?.size || 0}** mensagens apagadas.`)
                    .setFooter({ text: `Mod: ${i.user.tag}` })
                    .setTimestamp()
            ]
        });
    }
};
