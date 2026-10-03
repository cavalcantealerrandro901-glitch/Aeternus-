const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const player = require('../utils/player');
const dungeon = require('../utils/dungeon');

module.exports = {
    name: 'masmorra',
    aliases: ['dungeon', 'dg', 'torre'],
    description: 'Entra na masmorra (exploração por clique, pisos 1–26)',
    async execute(message, args) {
        if (!player.has(message.author.id)) {
            return message.reply('Crie seu perfil com `O.j criar`.');
        }
        const prog = dungeon.getProgress(message.author.id);
        const floor = Math.min(
            dungeon.MAX_IMPLEMENTED,
            Math.max(1, Number(args[0]) || prog.currentFloor || prog.highest + 1 || 1)
        );

        const base =
            process.env.RENDER_EXTERNAL_URL ||
            process.env.PANEL_URL ||
            'https://aeternus.onrender.com';
        const start = dungeon.startFloor(message.author.id, floor);
        if (!start.ok) return message.reply(start.error);

        const url = `${base.replace(/\/$/, '')}/dungeon?id=${start.match.id}&as=${message.author.id}`;
        const embed = new EmbedBuilder()
            .setColor(0x4c1d95)
            .setTitle(`🏰 Masmorra — Piso ${floor}`)
            .setDescription(
                `Explore o piso **clicando no mapa**. **19 monstros** + **1 Boss**.\n` +
                    `Armadilhas e caminhos bloqueados. Derrote o Boss para liberar o próximo piso.\n` +
                    `Recompensas: **XP**, **CP** e itens.\n\n` +
                    `Progresso: mais alto **${prog.highest}** · sugerido **${Math.min(dungeon.MAX_IMPLEMENTED, prog.highest + 1)}**\n` +
                    `Máximo atual: piso **${dungeon.MAX_IMPLEMENTED}**.\n\n` +
                    `[Entrar na masmorra](${url})`
            );
        return message.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel(`Explorar piso ${floor}`)
                        .setURL(url)
                )
            ]
        });
    }
};
