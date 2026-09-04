const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const store = require('../utils/store');

module.exports = {
    name: 'warns',
    aliases: ['advertencias', 'warnings'],
    description: 'Ver advertências',
    data: new SlashCommandBuilder()
        .setName('advertencias')
        .setDescription('Ver advertencias')
        .addUserOption((o) => o.setName('usuario').setDescription('Membro').setRequired(false)),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const data = store.load(`warns_${message.guild.id}`, {});
        const list = data[user.id] || [];
        if (!list.length) return message.reply(`**${user.tag}** sem advertências.`);
        const lines = list
            .slice(-10)
            .map((w, i) => `${i + 1}. ${w.reason || '—'} · <t:${Math.floor((w.at || 0) / 1000)}:R>`);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle(`Advertências · ${user.tag}`)
                    .setDescription(lines.join('\n'))
            ]
        });
    },

    async executeSlash(i) {
        const user = i.options.getUser('usuario') || i.user;
        const data = store.load(`warns_${i.guild.id}`, {});
        const list = data[user.id] || [];
        if (!list.length) return i.reply({ content: `**${user.tag}** sem advertências.`, ephemeral: true });
        const lines = list
            .slice(-10)
            .map((w, idx) => `${idx + 1}. ${w.reason || '—'} · <t:${Math.floor((w.at || 0) / 1000)}:R>`);
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle(`Advertências · ${user.tag}`)
                    .setDescription(lines.join('\n'))
            ]
        });
    }
};
