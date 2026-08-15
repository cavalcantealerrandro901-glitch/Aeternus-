const db = require('../utils/database');
const { parseAmount } = require('../utils/parser');

module.exports = {
    name: 'removemoney',
    async execute(message, args) {
        const allowed = db.getPerms();
        const isOwner = message.author.id === message.guild?.ownerId;
        
        // Verifica se quem executa possui permissão
        if (!isOwner && !allowed.includes(message.author.id) && !message.member.permissions.has('Administrator')) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const targetInput = args[0];
        const amountInput = args[1];

        if (!targetInput || !amountInput) {
            return message.reply('⚠️ Uso correto: `!removemoney @usuario/ID <quantidade>` (ex: `!removemoney @user 500k`)');
        }

        const targetId = targetInput.replace(/[<@!>]/g, '');
        const targetUser = await message.client.users.fetch(targetId).catch(() => null);

        if (!targetUser) {
            return message.reply('❌ Usuário não encontrado.');
        }

        const amount = parseAmount(amountInput);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Quantidade inválida! Exemplos aceitos: `1k`, `2.5m`, `23393k`, `12283877m`.');
        }

        const currentBal = db.getBal(targetUser.id);
        // Impede que o saldo fique negativo (remove no máximo o que o usuário possui)
        const removeAmount = amount > currentBal ? currentBal : amount;
        const newTotal = db.addBal(targetUser.id, -removeAmount);

        message.reply(`💀 Removido **${amountInput.toUpperCase()}** almas de **${targetUser.tag}**.\n💰 Saldo restante: **${newTotal.toLocaleString()}** almas.`);
    }
};
