const { EmbedBuilder } = require('discord.js');
const { getPrefix } = require('../utils/settings');

module.exports = {
    name: 'help',
    aliases: ['ajuda', 'comandos', 'cmds'],
    async execute(message) {
        const p = getPrefix(message.guild.id);
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xa78bfa)
                    .setTitle('✨ Aeternus — Central de comandos')
                    .setDescription(
                        [
                            `Prefixo atual: **${p}**`,
                            '',
                            '**💰 Economia**',
                            `\`${p}saldo\` \`${p}daily\` \`${p}banco\` \`${p}depositar\` \`${p}sacar\` \`${p}pay\` \`${p}work\` \`${p}crime\` \`${p}rob\` \`${p}beg\` \`${p}pescar\` \`${p}minerar\` \`${p}weekly\` \`${p}monthly\` \`${p}cambio\` \`${p}investir\` \`${p}rank\` \`${p}xp\` \`${p}perfil\``,
                            '',
                            '**🎮 Jogos**',
                            `\`${p}cara\` \`${p}dado\` \`${p}roleta\` \`${p}slots\` \`${p}ppt\` \`${p}minas\` \`${p}blackjack\` \`${p}duplicar\` \`${p}quiz\` \`${p}charada\``,
                            '',
                            '**🛡️ Moderação**',
                            `\`${p}ban\` \`${p}unban\` \`${p}kick\` \`${p}mute\` \`${p}unmute\` \`${p}warn\` \`${p}warns\` \`${p}limpar\` \`${p}lock\` \`${p}unlock\` \`${p}lockdown\` \`${p}slowmode\` \`${p}nick\` \`${p}role\``,
                            '',
                            '**💞 Interações**',
                            `\`${p}abraco\` \`${p}beijo\` \`${p}tapa\` \`${p}carinho\` \`${p}cutucar\` \`${p}bonk\` \`${p}morder\` \`${p}dancar\` \`${p}chorar\` \`${p}highfive\``,
                            '',
                            '**🛠️ Utilidade**',
                            `\`${p}userinfo\` \`${p}serverinfo\` \`${p}avatar\` \`${p}invites\` \`${p}afk\` \`${p}prefix\` \`${p}painel\` \`${p}ping\` \`${p}say\` \`${p}embed\``
                        ].join('\n')
                    )
                    .setFooter({ text: 'Aeternus · profissional' })
                    .setTimestamp()
            ]
        });
    }
};
