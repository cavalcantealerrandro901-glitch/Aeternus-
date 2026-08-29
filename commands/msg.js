const { EmbedBuilder } = require('discord.js');
const msgStats = require('../utils/msgStats');

module.exports = {
    name: 'msg',
    aliases: ['mensagens', 'mensagem', 'messages', 'msgs'],
    description: 'Mostra quantas mensagens o usuário enviou (hoje, semana, mês)',
    async execute(message, args) {
        const target =
            message.mentions.users.first() ||
            (args[0] && /^\d{15,20}$/.test(args[0])
                ? await message.client.users.fetch(args[0]).catch(() => null)
                : null) ||
            message.author;

        if (!target) return message.reply('❌ Usuário não encontrado.');

        const s = msgStats.getUser(message.guild.id, target.id);
        const boardToday = msgStats.leaderboard(message.guild.id, 'today', 50);
        const boardWeek = msgStats.leaderboard(message.guild.id, 'week', 50);
        const boardMonth = msgStats.leaderboard(message.guild.id, 'month', 50);

        const pos = (board) => {
            const i = board.findIndex((r) => r.userId === target.id);
            return i === -1 ? '—' : `#${i + 1}`;
        };

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setAuthor({
                name: target.username,
                iconURL: target.displayAvatarURL({ size: 128 })
            })
            .setTitle('💬 Mensagens')
            .setDescription(
                [
                    `📅 **Hoje:** ${s.today.toLocaleString('pt-BR')} msgs · pos. ${pos(boardToday)}`,
                    `📆 **Semana (7d):** ${s.week.toLocaleString('pt-BR')} msgs · pos. ${pos(boardWeek)}`,
                    `🗓️ **Mês (30d):** ${s.month.toLocaleString('pt-BR')} msgs · pos. ${pos(boardMonth)}`,
                    `♾️ **Total:** ${s.total.toLocaleString('pt-BR')} msgs`
                ].join('\n')
            )
            .setFooter({ text: 'O.msg [@user] · ranking: O.ranking' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
