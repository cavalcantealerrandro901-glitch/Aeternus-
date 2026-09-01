const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const xp = require('../utils/xp');

module.exports = {
    name: 'saldo',
    aliases: ['bal', 'atm', 'balance', 'carteira'],
    description: 'Mostra flocos e cristais',
    async execute(message, args) {
        const sub = (args[0] || '').toLowerCase();
        if (['bloqueado', 'locked', 'liquidacao', 'liquidação', 'vault', 'pending'].includes(sub)) {
            const cmd = message.client.commands.get('saldo-bloqueado');
            if (cmd?.execute) return cmd.execute(message, args.slice(1));
        }

        const user = message.mentions.users.first() || message.author;
        const f = flocos.get(user.id);
        const c = cristais.get(user.id);
        const x = xp.get(user.id);

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setAuthor({
                        name: user.username,
                        iconURL: user.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('💎  Carteira Aeternus')
                    .setDescription(
                        [
                            '```',
                            '  ╔══════════════════════════╗',
                            '  ║      SEU PATRIMÔNIO      ║',
                            '  ╚══════════════════════════╝',
                            '```',
                            `❄️ **${flocos.formatPlain(f)}** flocos`,
                            `💠 **${cristais.formatPlain(c)}** cristais`,
                            `⭐ Nível **${x.level || 0}** · XP **${flocos.formatPlain(x.xp || 0)}**`,
                            '',
                            '🔒 Saldo bloqueado → `O.saldo bloqueado`',
                            '🛒 Loja de cristais → `/loja` ou painel web'
                        ].join('\n')
                    )
                    .setThumbnail(user.displayAvatarURL({ size: 128 }))
                    .setFooter({ text: 'Aeternus · economia dual currency' })
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
        const f = flocos.get(userId);
        const c = cristais.get(userId);
        const x = xp.get(userId);
        const user = await interaction.client.users.fetch(userId).catch(() => interaction.user);

        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8b5cf6)
                    .setAuthor({
                        name: user.username,
                        iconURL: user.displayAvatarURL({ size: 64 })
                    })
                    .setTitle('💎  Carteira Aeternus')
                    .setDescription(
                        [
                            '```',
                            '  ╔══════════════════════════╗',
                            '  ║      SEU PATRIMÔNIO      ║',
                            '  ╚══════════════════════════╝',
                            '```',
                            `❄️ **${flocos.formatPlain(f)}** flocos`,
                            `💠 **${cristais.formatPlain(c)}** cristais`,
                            `⭐ Nível **${x.level || 0}** · XP **${flocos.formatPlain(x.xp || 0)}**`,
                            '',
                            '_Atualizado agora_'
                        ].join('\n')
                    )
                    .setThumbnail(user.displayAvatarURL({ size: 128 }))
                    .setFooter({ text: 'Aeternus · economia dual currency' })
                    .setTimestamp()
            ]
        });
    }
};
