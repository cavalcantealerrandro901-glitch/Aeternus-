const { EmbedBuilder } = require('discord.js');
const msgStats = require('../utils/msgStats');

module.exports = {
    name: 'ranking',
    aliases: ['rankmsg', 'topmsg', 'topmensagens'],
    description: 'Ranking de mensagens (hoje / semana / mês)',
    async execute(message, args) {
        const periodArg = (args[0] || 'hoje').toLowerCase();
        let period = 'today';
        let label = 'hoje';

        // se o primeiro arg for menção, período = hoje
        const mentionFirst = message.mentions.users.first();
        if (mentionFirst && !['hoje', 'semana', 'week', '7d', 'mes', 'mês', 'month', '30d', 'total', 'all', 'semanal', 'mensal'].includes(periodArg)) {
            period = 'today';
            label = 'hoje';
        } else if (['semana', 'week', '7d', 'semanal'].includes(periodArg)) {
            period = 'week';
            label = 'últimos 7 dias';
        } else if (['mes', 'mês', 'month', '30d', 'mensal'].includes(periodArg)) {
            period = 'month';
            label = 'últimos 30 dias';
        } else if (['total', 'all'].includes(periodArg)) {
            period = 'total';
            label = 'total';
        }

        const target = mentionFirst || message.author;
        const mine = msgStats.getUser(message.guild.id, target.id);
        const board = msgStats.leaderboard(message.guild.id, period, 15);

        const medals = ['🥇', '🥈', '🥉'];
        const lines = [];
        for (let i = 0; i < board.length; i++) {
            const row = board[i];
            const med = medals[i] || `\`${i + 1}.\``;
            lines.push(`${med} <@${row.userId}> — **${row.count.toLocaleString('pt-BR')}** msgs`);
        }

        const embed = new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle(`📊 Ranking de mensagens · ${label}`)
            .setDescription(lines.length ? lines.join('\n') : '_Ainda sem mensagens registradas._')
            .addFields({
                name: target.id === message.author.id ? 'Seu resumo' : `Resumo de ${target.username}`,
                value: [
                    `📅 Hoje: **${mine.today}**`,
                    `📆 Semana: **${mine.week}**`,
                    `🗓️ Mês: **${mine.month}**`,
                    `♾️ Total: **${mine.total}**`
                ].join('\n')
            })
            .setFooter({ text: 'O.ranking [hoje|semana|mes|total] · O.msg [@user]' });

        await message.reply({ embeds: [embed] });
    }
};
