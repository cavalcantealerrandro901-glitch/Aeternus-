const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');

module.exports = {
    name: 'ranking',
    aliases: ['top', 'lb'],
    description: 'Ranking do servidor',
    data: new SlashCommandBuilder().setName('ranking-servidor').setDescription('Ranking do servidor'),

    async execute(message) {
        const members = await message.guild.members.fetch().catch(() => null);
        if (!members) return message.reply('❌ Não consegui listar membros.');
        const rows = [...members.values()]
            .filter((m) => !m.user.bot)
            .map((m) => ({ id: m.id, tag: m.user.username, bal: eter.get(m.id) }))
            .sort((a, b) => b.bal - a.bal)
            .slice(0, 10);
        const lines = rows.map(
            (r, i) => `**${i + 1}.** ${r.tag} — ✨ **${Number(r.bal).toLocaleString('pt-BR')}**`
        );
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(`Ranking · ${message.guild.name}`)
                    .setDescription(lines.join('\n') || 'Vazio')
            ]
        });
    },

    async executeSlash(i) {
        const members = await i.guild.members.fetch().catch(() => null);
        if (!members) return i.reply({ content: '❌ Não consegui listar membros.', ephemeral: true });
        const rows = [...members.values()]
            .filter((m) => !m.user.bot)
            .map((m) => ({ id: m.id, tag: m.user.username, bal: eter.get(m.id) }))
            .sort((a, b) => b.bal - a.bal)
            .slice(0, 10);
        const lines = rows.map(
            (r, idx) => `**${idx + 1}.** ${r.tag} — ✨ **${Number(r.bal).toLocaleString('pt-BR')}**`
        );
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle(`Ranking · ${i.guild.name}`)
                    .setDescription(lines.join('\n') || 'Vazio')
            ]
        });
    }
};
