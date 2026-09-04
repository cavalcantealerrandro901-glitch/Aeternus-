const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const store = require('../utils/store');

module.exports = {
    name: 'warns',
    aliases: ['advertencias', 'warnings'],
    description: 'Ver advertências',
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Ver advertências')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(false)),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await replyWarns(message.guild.id, user, (p) => message.reply(p));
    },
    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        await replyWarns(i.guild.id, user, (p) => i.reply(p));
    }
};

async function replyWarns(guildId, user, reply) {
    const list = store.get(`warns:${guildId}:${user.id}`) || [];
    if (!list.length) {
        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x38bdf8)
                    .setTitle('Warns')
                    .setDescription(`**${user.username}** sem advertências.`)
            ]
        });
    }
    const lines = list.slice(-10).map((w, i) => {
        const when = w.at ? `<t:${Math.floor(w.at / 1000)}:R>` : '—';
        return `**${i + 1}.** ${w.reason || 'Sem motivo'} · ${when}`;
    });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xfbbf24)
                .setTitle(`Warns · ${user.username}`)
                .setDescription(lines.join('\n'))
                .setFooter({ text: `Total: ${list.length}` })
        ]
    });
}
