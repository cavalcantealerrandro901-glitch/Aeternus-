const { EmbedBuilder } = require('discord.js');
const tx = require('../utils/transactions');

function fmt(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

module.exports = {
    name: 'transacoes',
    aliases: ['transações', 'transactions', 'extrato-carteira', 'movimentos', 'tx'],
    description: 'Histórico de entradas e saídas da carteira',
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const list = tx.list(user.id, 12);

        if (!list.length) {
            return message.reply(
                `📭 Nenhuma movimentação registrada ainda para **${user.username}**.`
            );
        }

        const lines = list.map((t, i) => {
            const sign = t.type === 'in' ? '🟢 +' : '🔴 −';
            const when = new Date(t.at).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            let who = '';
            if (t.to) who = ` → <@${t.to}>`;
            if (t.from) who = ` ← <@${t.from}>`;
            return `**${i + 1}.** ${sign}❄️ **${fmt(t.amount)}** · ${t.reason}${who}\n┗ _${when}_`;
        });

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setAuthor({
                        name: `${user.username} · Movimentações`,
                        iconURL: user.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('📒  Extrato da carteira')
                    .setDescription(lines.join('\n\n'))
                    .setFooter({ text: 'Entradas 🟢 · Saídas 🔴 · Aeternus' })
                    .setTimestamp()
            ]
        });
    }
};
