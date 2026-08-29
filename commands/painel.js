const { EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'painel',
    aliases: ['dashboard', 'site'],
    async execute(message) {
        const base = process.env.REDIRECT_URI
            ? process.env.REDIRECT_URI.replace(/\/auth\/discord\/callback\/?$/, '')
            : `http://localhost:${process.env.PORT || 10000}`;
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setTitle('🌐 Painel Aeternus')
                    .setDescription(`[Abrir painel](${base}/dashboard)`)
            ]
        });
    }
};
