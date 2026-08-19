const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'database.json');

function parseAmount(str) {
    if (!str) return null;
    str = str.trim().toLowerCase().replace(',', '.');
    let multiplier = 1;
    if (str.endsWith('k')) {
        multiplier = 1000;
        str = str.slice(0, -1);
    } else if (str.endsWith('m')) {
        multiplier = 1000000;
        str = str.slice(0, -1);
    } else if (str.endsWith('b')) {
        multiplier = 1000000000;
        str = str.slice(0, -1);
    }
    const num = parseFloat(str);
    if (isNaN(num)) return null;
    return Math.floor(num * multiplier);
}

function formatNumber(num) {
    return num.toLocaleString('en-US');
}

function addBalance(userId, amount) {
    try {
        let data = {};
        if (fs.existsSync(dbFile)) {
            data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        }
        if (!data[`user_${userId}`]) {
            data[`user_${userId}`] = { balance: 0 };
        }
        data[`user_${userId}`].balance += amount;
        fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
        return data[`user_${userId}`].balance;
    } catch (e) {
        return null;
    }
}

module.exports = {
    name: 'addmoney',
    description: 'Adiciona moedas (ex: 1.5k, 10k, 1m).',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ content: '❌ Você não tem permissão para usar este comando!' });
        }

        const targetUser = message.mentions.users.first();
        const rawAmount = args[1];

        if (!targetUser || !rawAmount) {
            return message.reply({ content: '⚠️ Uso incorreto! Exemplo: `!addmoney @usuario 1.5k` ou `!addmoney @usuario 5000`' });
        }

        const amount = parseAmount(rawAmount);
        if (amount === null || amount <= 0) {
            return message.reply({ content: '❌ Quantidade inválida! Use números ou abreviações válidas (ex: `500`, `1.5k`, `2m`).' });
        }

        const newBalance = addBalance(targetUser.id, amount);
        if (newBalance === null) {
            return message.reply({ content: '❌ Erro ao atualizar o banco de dados.' });
        }

        await message.reply({
            content: `✅ Adicionado **${formatNumber(amount)} moedas** para **${targetUser.username}**. Novo saldo: **${formatNumber(newBalance)} moedas**.`
        });
    }
};
