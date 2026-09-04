const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const eter = require('../utils/eter');
const store = require('../utils/store');

module.exports = {
    name: 'resgatar',
    aliases: ['redeem', 'codigo'],
    description: 'Resgatar código',
    data: new SlashCommandBuilder()
        .setName('resgatar-codigo')
        .setDescription('Resgatar codigo')
        .addStringOption((o) => o.setName('codigo').setDescription('Código').setRequired(true)),

    async execute(message, args) {
        const code = (args[0] || '').toUpperCase();
        if (!code) return message.reply('Uso: `O.resgatar <codigo>`');
        const codes = store.load('codes.json', {});
        const entry = codes[code];
        if (!entry || entry.usedBy?.includes(message.author.id)) {
            return message.reply('❌ Código inválido ou já usado.');
        }
        if (entry.max && (entry.usedBy?.length || 0) >= entry.max) {
            return message.reply('❌ Código esgotado.');
        }
        entry.usedBy = entry.usedBy || [];
        entry.usedBy.push(message.author.id);
        codes[code] = entry;
        store.save('codes.json', codes);
        const amount = entry.amount || 0;
        if (amount) eter.add(message.author.id, amount, { reason: 'code' });
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Código resgatado')
                    .setDescription(amount ? `✨ **+${amount.toLocaleString('pt-BR')}**` : 'Resgatado.')
            ]
        });
    },

    async executeSlash(i) {
        const code = String(i.options.getString('codigo', true)).toUpperCase();
        const codes = store.load('codes.json', {});
        const entry = codes[code];
        if (!entry || entry.usedBy?.includes(i.user.id)) {
            return i.reply({ content: '❌ Código inválido ou já usado.', ephemeral: true });
        }
        if (entry.max && (entry.usedBy?.length || 0) >= entry.max) {
            return i.reply({ content: '❌ Código esgotado.', ephemeral: true });
        }
        entry.usedBy = entry.usedBy || [];
        entry.usedBy.push(i.user.id);
        codes[code] = entry;
        store.save('codes.json', codes);
        const amount = entry.amount || 0;
        if (amount) eter.add(i.user.id, amount, { reason: 'code' });
        await i.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('Código resgatado')
                    .setDescription(amount ? `✨ **+${amount.toLocaleString('pt-BR')}**` : 'Resgatado.')
            ]
        });
    }
};
