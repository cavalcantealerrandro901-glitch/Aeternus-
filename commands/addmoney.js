const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const flocos = require('../utils/flocos');
const { getPanelBase, getDailyPageUrl } = require('../utils/panelUrl');

module.exports = {
    name: 'addmoney',
    aliases: ['addflocos', 'giveflocos', 'addbal'],
    description: 'Adiciona ❄️ flocos a um usuário (economia + painel)',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Apenas **administradores** podem usar este comando.');
        }

        const target =
            message.mentions.users.first() ||
            (args[0] && !isNaN(args[0]) ? await message.client.users.fetch(args[0]).catch(() => null) : null);

        // args: @user 5k  OU  5k @user  OU  id 5k
        let rawAmount = args[1] || args[0];
        if (message.mentions.users.first()) {
            rawAmount = args.find((a) => !a.startsWith('<@') && a !== target?.id) || args[1];
        } else if (target && args[0] === target.id) {
            rawAmount = args[1];
        }

        if (!target || !rawAmount) {
            return message.reply(
                '⚠️ Uso: `O.addmoney @usuário <valor>`\n' +
                    'Exemplos: `O.addmoney @user 5k` · `O.addmoney @user 1,5m` · `O.addmoney @user 500`'
            );
        }

        if (target.bot) {
            return message.reply('❌ Não dá para adicionar flocos a bots.');
        }

        const amount = flocos.parseBet(rawAmount, Number.MAX_SAFE_INTEGER);
        if (amount == null || amount <= 0) {
            return message.reply(
                '❌ Valor inválido. Use `100`, `1,5k`, `2.5m`, etc.'
            );
        }

        const before = flocos.get(target.id);
        const after = flocos.add(target.id, amount);

        const panel = getPanelBase();
        const daily = getDailyPageUrl();

        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle('❄️ Flocos adicionados')
            .setThumbnail(target.displayAvatarURL({ size: 128 }))
            .setDescription(
                `Administrador **${message.author.username}** creditou flocos na economia do **Aeternus**.`
            )
            .addFields(
                { name: '👤 Usuário', value: `${target} (\"${target.username}\")`, inline: true },
                { name: '➕ Valor', value: flocos.format(amount), inline: true },
                { name: '📊 Antes', value: flocos.formatPlain(before), inline: true },
                { name: '🏦 Saldo atual', value: flocos.format(after), inline: true },
                {
                    name: '🌐 Painel',
                    value: `[Abrir painel](${panel}) · [Daily](${daily}) · Veja no Discord com \`O.atm\` / \`O.bal\``
                }
            )
            .setFooter({ text: 'Economia unificada · data/economy.json · painel /api/user/balance' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Painel')
                .setStyle(ButtonStyle.Link)
                .setURL(panel)
                .setEmoji('⚙️'),
            new ButtonBuilder()
                .setLabel('ATM')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId(`atm_hint_${target.id}`)
                .setEmoji('🏦')
                .setDisabled(true)
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
