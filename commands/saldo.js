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

module.exports = {
    name: 'saldo',
    description: 'Mostra o seu saldo atual de moedas.',
    async execute(message, args) {
        const balance = getBalance(message.author.id);
        await message.reply({ content: `💳 **${message.author.username}**, seu saldo atual é de **${balance} moedas**.` });
    }
};
