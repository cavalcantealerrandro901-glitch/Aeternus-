const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const cristais = require('../utils/cristais');
const flocos = require('../utils/flocos');
const { getPanelBase } = require('../utils/panelUrl');

module.exports = {
    name: 'addmoney',
    aliases: ['addcristais', 'give', 'addbal'],
    description: 'Adiciona 💠 cristais (ou ❄️ flocos) a um ou vários usuários',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Apenas **administradores** podem usar este comando.');
        }

        if (!args.length) {
            return message.reply(
                '⚠️ Uso:\n' +
                    '`O.addmoney @a @b 5k` → cristais 💠\n' +
                    '`O.addmoney flocos @a 5k` → flocos ❄️\n' +
                    '`O.addmoney cristais @a @b 1m`'
            );
        }

        let currency = 'cristais';
        const first = (args[0] || '').toLowerCase();
        if (['flocos', 'floco', 'f'].includes(first)) {
            currency = 'flocos';
            args = args.slice(1);
        } else if (['cristais', 'cristal', 'c'].includes(first)) {
            currency = 'cristais';
            args = args.slice(1);
        }

        const lib = currency === 'flocos' ? flocos : cristais;
        const isMention = (a) => /^<@!?\d+>$/.test(a);
        const isSnowflake = (a) => /^\d{16,20}$/.test(a);

        let amountArg = null;
        let amountIndex = -1;
        for (let i = args.length - 1; i >= 0; i--) {
            if (isMention(args[i]) || isSnowflake(args[i])) continue;
            const parsed = lib.parseBet(args[i], Number.MAX_SAFE_INTEGER);
            if (parsed != null && parsed > 0) {
                amountArg = args[i];
                amountIndex = i;
                break;
            }
        }

        if (amountArg == null) {
            return message.reply('❌ Informe o **valor** (ex.: `5k`, `500`).');
        }

        const amount = lib.parseBet(amountArg, Number.MAX_SAFE_INTEGER);
        if (amount == null || amount <= 0) {
            return message.reply('❌ Valor inválido.');
        }

        const targets = new Map();
        for (const u of message.mentions.users.values()) {
            if (!u.bot) targets.set(u.id, u);
        }
        for (let i = 0; i < args.length; i++) {
            if (i === amountIndex) continue;
            if (isSnowflake(args[i])) {
                const u = await message.client.users.fetch(args[i]).catch(() => null);
                if (u && !u.bot) targets.set(u.id, u);
            }
        }

        if (!targets.size) {
            return message.reply('❌ Mencione pelo menos um usuário.');
        }

        const results = [];
        for (const user of targets.values()) {
            const before = lib.get(user.id);
            const after = lib.add(user.id, amount);
            results.push({ user, before, after });
        }

        const label = currency === 'flocos' ? '❄️ Flocos' : '💠 Cristais';
        const lines = results
            .slice(0, 20)
            .map(
                (r, i) =>
                    `**${i + 1}.** ${r.user} → ${beforeFmt(r.before)} → **${r.after.toLocaleString('pt-BR')}**`
            )
            .join('\n');

        function beforeFmt(n) {
            return n.toLocaleString('pt-BR');
        }

        const panel = getPanelBase();
        const embed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle(`${label} adicionados · ${results.length} usuário(s)`)
            .setDescription(
                `**+${amount.toLocaleString('pt-BR')}** para cada um · por **${message.author.username}**`
            )
            .addFields({ name: '📋 Resultado', value: lines.slice(0, 1024) || '—' })
            .setFooter({ text: 'O.saldo para ver · economia unificada' })
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
