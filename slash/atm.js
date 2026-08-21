const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');
const { getPanelBase, getDailyPageUrl } = require('../utils/panelUrl');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('atm')
        .setDescription('Cofre de ❄️ flocos + painel')
        .addUserOption((o) => o.setName('usuario').setDescription('Usuário').setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const bal = flocos.get(target.id);
        const p = xp.progress(xp.get(target.id));
        const c = cristais.progress(cristais.get(target.id));
        const mult = cristais.dailyMultiplier(target.id);
        const panel = getPanelBase();
        const daily = getDailyPageUrl();

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle(`🏦 ATM · ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '❄️ Flocos', value: `**${bal.toLocaleString('pt-BR')}**`, inline: true },
                {
                    name: '🧊 Cristais',
                    value: `Nv. **${c.level}** · ×${mult.toFixed(2)} daily`,
                    inline: true
                },
                { name: '⭐ XP', value: `Nv. **${p.level}**`, inline: true }
            )
            .setFooter({ text: 'Economia Aeternus' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Painel').setStyle(ButtonStyle.Link).setURL(panel).setEmoji('⚙️'),
            new ButtonBuilder().setLabel('Daily').setStyle(ButtonStyle.Link).setURL(daily).setEmoji('🎁')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
