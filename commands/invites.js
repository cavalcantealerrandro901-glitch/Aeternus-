const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const invitesStore = require('../utils/invites');

module.exports = {
    name: 'invites',
    aliases: ['convites', 'invite', 'inv'],
    description: 'Convites',
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Convites')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false))
        .addStringOption((o) =>
            o
                .setName('modo')
                .setDescription('Ver ranking')
                .setRequired(false)
                .addChoices({ name: 'Ranking', value: 'top' })
        ),

    async execute(message, args) {
        const sub = (args[0] || '').toLowerCase();
        if (['top', 'ranking', 'rank', 'lb'].includes(sub)) {
            return top(message.guild.id, message.client, (p) => message.reply(p));
        }
        const target = message.mentions.users.first() || message.author;
        return stats(message.guild.id, target, (p) => message.reply(p));
    },
    async executeSlash(i) {
        if (i.options.getString('modo') === 'top') {
            return top(i.guild.id, i.client, (p) => i.reply(p));
        }
        const target = i.options.getUser('usuario') || i.user;
        return stats(i.guild.id, target, (p) => i.reply(p));
    }
};

async function top(guildId, client, reply) {
    const board = invitesStore.leaderboard(guildId, 10);
    if (!board.length) return reply('Sem dados de convites.');
    const lines = [];
    for (let i = 0; i < board.length; i++) {
        const row = board[i];
        const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
        const u = await client.users.fetch(row.userId).catch(() => null);
        lines.push(
            `${medal} **${u?.username || row.userId}** — ${row.total} (${row.active} ativos)`
        );
    }
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x38bdf8)
                .setTitle('Convites')
                .setDescription(lines.join('\n'))
        ]
    });
}

async function stats(guildId, target, reply) {
    const s = invitesStore.getStats(guildId, target.id);
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x8b5cf6)
                .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
                .setTitle('Convites')
                .setDescription(`**Total:** ${s.total}\n**Ativos:** ${s.active}\n**Saíram:** ${s.left}`)
        ]
    });
}
