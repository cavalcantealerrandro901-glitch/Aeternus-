const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'database.json');

function getBalance(userId) {
    try {
        if (!fs.existsSync(dbFile)) return 0;
        const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        return data[`user_${userId}`]?.balance || 0;
    } catch (e) { return 0; }
}

function formatNumber(num) {
    return num.toLocaleString('en-US');
}

module.exports = {
    name: 'atm',
    description: 'Mostra o saldo de moedas.',
    async execute(message, args) {
        const targetUser = message.mentions.users.first() || message.author;
        const balance = getBalance(targetUser.id);
        const formattedBalance = formatNumber(balance);
        await message.reply({ content: `💳 Saldo de **${targetUser.username}**: **${formattedBalance} moedas**.` });
    }
};
