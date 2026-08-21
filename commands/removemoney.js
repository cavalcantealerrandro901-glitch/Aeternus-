const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const flocos = require('../utils/flocos');
const { getPanelBase } = require('../utils/panelUrl');

module.exports = {
    name: 'removemoney',
    aliases: ['remflocos', 'takeflocos', 'removebal'],
    description: 'Remove ❄️ flocos de um usuário (economia + painel)',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Apenas **administradores** podem usar este comando.');
        }

        const target =
            message.mentions.users.first() ||
            (args[0] && !/[^0-9]/.test(args[0])
                ? await message.client.users.fetch(args[0]).catch(() => null)
                : null);

        let rawAmount = args[1] || args[0];
        if (message.mentions.users.first()) {
            rawAmount = args.find((a) => !a.startsWith('<@')) || args[1];
        } else if (target && args[0] === target.id) {
            rawAmount = args[1];
        }

        if (!target || !rawAmount) {
            return message.reply(
                '⚠️ Uso: `O.removemoney @usuário <valor>`\n' +
                    'Exemplos: `O.removemoney @user 5k` · `O.removemoney @user 500`'
            );
        }

        const amount = flocos.parseBet(rawAmount, Number.MAX_SAFE_INTEGER);
        if (amount == null || amount <= 0) {
            return message.reply('❌ Valor inválido. Use `100`, `1,5k`, `2.5m`, etc.');
        }

        const before = flocos.get(target.id);
        const after = flocos.add(target.id, -amount); // addBal já usa Math.max(0, ...)

        const panel = getPanelBase();

        const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('❄️ Flocos removidos')
            .setThumbnail(target.displayAvatarURL({ size: 128 }))
            .setDescription(`Administrador **${message.author.username}** debitou flocos da economia.`)
            .addFields(
                { name: '👤 Usuário', value: `${target}`, inline: true },
                { name: '➖ Valor', value: flocos.format(amount), inline: true },
                { name: '📊 Antes', value: flocos.formatPlain(before), inline: true },
                { name: '🏦 Saldo atual', value: flocos.format(after), inline: true },
                {
                    name: '🌐 Painel',
                    value: `[Abrir painel](${panel}) · \`O.atm\` / \`O.bal\``
                }
            )
            .setFooter({ text: 'Economia unificada · data/economy.json' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Painel')
                .setStyle(ButtonStyle.Link)
                .setURL(panel)
                .setEmoji('⚙️')
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
