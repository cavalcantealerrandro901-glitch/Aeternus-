const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const cristais = require('../utils/cristais');
const flocos = require('../utils/flocos');

module.exports = {
    name: 'removemoney',
    aliases: ['remcristais', 'remflocos', 'take'],
    description: 'Remove 💠 cristais ou ❄️ flocos',
    async execute(message, args) {
        if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Apenas **administradores**.');
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
        const target = message.mentions.users.first();
        const rawAmount = args.find((a) => !a.startsWith('<@'));

        if (!target || !rawAmount) {
            return message.reply('Uso: `O.removemoney [@] <valor>` ou `O.removemoney flocos @user 1k`');
        }

        const amount = lib.parseBet(rawAmount, Number.MAX_SAFE_INTEGER);
        if (amount == null || amount <= 0) return message.reply('❌ Valor inválido.');

        const before = lib.get(target.id);
        const after = lib.add(target.id, -amount);

        const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle(currency === 'flocos' ? '❄️ Flocos removidos' : '💠 Cristais removidos')
            .setDescription(
                `${target}: ${before.toLocaleString('pt-BR')} → **${after.toLocaleString('pt-BR')}**`
            );

        await message.reply({ embeds: [embed] });
    }
};
