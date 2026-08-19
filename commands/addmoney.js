const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'database.json');

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
        console.error(e);
        return null;
    }
}

module.exports = {
    name: 'addmoney',
    description: 'Adiciona moedas para um usuário (Apenas administradores).',
    async execute(message, args) {
        // Verifica se quem usou o comando é Administrador
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ content: '❌ Você não tem permissão para usar este comando!' });
        }

        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!targetUser || isNaN(amount)) {
            return message.reply({ content: '⚠️ Uso incorreto! Exemplo: `!addmoney @usuario 500`' });
        }

        const newBalance = addBalance(targetUser.id, amount);

        if (newBalance === null) {
            return message.reply({ content: '❌ Erro ao atualizar o banco de dados.' });
        }

        await message.reply({
            content: `✅ Adicionado **${amount} moedas** para **${targetUser.username}**. Novo saldo: **${newBalance} moedas**.`
        });
    }
};
