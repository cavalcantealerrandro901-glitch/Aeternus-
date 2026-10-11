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
        .addStringOption((o) => o.setName('codigo').setDescription('Código de resgate').setRequired(true).setMaxLength(64)),

    async execute(message, args) {
        const code = String(args[0] || '').trim().toUpperCase();
        if (!code) return message.reply('Uso: `O.resgatar <codigo>`');
        const codes = store.load('codes.json', {});
        const entry = codes[code];
        if (!code || !entry || (Array.isArray(entry.usedBy) && entry.usedBy.includes(message.author.id))) {
            return message.reply('❌ Código inválido ou já usado.');
        }
        if (entry.max && (Array.isArray(entry.usedBy) ? entry.usedBy.length : 0) >= entry.max) {
            return message.reply('❌ Código esgotado.');
        }
        if (!Number.isSafeInteger(Number(entry.amount || 0)) || Number(entry.amount || 0) < 0) {
            return message.reply('❌ Este código está configurado incorretamente. Avise a equipe.');
        }
        entry.usedBy = Array.isArray(entry.usedBy) ? entry.usedBy : [];
        entry.usedBy.push(message.author.id);
        codes[code] = entry;
        store.save('codes.json', codes);
        const amount = entry.amount || 0;
        if (amount) eter.add(message.author.id, amount, { reason: 'code' });
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x22c55e)
                    .setTitle('🎁 Código resgatado')
                    .setDescription(amount ? `Você recebeu **✨ ${amount.toLocaleString('pt-BR')} éter**.` : 'O código foi resgatado com sucesso.')
                    .setFooter({ text: 'Aeternus Economy · Resgate confirmado' })
                    .setTimestamp()
            ]
        });
    },

    async executeSlash(i) {
        const code = String(i.options.getString('codigo', true)).trim().toUpperCase();
        const codes = store.load('codes.json', {});
        const entry = codes[code];
        if (!code || !entry || (Array.isArray(entry.usedBy) && entry.usedBy.includes(i.user.id))) {
            return i.reply({ content: '❌ Código inválido ou já usado.', ephemeral: true });
        }
        if (entry.max && (entry.usedBy?.length || 0) >= entry.max) {
            return i.reply({ content: '❌ Código esgotado.', ephemeral: true });
        }
        if (!Number.isSafeInteger(Number(entry.amount || 0)) || Number(entry.amount || 0) < 0) {
            return i.reply({ content: '❌ Este código está configurado incorretamente. Avise a equipe.', ephemeral: true });
        }
        entry.usedBy = Array.isArray(entry.usedBy) ? entry.usedBy : [];
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
