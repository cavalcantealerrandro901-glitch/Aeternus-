const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', '..', 'database.json');

// Função auxiliar para ler o banco de dados JSON
function readDb() {
    try {
        if (!fs.existsSync(dbFile)) {
            fs.writeFileSync(dbFile, JSON.stringify({}));
        }
        const data = fs.readFileSync(dbFile, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

// Função auxiliar para salvar no banco de dados JSON
function writeDb(data) {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

async function claimDaily(userId) {
    const rewardAmount = 500;

    const dbData = readDb();
    
    // Inicializa os dados do usuário se não existirem
    if (!dbData[`user_${userId}`]) {
        dbData[`user_${userId}`] = { balance: 0 };
    }

    // Adiciona a recompensa
    dbData[`user_${userId}`].balance += rewardAmount;
    
    writeDb(dbData);

    return {
        success: true,
        amount: rewardAmount,
        newBalance: dbData[`user_${userId}`].balance
    };
}

module.exports = { claimDaily };
