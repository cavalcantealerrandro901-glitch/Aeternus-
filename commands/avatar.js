const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function baseUrl() {
    return (
        String(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(
            /\/$/,
            ''
        ) || 'https://aeternus-8hlu.onrender.com'
    );
}

module.exports = {
    name: 'avatar',
    aliases: ['avatar-batalha', 'criaravatar', 'battleavatar', 'avatar3d'],
    description: 'Criar avatar de batalha a partir de uma imagem',

    async execute(message) {
        const url = baseUrl() + '/avatar?as=' + encodeURIComponent(message.author.id);
        const emb = new EmbedBuilder()
            .setColor(0xa78bfa)
            .setTitle('🎭 Avatar de Batalha')
            .setDescription(
                [
                    'Envie uma **imagem** e o sistema transforma em **avatar de batalha**.',
                    'As **expressões** (ataque, dano, vitória…) são aplicadas na arena.',
                    'Opcional: **Face Live** com webcam em tempo real.',
                    '',
                    'Precisa de perfil: `O.j criar`'
                ].join('\n')
            )
            .setFooter({ text: 'Aeternus Arena' });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel('Criar avatar')
                .setURL(url)
                .setEmoji('🎭')
        );
        return message.reply({ embeds: [emb], components: [row] });
    }
};
