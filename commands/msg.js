const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const msgStats = require('../utils/msgStats');

module.exports = {
    name: 'msg',
    aliases: ['mensagens', 'messages', 'msgs'],
    description: 'Contagem de mensagens',
    data: new SlashCommandBuilder()
        .setName('msg')
        .setDescription('Contagem de mensagens')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),

    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        await show(message.guild.id, target, (p) => message.reply(p));
    },
    async executeSlash(i) {
        const target = i.options.getUser('usuario') || i.user;
        await show(i.guild.id, target, (p) => i.reply(p));
    }
};

async function show(guildId, target, reply) {
    const s = msgStats.getUser(guildId, target.id);
    const pos = (period) => {
        const board = msgStats.leaderboard(guildId, period, 50);
        const i = board.findIndex((r) => r.userId === target.id);
        return i === -1 ? '—' : `#${i + 1}`;
    };
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x38bdf8)
                .setAuthor({
                    name: target.username,
                    iconURL: target.displayAvatarURL({ size: 128 })
                })
                .setTitle('Mensagens')
                .addFields(
                    { name: 'Hoje', value: `**${s.today || 0}** (${pos('today')})`, inline: true },
                    { name: 'Semana', value: `**${s.week || 0}** (${pos('week')})`, inline: true },
                    { name: 'Mês', value: `**${s.month || 0}** (${pos('month')})`, inline: true },
                    { name: 'Total', value: `**${s.total || 0}**`, inline: true }
                )
        ]
    });
}
