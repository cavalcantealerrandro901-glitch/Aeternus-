const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const { parseAmount } = require('../utils/parseAmount');

module.exports = {
    name: 'addmoney',
    aliases: ['addbal', 'dar', 'givemoney'],
    description: 'Adiciona flocos ou cristais (admin)',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
            return message.reply({ embeds: [err('Apenas administradores.')] });

        const users = [...message.mentions.users.values()];
        // último token flocos|cristais define a moeda; senão flocos
        const last = (args[args.length - 1] || '').toLowerCase();
        const coinArg = /^(flocos?|cristais?|❄️|💠)$/i.test(last) ? last : null;
        const coinRaw = (coinArg || 'flocos').toLowerCase();
        const isCristais =
            coinRaw.startsWith('cristal') || coinRaw === '💠';

        const amountToken = args.find((a) => {
            if (/^<@!?\d+>$/.test(a)) return false;
            if (/^(flocos?|cristais?|❄️|💠)$/i.test(a)) return false;
            return parseAmount(a) > 0;
        });
        const amount = parseAmount(amountToken);

        if (!users.length || !amount) {
            return message.reply({
                embeds: [
                    err(
                        [
                            'Uso: `O.addmoney @user1 @user2 <valor> <flocos|cristais>`',
                            '',
                            'A **moeda** vai no **final**:',
                            '`O.addmoney @user 10k flocos`',
                            '`O.addmoney @user 500 cristais`',
                            '',
                            'Se omitir a moeda, usa **flocos**.'
                        ].join('\n')
                    )
                ]
            });
        }

        const coinName = isCristais ? 'cristais 💠' : 'flocos ❄️';
        const lines = [];

        for (const u of users) {
            if (isCristais) {
                cristais.add(u.id, amount);
                lines.push(
                    `• ${u} → +💠 **${amount.toLocaleString('pt-BR')}** · saldo **${cristais.get(u.id).toLocaleString('pt-BR')}**`
                );
            } else {
                flocos.add(u.id, amount, { reason: `addmoney by ${message.author.id}` });
                lines.push(
                    `• ${u} → +❄️ **${amount.toLocaleString('pt-BR')}** · saldo **${flocos.get(u.id).toLocaleString('pt-BR')}**`
                );
            }
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(isCristais ? 0x22d3ee : 0x34d399)
                    .setTitle('💰 Valores creditados')
                    .setDescription(lines.join('\n'))
                    .addFields({
                        name: 'Moeda',
                        value: `**${coinName}**`,
                        inline: true
                    })
                    .setFooter({ text: `Por ${message.author.tag}` })
                    .setTimestamp()
            ]
        });
    }
};

function err(t) {
    return new EmbedBuilder().setColor(0xef4444).setDescription(`❌ ${t}`);
}
