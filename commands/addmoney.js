const db = require('../utils/database');
const { parseAmount } = require('../utils/parser');

module.exports = {
    name: 'addmoney',
    async execute(message, args) {
        const allowed = db.getPerms();
        const isOwner = message.author.id === message.guild?.ownerId;
        
        // Verifica se quem executa é o dono, administrador ou possui permissão concedida via /perm
        if (!isOwner && !allowed.includes(message.author.id) && !message.member.permissions.has('Administrator')) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const targetInput = args[0];
        const amountInput = args[1];

        if (!targetInput || !amountInput) {
            return message.reply('⚠️ Uso correto: `!addmoney @usuario/ID <quantidade>` (ex: `!addmoney @user 23393k`)');
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

        const newTotal = db.addBal(targetUser.id, amount);

        message.reply(`💀 Adicionado **${amountInput.toUpperCase()}** almas para **${targetUser.tag}**.\n💰 Saldo total: **${newTotal.toLocaleString()}** almas.`);
    }
};
