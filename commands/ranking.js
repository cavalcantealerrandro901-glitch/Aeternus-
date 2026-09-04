const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const msgStats = require('../utils/msgStats');

module.exports = {
    name: 'ranking',
    aliases: ['rankmsg', 'topmsg'],
    description: 'Ranking de mensagens',
    data: new SlashCommandBuilder()
        .setName('ranking')
        .setDescription('Ranking de mensagens')
        .addStringOption((o) =>
            o
                .setName('periodo')
                .setDescription('Período')
                .setRequired(false)
                .addChoices(
                    { name: 'Hoje', value: 'today' },
                    { name: 'Semana', value: 'week' },
                    { name: 'Mês', value: 'month' },
                    { name: 'Total', value: 'total' }
                )
        ),

    async execute(message, args) {
        const map = {
            hoje: 'today',
            semana: 'week',
            week: 'week',
            mes: 'month',
            mês: 'month',
            month: 'month',
            total: 'total',
            all: 'total'
        };
        const period = map[(args[0] || 'hoje').toLowerCase()] || 'today';
        await show(message.guild.id, period, message.client, (p) => message.reply(p));
    },
    async executeSlash(i) {
        const period = i.options.getString('periodo') || 'today';
        await show(i.guild.id, period, i.client, (p) => i.reply(p));
    }
};

async function show(guildId, period, client, reply) {
    const labels = { today: 'Hoje', week: 'Semana', month: 'Mês', total: 'Total' };
    const board = msgStats.leaderboard(guildId, period, 10);
    if (!board.length) return reply('Sem dados.');
    const lines = [];
    for (let i = 0; i < board.length; i++) {
        const row = board[i];
        const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
        const u = await client.users.fetch(row.userId).catch(() => null);
        lines.push(`${medal} **${u?.username || row.userId}** — **${row.count}**`);
    }
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x38bdf8)
                .setTitle(`Ranking · ${labels[period] || period}`)
                .setDescription(lines.join('\n'))
        ]
    });
}
