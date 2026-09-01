const { EmbedBuilder } = require('discord.js');
const eter = require('../utils/eter');

module.exports = {
    name: 'rank',
    aliases: ['top', 'leaderboard', 'lb'],
    description: 'Ranking de Éter',
    async execute(message, args) {
        const type = (args[0] || 'eter').toLowerCase();
        // XP ranking se pedido
        if (type === 'xp' || type === 'nivel' || type === 'level') {
            const xp = require('../utils/xp');
            const data = xp.all ? xp.all() : {};
            const entries = Object.entries(data)
                .map(([id, v]) => [id, Number(v?.xp || v || 0)])
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            if (!entries.length) return message.reply('Ranking de XP vazio.');
            const lines = [];
            for (let i = 0; i < entries.length; i++) {
                const [id, v] = entries[i];
                const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
                const u = await message.client.users.fetch(id).catch(() => null);
                lines.push(`${medal} ${u ? u.username : id} — ⭐ **${Number(v).toLocaleString('pt-BR')}** XP`);
            }
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xa78bfa)
                        .setTitle('🏆 Ranking XP')
                        .setDescription(lines.join('\n'))
                        .setFooter({ text: 'O.rank eter · O.rank xp' })
                ]
            });
        }

        const data = eter.all();
        const top = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (!top.length) return message.reply('Ranking vazio.');
        const lines = [];
        for (let i = 0; i < top.length; i++) {
            const [id, v] = top[i];
            const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
            const u = await message.client.users.fetch(id).catch(() => null);
            lines.push(`${medal} ${u ? u.username : id} — ✨ **${Number(v).toLocaleString('pt-BR')}** éter`);
        }
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('🏆 Ranking Éter ✨')
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: 'O.rank · O.rank xp' })
            ]
        });
    }
};
