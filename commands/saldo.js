const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const xp = require('../utils/xp');

function buildEmbed(user) {
    const e = eter.get(user.id);
    const x = xp.get(user.id);
    const prog = xp.progress(user.id);
    return new EmbedBuilder()
        .setColor(0xa78bfa)
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 64 }) })
        .setTitle('Carteira')
        .setDescription(
            [
                `✨ **${eter.formatPlain(e)}** éter`,
                `⭐ Nível **${x.level || 0}** · XP **${eter.formatPlain(x.xp || 0)}**`,
                `📊 **${prog.current}/${prog.need}** (${prog.pct}%)`
            ].join('\n')
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }));
}

module.exports = {
    name: 'saldo',
    aliases: ['bal', 'atm', 'balance', 'carteira', 'eter'],
    description: 'Ver saldo',
    data: new SlashCommandBuilder()
        .setName('ver_saldo')
        .setDescription('Ver saldo')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),

    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        await message.reply({
            embeds: [buildEmbed(user)],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`saldo:refresh:${user.id}`)
                        .setLabel('Atualizar')
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });
    },

    async executeSlash(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        await interaction.reply({
            embeds: [buildEmbed(user)],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`saldo:refresh:${user.id}`)
                        .setLabel('Atualizar')
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        if (parts[0] !== 'saldo' || parts[1] !== 'refresh') return;
        const user = await interaction.client.users.fetch(parts[2]).catch(() => interaction.user);
        await interaction.update({ embeds: [buildEmbed(user)] });
    }
};
