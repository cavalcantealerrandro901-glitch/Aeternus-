const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database.json');

// Garante que o arquivo JSON existe
function ensureDbExists() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ guilds: {} }, null, 2));
    }
}

function readDb() {
    ensureDbExists();
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data) || { guilds: {} };
    } catch (err) {
        console.error('Erro ao ler database.json:', err);
        return { guilds: {} };
    }
}

function writeDb(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Erro ao salvar database.json:', err);
    }
}

module.exports = {
    getGuildConfig(guildId) {
        const db = readDb();
        const config = db.guilds[guildId] || {};
        return {
            prefix: '!',
            ...config
        };
    },

    setGuildConfig(guildId, newConfig) {
        const db = readDb();
        const currentConfig = db.guilds[guildId] || {};
        
        // Mescla as configurações antigas mantendo tudo que já existia
        db.guilds[guildId] = {
            ...currentConfig,
            ...newConfig
        };

        writeDb(db);
        return db.guilds[guildId];
    }
};
