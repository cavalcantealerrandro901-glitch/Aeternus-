const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const flocos = require('../utils/flocos');
const { getPanelBase, getDailyPageUrl } = require('../utils/panelUrl');

module.exports = {
    name: 'addmoney',
    aliases: ['addflocos', 'giveflocos', 'addbal'],
    description: 'Adiciona ❄️ flocos a um ou vários usuários',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Apenas **administradores** podem usar este comando.');
        }

        if (!args.length) {
            return message.reply(
                '⚠️ Uso:\n' +
                    '`O.addmoney @user1 @user2 @user3 5k`\n' +
                    '`O.addmoney @user 500`\n' +
                    'Vários usuários + **um valor** no final (ou no início).'
            );
        }

        // Valor: primeiro ou último arg que pareça quantia (não menção / não só ID)
        const isMention = (a) => /^<@!?\d+>$/.test(a);
        const isSnowflake = (a) => /^\d{16,20}$/.test(a);

        let amountArg = null;
        let amountIndex = -1;

        // prioriza o último token que parseia como valor
        for (let i = args.length - 1; i >= 0; i--) {
            if (isMention(args[i]) || isSnowflake(args[i])) continue;
            const parsed = flocos.parseBet(args[i], Number.MAX_SAFE_INTEGER);
            if (parsed != null && parsed > 0) {
                amountArg = args[i];
                amountIndex = i;
                break;
            }
        }

        // fallback: primeiro token numérico
        if (amountArg == null) {
            for (let i = 0; i < args.length; i++) {
                if (isMention(args[i]) || isSnowflake(args[i])) continue;
                const parsed = flocos.parseBet(args[i], Number.MAX_SAFE_INTEGER);
                if (parsed != null && parsed > 0) {
                    amountArg = args[i];
                    amountIndex = i;
                    break;
                }
            }
        }

        if (amountArg == null) {
            return message.reply(
                '❌ Informe o **valor**. Exemplos: `500`, `5k`, `1,5m`\n' +
                    '`O.addmoney @a @b 5k`'
            );
        }

        const amount = flocos.parseBet(amountArg, Number.MAX_SAFE_INTEGER);
        if (amount == null || amount <= 0) {
            return message.reply('❌ Valor inválido. Use `100`, `1,5k`, `2.5m`, etc.');
        }

        // Alvos: menções + IDs nos args (exceto o do valor)
        const targets = new Map();

        for (const u of message.mentions.users.values()) {
            if (!u.bot) targets.set(u.id, u);
        }

        for (let i = 0; i < args.length; i++) {
            if (i === amountIndex) continue;
            const a = args[i];
            if (isMention(a)) continue; // já pego em mentions
            if (isSnowflake(a)) {
                if (targets.has(a)) continue;
                const u = await message.client.users.fetch(a).catch(() => null);
                if (u && !u.bot) targets.set(u.id, u);
            }
        }

        if (!targets.size) {
            return message.reply(
                '❌ Mencione **pelo menos um usuário**.\n' +
                    '`O.addmoney @user1 @user2 10k`'
            );
        }

        const results = [];
        for (const user of targets.values()) {
            const before = flocos.get(user.id);
            const after = flocos.add(user.id, amount);
            results.push({ user, before, after });
        }

        const panel = getPanelBase();
        const daily = getDailyPageUrl();

        const lines = results
            .slice(0, 20)
            .map(
                (r, i) =>
                    `**${i + 1}.** ${r.user} → ${flocos.formatPlain(r.before)} → **${r.after.toLocaleString('pt-BR')}** ❄️`
            )
            .join('\n');

        const extra =
            results.length > 20 ? `\n_…e mais ${results.length - 20} usuários._` : '';

        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(`❄️ Flocos adicionados · ${results.length} usuário(s)`)
            .setDescription(
                `**+${amount.toLocaleString('pt-BR')}** flocos para cada um.\n` +
                    `Por **${message.author.username}**`
            )
            .addFields(
                { name: '📋 Resultado', value: (lines + extra).slice(0, 1024) || '—' },
                {
                    name: '🌐 Painel',
                    value: `[Painel](${panel}) · [Daily](${daily}) · \`O.atm\` / \`O.bal\``
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
