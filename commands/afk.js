const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const afk = require('../utils/afk');

function fmtSince(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}min`;
}

module.exports = {
    name: 'afk',
    aliases: ['ausente'],
    description: 'Marca você como ausente',
    data: new SlashCommandBuilder()
        .setName('ausente')
        .setDescription('Marca você como ausente (AFK)')
        .addStringOption((o) =>
            o
                .setName('motivo')
                .setDescription('Motivo da ausência')
                .setRequired(false)
                .setMaxLength(180)
        ),

    async execute(message, args) {
        if (afk.has(message.author.id)) {
            const prev = afk.get(message.author.id);
            afk.clear(message.author.id);
            return message.reply(
                `👋 Bem-vindo de volta, ${message.author}! AFK removido` +
                    (prev?.at
                        ? ` (ausente por **${fmtSince(Date.now() - prev.at)}**).`
                        : '.')
            );
        }

        const reason = args.join(' ').trim().slice(0, 180) || 'Ausente no momento';
        afk.set(message.author.id, reason);

        const emb = new EmbedBuilder()
            .setColor(0x94a3b8)
            .setTitle('💤 Modo ausente')
            .setDescription(
                `${message.author} está **AFK**.\n**Motivo:** ${reason}\n\n` +
                    `_Mande qualquer mensagem ou use o comando de novo para voltar._`
            )
            .setTimestamp();

        return message.reply({ embeds: [emb] });
    },

    async executeSlash(i) {
        if (afk.has(i.user.id)) {
            const prev = afk.get(i.user.id);
            afk.clear(i.user.id);
            return i.reply(
                `👋 Bem-vindo de volta, ${i.user}! AFK removido` +
                    (prev?.at
                        ? ` (ausente por **${fmtSince(Date.now() - prev.at)}**).`
                        : '.')
            );
        }

        const reason = (i.options.getString('motivo') || 'Ausente no momento').slice(0, 180);
        afk.set(i.user.id, reason);

        const emb = new EmbedBuilder()
            .setColor(0x94a3b8)
            .setTitle('💤 Modo ausente')
            .setDescription(
                `${i.user} está **AFK**.\n**Motivo:** ${reason}\n\n` +
                    `_Mande qualquer mensagem ou use o comando de novo para voltar._`
            )
            .setTimestamp();

        return i.reply({ embeds: [emb] });
    }
};
