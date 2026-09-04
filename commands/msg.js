const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const msgCount = require('../utils/msgCount');

module.exports = {
    name: 'msg',
    aliases: ['mensagens', 'messages'],
    description: 'Contagem de mensagens',
    data: new SlashCommandBuilder()
        .setName('mensagens')
        .setDescription('Contagem de mensagens')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const s = msgCount.get?.(user.id, message.guild?.id) || msgCount.stats?.(user.id) || {};
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(`Mensagens · ${user.username}`)
                    .setDescription(
                        [
                            `Hoje: **${s.today ?? s.day ?? 0}**`,
                            `Semana: **${s.week ?? 0}**`,
                            `Mês: **${s.month ?? 0}**`,
                            `Total: **${s.total ?? 0}**`
                        ].join('\n')
                    )
            ]
        });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        const s = msgCount.get?.(user.id, i.guild?.id) || msgCount.stats?.(user.id) || {};
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(`Mensagens · ${user.username}`)
                    .setDescription(
                        [
                            `Hoje: **${s.today ?? s.day ?? 0}**`,
                            `Semana: **${s.week ?? 0}**`,
                            `Mês: **${s.month ?? 0}**`,
                            `Total: **${s.total ?? 0}**`
                        ].join('\n')
                    )
            ]
        });
    }
};
