const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const player = require('../utils/player');
const arenaEngine = require('../utils/arenaEngine');

const BASE = process.env.RENDER_EXTERNAL_URL || process.env.PANEL_URL || process.env.PUBLIC_URL || 'https://aeternus.onrender.com';
function panelUrl() { return BASE.replace(/\/$/, '') + '/arena'; }
function fightLink(matchId) { return panelUrl() + '?id=' + encodeURIComponent(matchId); }

module.exports = {
    name: 'arena',
    aliases: ['pvp', 'duelo', 'batalha'],
    description: 'Inicia um duelo PvP 1v1 no Aeternus',
    async execute(message) {
        if (!player.has(message.author.id)) return message.reply('Crie seu perfil com O.j criar antes de entrar na arena.');
        const opponent = [...message.mentions.users.values()].find((u) => !u.bot);
        if (!opponent) {
            const embed = new EmbedBuilder().setColor(0xc9a227).setTitle('⚔️ ARENA PvP • AETERNUS')
                .setDescription(['Desafie outro jogador para um duelo **1v1**.','', '**Como iniciar:**','`O.pvp @oponente`','', 'A batalha acontece no painel web do Aeternus.','Cada jogador usa os ataques disponíveis da própria classe.','Sem apostas e sem moeda envolvida.'].join('\n'))
                .setFooter({ text: '✦ Aeternus Arena' });
            return message.reply({ embeds: [embed] });
        }
        if (opponent.id === message.author.id) return message.reply('Você não pode desafiar a si mesmo.');
        if (!player.has(opponent.id)) return message.reply('<@' + opponent.id + '> ainda não tem perfil. Use O.j criar.');
        const result = arenaEngine.createMatch({ mode: '1v1', teamA: [message.author.id], teamB: [opponent.id], bet: 0, fun: true });
        if (!result.ok) return message.reply(result.error);
        const embed = new EmbedBuilder().setColor(0xc9a227).setTitle('⚔️ ARENA PvP • DESAFIO CRIADO')
            .setDescription(['**' + message.author.username + '** ⚔️ **' + opponent.username + '**','', 'A batalha foi criada. Cada jogador deve abrir o painel pelo botão abaixo.','', '⏱️ Turnos de **90 segundos**','⚔️ Ataques definidos pela classe','💬 Chat disponível somente durante a batalha','🏆 Vitória concede as recompensas normais do PvP.','', '🔗 [ABRIR ARENA](' + fightLink(result.match.id) + ')'].join('\n'))
            .setFooter({ text: 'Arena ' + result.match.id }).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('⚔️ Abrir Arena').setStyle(ButtonStyle.Link).setURL(fightLink(result.match.id))
        );
        return message.reply({ embeds: [embed], components: [row] });
    }
};