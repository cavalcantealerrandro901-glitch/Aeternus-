const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cristais = require('../utils/cristais');
const flocos = require('../utils/flocos');
const xp = require('../utils/xp');
const { getPanelBase, getDailyPageUrl } = require('../utils/panelUrl');

module.exports = {
    name: 'saldo',
    aliases: ['atm', 'bal', 'balance', 'banco', 'cofre', 'wallet'],
    description: 'Saldo de 💠 cristais, ❄️ flocos e ⭐ XP',
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const c = cristais.get(target.id);
        const f = flocos.get(target.id);
        const p = xp.progress(xp.get(target.id));
        const mult = xp.dailyMultiplier(target.id);

        const panel = getPanelBase();
        const daily = getDailyPageUrl();

        const embed = new EmbedBuilder()
            .setColor(0x38bdf8)
            .setTitle(`💰 Saldo · ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription(
                `**💠 Cristais** — apostas\n` +
                    `**❄️ Flocos** — loja e jogos de raciocínio\n` +
                    `**⭐ XP** — conversar no chat (nível → bônus no daily)`
            )
            .addFields(
                {
                    name: '💠 Cristais',
                    value: `**${c.toLocaleString('pt-BR')}**`,
                    inline: true
                },
                {
                    name: '❄️ Flocos',
                    value: `**${f.toLocaleString('pt-BR')}**`,
                    inline: true
                },
                {
                    name: '⭐ XP',
                    value:
                        `Nível **${p.level}**\n` +
                        `${p.xpInLevel.toLocaleString('pt-BR')}/${p.xpNeed.toLocaleString('pt-BR')}\n` +
                        `Daily **×${mult.toFixed(2)}**`,
                    inline: true
                },
                {
                    name: '🌐 Painel',
                    value: `[Painel](${panel}) · [Daily](${daily})`
                }
            )
            .setFooter({ text: 'O.saldo · O.atm · O.bal · O.perfil' })
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
                .setEmoji('🎁')
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
