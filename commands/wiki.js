const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function baseUrl() {
    const u =
        process.env.RENDER_EXTERNAL_URL ||
        process.env.WEB_URL ||
        process.env.BASE_URL ||
        '';
    return String(u).replace(/\/$/, '');
}

module.exports = {
    name: 'wiki',
    aliases: ['guia', 'docs', 'documentacao', 'documentação'],
    description: 'Wiki oficial do Aeternus',

    async execute(message) {
        const root = baseUrl();
        const link = root ? `${root}/wiki.html` : null;

        const emb = new EmbedBuilder()
            .setColor(0xa78bfa)
            .setTitle('📖 Wiki Oficial — Aeternus')
            .setDescription(
                [
                    'Guia completo: perfil, classes, guildas, arena, masmorra, economia e jogos.',
                    '',
                    '**Atalhos no bot**',
                    '• `O.ajuda` — central de comandos',
                    '• `O.j perfil` — personagem',
                    '• `O.guild` — guildas',
                    '• `O.pvp` / `O.masmorra` — combate',
                    '• `O.minas` — mines (1💣 = 7 gemas p/ multi)',
                    '',
                    link
                        ? `🌐 **Wiki web:** ${link}`
                        : '_Wiki web: `/wiki.html` no painel do bot (URL do Render)._'
                ].join('\n')
            )
            .setFooter({ text: 'Aeternus · Wiki' })
            .setTimestamp();

        const row = link
            ? [
                  new ActionRowBuilder().addComponents(
                      new ButtonBuilder()
                          .setLabel('Abrir Wiki')
                          .setStyle(ButtonStyle.Link)
                          .setURL(link)
                  )
              ]
            : [];

        return message.reply({ embeds: [emb], components: row });
    }
};
