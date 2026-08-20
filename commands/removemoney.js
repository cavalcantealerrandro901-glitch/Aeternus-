const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'database.json');

function parseAmount(str) {
    if (!str) return null;
    str = str.trim().toLowerCase().replace(',', '.');
    let multiplier = 1;
    if (str.endsWith('k')) { multiplier = 1000; str = str.slice(0, -1); }
    else if (str.endsWith('m')) { multiplier = 1000000; str = str.slice(0, -1); }
    else if (str.endsWith('b')) { multiplier = 1000000000; str = str.slice(0, -1); }
    const num = parseFloat(str);
    if (isNaN(num)) return null;
    return Math.floor(num * multiplier);
}

function formatNumber(num) {
    return num.toLocaleString('en-US');
}

function removeBalance(userId, amount) {
    try {
        let data = {};
        if (fs.existsSync(dbFile)) {
            data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        }
        if (!data[`user_${userId}`]) data[`user_${userId}`] = { balance: 0 };
        
        data[`user_${userId}`].balance = Math.max(0, data[`user_${userId}`].balance - amount);
        
        fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
        return data[`user_${userId}`].balance;
    } catch (e) { return null; }
}

module.exports = {
    name: 'removemoney',
    description: 'Remove cristais de um usuário.',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ content: '❌ Apenas administradores podem fazer isso.' });
        }

        const targetUser = message.mentions.users.first();
        const rawAmount = args[1];

        if (!targetUser || !rawAmount) {
            return message.reply({ content: '⚠️ Uso: `!removemoney @usuario 500`' });
        }

        const amount = parseAmount(rawAmount);
        const newBalance = removeBalance(targetUser.id, amount);

        await message.reply({
            content: `❄️ Removido **${formatNumber(amount)} cristais** de **${targetUser.username}**. Novo saldo: **${formatNumber(newBalance)} cristais**.`
        });
    }
};
