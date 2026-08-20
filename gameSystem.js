// Sistema da Forja Aeterna
const fs = require('fs');

// Banco de dados simplificado em JSON
const DB_FILE = './gameData.json';

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ servers: {}, users: {} }));
}

function loadData() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ganho de Matéria Escura por mensagem no Discord
function handleChatMessage(serverId, userId) {
    let data = loadData();

    if (!data.servers[serverId]) {
        data.servers[serverId] = { darkMatter: 0, shield: 100, level: 1 };
    }
    if (!data.users[userId]) {
        data.users[userId] = { stardust: 0, energy: 50 };
    }

    // Ganho do Servidor e do Usuário
    data.servers[serverId].darkMatter += 2;
    data.users[userId].stardust += 1;

    saveData(data);
}

// Rota para a Dashboard consumir os dados do jogo
function registerGameRoutes(app) {
    app.get('/api/game-stats/:serverId', (req, res) => {
        const { serverId } = req.params;
        const data = loadData();
        const serverGame = data.servers[serverId] || { darkMatter: 0, shield: 100, level: 1 };

        res.json({
            success: true,
            darkMatter: serverGame.darkMatter,
            shield: serverGame.shield,
            level: serverGame.level
        });
    });
}

module.exports = { handleChatMessage, registerGameRoutes };
