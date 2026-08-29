const { EmbedBuilder } = require('discord.js');
const invitesStore = require('../utils/invites');

module.exports = {
    name: 'invites',
    aliases: ['convites', 'invite', 'inv'],
    async execute(message, args) {
        if (!message.guild) return;
        const sub = (args[0] || '').toLowerCase();
        if (['top', 'ranking', 'rank', 'lb'].includes(sub)) {
            const board = invitesStore.leaderboard(message.guild.id, 10);
            if (!board.length) return message.reply('Sem dados de convites.');
            const lines = [];
            for (let i = 0; i < board.length; i++) {
                const row = board[i];
                const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
                const u = await message.client.users.fetch(row.userId).catch(() => null);
                lines.push(`${medal} **${u?.username || row.userId}** — ${row.total} (${row.active} ativos)`);
            }
            return message.reply({ embeds: [new EmbedBuilder().setColor(0x38bdf8).setTitle('📩 Ranking de convites').setDescription(lines.join('\n'))] });
        }
        let target = message.mentions.users.first() || message.author;
        const stats = invitesStore.getStats(message.guild.id, target.id);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
                    .setTitle('📩 Convites')
                    .setDescription(`**Total:** ${stats.total}\n**Ativos:** ${stats.active}\n**Saíram:** ${stats.left}`)
            ]
        });
    }
};
