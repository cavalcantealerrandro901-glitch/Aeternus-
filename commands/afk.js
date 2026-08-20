const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'afk',
    aliases: ['ausente'],
    description: 'Marca você como ausente. Use sem motivo ou com um texto.',
    async execute(message, args, client) {
        if (!client.afk) client.afk = new Map();

        const reason = args.join(' ').trim() || 'Ausente';

        // Evita que o próprio comando limpe o AFK logo em seguida
        client.afk.set(message.author.id, {
            reason: reason.slice(0, 200),
            timestamp: Date.now(),
            skipOnce: true
        });

        const embed = new EmbedBuilder()
            .setColor(0x64748b)
            .setTitle('💤 AFK ativado')
            .setDescription(
                `**${message.author.username}**, você está ausente.\n` +
                    `**Motivo:** ${reason.slice(0, 200)}\n\n` +
                    `Quando mandar qualquer mensagem, o AFK é removido automaticamente.\n` +
                    `Se alguém te mencionar, o bot avisa o motivo.`
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
