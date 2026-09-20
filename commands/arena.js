const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const player = require('../utils/player');
const arenaEngine = require('../utils/arenaEngine');

module.exports = {
    name: 'arena',
    aliases: ['pvp', 'duelo', 'batalha'],
    description: 'Abre a arena no painel (1v1 ou equipes)',
    async execute(message, args) {
        if (!player.has(message.author.id)) {
            return message.reply('Crie seu perfil com `O.j criar`.');
        }
        const base =
            process.env.RENDER_EXTERNAL_URL ||
            process.env.PANEL_URL ||
            'https://aeternus.onrender.com';
        const url = base.replace(/\/$/, '') + '/arena';

        const mention = message.mentions.users.first();
        if (mention && !mention.bot) {
            if (!player.has(mention.id)) {
                return message.reply('O oponente ainda não tem perfil.');
            }
            const result = arenaEngine.createMatch({
                mode: '1v1',
                teamA: [message.author.id],
                teamB: [mention.id]
            });
            if (!result.ok) return message.reply(result.error);
            const fightUrl = `${url}?id=${result.match.id}&as=${message.author.id}`;
            const fightUrlB = `${url}?id=${result.match.id}&as=${mention.id}`;
            const embed = new EmbedBuilder()
                .setColor(0xc9a227)
                .setTitle('⚔️ Desafio na Arena')
                .setDescription(
                    `**${message.author.username}** desafiou **${mention.username}!**\n\n` +
                        `Tema medieval · turnos longos · habilidades equipadas.\n\n` +
                        `[Abrir arena (desafiante)](${fightUrl})\n` +
                        `[Abrir arena (desafiado)](${fightUrlB})`
                )
                .setFooter({ text: 'Equipe habilidades com O.habilidades e O.passivas' });
            return message.reply({
                content: `${mention}`,
                embeds: [embed],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Entrar na Arena').setURL(fightUrl)
                    )
                ]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x8b5a2b)
            .setTitle('🏰 Arena Aeternus')
            .setDescription(
                'Combate no **painel** com tema medieval e magia.\n\n' +
                    '• **1v1** — `O.arena @usuário`\n' +
                    '• **Equipes** — pelo painel (mesmo número de jogadores)\n' +
                    '• Equipe **4 ativas** + **5 passivas**\n' +
                    '• Baús de recompensa · XP pelo nível do oponente\n' +
                    '• Derrota: perde metade do nível e atributos\n\n' +
                    `[Abrir painel da Arena](${url})`
            );
        return message.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Abrir Arena').setURL(url)
                )
            ]
        });
    }
};
