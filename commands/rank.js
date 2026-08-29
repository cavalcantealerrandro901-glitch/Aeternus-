const { EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');

module.exports = {
    name: 'rank',
    aliases: ['top', 'leaderboard', 'lb'],
    async execute(message, args) {
        const type = (args[0] || 'flocos').toLowerCase();
        const data = type.startsWith('cristal') ? cristais.all() : flocos.all();
        const emoji = type.startsWith('cristal') ? '💠' : '❄️';
        const top = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (!top.length) return message.reply('Ranking vazio.');
        const lines = [];
        for (let i = 0; i < top.length; i++) {
            const [id, v] = top[i];
            const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
            const u = await message.client.users.fetch(id).catch(() => null);
            lines.push(`${medal} ${u ? u.username : id} — ${emoji} **${Number(v).toLocaleString('pt-BR')}**`);
        }
        await message.reply({ embeds: [new EmbedBuilder().setColor(0xfbbf24).setTitle(`🏆 Ranking ${emoji}`).setDescription(lines.join('\n'))] });
    }
};
