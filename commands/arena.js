const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const player = require('../utils/player');
const arenaEngine = require('../utils/arenaEngine');

const BASE = process.env.RENDER_EXTERNAL_URL || process.env.PANEL_URL || process.env.PUBLIC_URL || 'https://aeternus.onrender.com';
function panelUrl() {
  return BASE.replace(/\/$/, '') + '/arena';
}
function fightLink(matchId) {
  return panelUrl() + '?id=' + encodeURIComponent(matchId);
}

module.exports = {
  name: 'arena',
  aliases: ['pvp', 'duelo', 'batalha', 'coliseu'],
  description: 'Inicia um duelo PvP 1v1 no Coliseu Aeternus',
  async execute(message) {
    if (!player.has(message.author.id)) {
      return message.reply('Crie seu perfil com `O.j criar` antes de entrar no Coliseu.');
    }

    const opponent = [...message.mentions.users.values()].find((u) => !u.bot);

    // Sem oponente → mostra ajuda
    if (!opponent) {
      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('⚔️ COLISEU AETERNUS')
        .setDescription(
          [
            '**A batalha começou… apenas um sairá de pé.**',
            '',
            'Desafie outro jogador para um duelo **1v1**.',
            '',
            '**Como iniciar:**',
            '`O.pvp @oponente`',
            '',
            'A batalha acontece no painel web do Aeternus.',
            'Vida, mana, itens, habilidades e classe são puxados do seu perfil.',
            'Sem apostas e sem moeda envolvida.'
          ].join('\n')
        )
        .setFooter({ text: 'Coliseu Aeternus • Apenas um sairá de pé' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (opponent.id === message.author.id) {
      return message.reply('Você não pode desafiar a si mesmo.');
    }
    if (!player.has(opponent.id)) {
      return message.reply(`<@${opponent.id}> ainda não tem perfil. Use \`O.j criar\`.`);
    }

    const result = arenaEngine.createMatch({
      mode: '1v1',
      teamA: [message.author.id],
      teamB: [opponent.id],
      bet: 0,
      fun: true
    });

    if (!result.ok) return message.reply(result.error);

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('⚔️ COLISEU AETERNUS — Desafio Aceito')
      .setDescription(
        [
          `**${message.author.username}** ⚔️ **${opponent.username}**`,
          '',
          '**A batalha começou… apenas um sairá de pé.**',
          '',
          'A arena foi criada. Cada jogador deve abrir o painel pelo botão abaixo.',
          '',
          '⏱️ Turnos de **90 segundos**',
          '⚔️ Habilidades da sua classe',
          '💬 Chat disponível somente durante a batalha',
          '🏆 Vitória concede as recompensas normais do PvP',
          '',
          `🔗 [Entrar na Arena](${fightLink(result.match.id)})`
        ].join('\n')
      )
      .addFields(
        { name: 'Classe', value: 'Vinculada ao perfil', inline: true },
        { name: 'Itens & Passivas', value: 'Carregados do inventário', inline: true },
        { name: 'Status', value: 'Pronto para o combate', inline: true }
      )
      .setFooter({ text: `Coliseu Aeternus • Desafio ${result.match.id}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('⚔️ Entrar na Arena')
        .setStyle(ButtonStyle.Link)
        .setURL(fightLink(result.match.id))
    );

    return message.reply({ embeds: [embed], components: [row] });
  }
};
