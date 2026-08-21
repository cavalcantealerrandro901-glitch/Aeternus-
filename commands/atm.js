const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const cristais = require('../utils/cristais');
const { getPanelBase, getDailyPageUrl } = require('../utils/panelUrl');

module.exports = {
    name: 'atm',
    aliases: ['banco', 'cofre'],
    description: 'Cofre de ❄️ flocos + economia e painel',
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
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
            .setDescription(
                `Economia do **Aeternus** — moeda oficial **❄️ flocos**.\n` +
                    `Resgate diário e configurações no **painel web**.`
            )
            .addFields(
                {
                    name: '❄️ Flocos',
                    value: `**${bal.toLocaleString('pt-BR')}** flocos`,
                    inline: true
                },
                {
                    name: '🧊 Cristais de gelo',
                    value: `Nível **${c.level}**\n${cristais.formatPlain(c.total)}\nDaily ×**${mult.toFixed(2)}**`,
                    inline: true
                },
                {
                    name: '⭐ XP',
                    value: `Nível **${p.level}**\n${xp.formatPlain(p.total)}`,
                    inline: true
                },
                {
                    name: '🌐 Painel',
                    value:
                        `[Abrir painel](${panel}) · [Daily](${daily}) · [Servidores](${panel}/servers)`
                }
            )
            .setFooter({ text: 'O.bal · O.daily · O.perfil · O.cristais' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Painel')
                .setStyle(ButtonStyle.Link)
                .setURL(panel)
                .setEmoji('⚙️'),
            new ButtonBuilder()
                .setLabel('Daily')
                .setStyle(ButtonStyle.Link)
                .setURL(daily)
                .setEmoji('🎁'),
            new ButtonBuilder()
                .setLabel('Servidores')
                .setStyle(ButtonStyle.Link)
                .setURL(`${panel}/servers`)
                .setEmoji('🛡️')
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
