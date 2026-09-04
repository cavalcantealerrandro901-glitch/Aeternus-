const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');

module.exports = {
    name: 'transacoes',
    aliases: ['extrato', 'history', 'tx'],
    description: 'Extrato de éter',
    data: new SlashCommandBuilder().setName('transacoes').setDescription('Extrato de éter'),

    async execute(message) {
        await show(message.author, (p) => message.reply(p));
    },
    async executeSlash(i) {
        await show(i.user, (p) => i.reply(p));
    }
};

async function show(user, reply) {
    const hist = eter.history?.(user.id) || eter.getHistory?.(user.id) || [];
    if (!hist.length) {
        return reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('Extrato')
                    .setDescription('Sem movimentações recentes.')
            ]
        });
    }
    const lines = hist
        .slice(-12)
        .reverse()
        .map((h) => {
            const sign = (h.amount || 0) >= 0 ? '+' : '';
            const when = h.at ? `<t:${Math.floor(h.at / 1000)}:R>` : '';
            return `✨ **${sign}${Number(h.amount || 0).toLocaleString('pt-BR')}** · ${h.reason || '—'} ${when}`;
        });
    return reply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xa78bfa)
                .setTitle('Extrato')
                .setDescription(lines.join('\n'))
        ]
    });
}
