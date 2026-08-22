const { EmbedBuilder } = require('discord.js');
const registro = require('../utils/registro');

module.exports = {
    name: 'registros',
    aliases: ['regs', 'anotacoes'],
    description: 'Lista registros do servidor',
    async execute(message, args) {
        const page = Math.max(1, parseInt(args[0], 10) || 1);
        const perPage = 10;
        const all = registro.list(message.guild.id, 100);
        const totalPages = Math.max(1, Math.ceil(all.length / perPage));
        const p = Math.min(page, totalPages);
        const slice = all.slice((p - 1) * perPage, p * perPage);

        if (!all.length) {
            return message.reply('Nenhum registro ainda. Use `O.registro <texto>`.');
        }

        const lines = slice.map((e, i) => {
            const n = (p - 1) * perPage + i + 1;
            const date = new Date(e.createdAt).toLocaleString('pt-BR');
            return `**${n}.** \`${e.id}\` — ${e.text.slice(0, 120)}${e.text.length > 120 ? '…' : ''}\n└ ${e.authorTag || '—'} · ${date}`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x7c3aed)
            .setTitle(`📋 Registros · ${message.guild.name}`)
            .setDescription(lines.join('\n\n').slice(0, 4000))
            .setFooter({ text: `Página ${p}/${totalPages} · Total: ${all.length}` });

        await message.reply({ embeds: [embed] });
    }
};
