const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const eter = require('../utils/eter');
const xp = require('../utils/xp');

module.exports = {
    name: 'saldo',
    aliases: ['bal', 'atm', 'balance', 'carteira', 'eter'],
    description: 'Mostra Éter e XP',
    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;
        const e = eter.get(user.id);
        const x = xp.get(user.id);
        const prog = xp.progress(user.id);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setAuthor({
                        name: user.username,
                        iconURL: user.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('✨  Carteira Aeternus')
                    .setDescription(
                        [
                            '```',
                            '  ╔══════════════════════════╗',
                            '  ║     XP  ·  ÉTER          ║',
                            '  ╚══════════════════════════╝',
                            '```',
                            `✨ **${eter.formatPlain(e)}** éter`,
                            `⭐ Nível **${x.level || 0}** · XP **${eter.formatPlain(x.xp || 0)}**`,
                            `📊 Progresso: **${prog.current}/${prog.need}** (${prog.pct}%)`,
                            '',
                            '_Única moeda: Éter · Progressão: XP_'
                        ].join('\n')
                    )
                    .setThumbnail(user.displayAvatarURL({ size: 128 }))
                    .setFooter({ text: 'Aeternus · XP + Éter' })
                    .setTimestamp()
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`saldo:refresh:${user.id}`)
                        .setLabel('Atualizar')
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Secondary)
                )
            ]
        });
    },

    async handleComponent(interaction) {
        const parts = interaction.customId.split(':');
        if (parts[0] !== 'saldo' || parts[1] !== 'refresh') return;
        const userId = parts[2];
        const e = eter.get(userId);
        const x = xp.get(userId);
        const prog = xp.progress(userId);
        const user = await interaction.client.users.fetch(userId).catch(() => interaction.user);

        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setAuthor({
                        name: user.username,
                        iconURL: user.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('✨  Carteira Aeternus')
                    .setDescription(
                        [
                            `✨ **${eter.formatPlain(e)}** éter`,
                            `⭐ Nível **${x.level || 0}** · XP **${eter.formatPlain(x.xp || 0)}**`,
                            `📊 Progresso: **${prog.current}/${prog.need}** (${prog.pct}%)`,
                            '',
                            '_Atualizado agora_'
                        ].join('\n')
                    )
                    .setThumbnail(user.displayAvatarURL({ size: 128 }))
                    .setFooter({ text: 'Aeternus · XP + Éter' })
                    .setTimestamp()
            ]
        });
    }
};
