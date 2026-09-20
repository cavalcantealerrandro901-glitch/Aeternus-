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
    aliases: ['avatar-batalha', 'criaravatar', 'battleavatar'],
    description: 'Criar avatar de batalha para a arena',

    async execute(message) {
        const url = baseUrl() + '/avatar?as=' + encodeURIComponent(message.author.id);
        const emb = new EmbedBuilder()
            .setColor(0xa78bfa)
            .setTitle('🎭 Avatar de Batalha')
            .setDescription(
                [
                    'Crie o **avatar estilizado** que aparece nas lutas da arena.',
                    'Não usa foto real — só personagem montado por você.',
                    '',
                    'É preciso ter perfil: `O.j criar`',
                    'Depois de salvar, o avatar entra nos próximos duelos.'
                ].join('\n')
            )
            .setFooter({ text: 'Aeternus Arena' });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel('Abrir criador de avatar')
                .setURL(url)
                .setEmoji('🎭')
        );
        return message.reply({ embeds: [emb], components: [row] });
    }
};
