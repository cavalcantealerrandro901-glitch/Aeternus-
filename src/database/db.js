const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');

function loadData() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, '{}');
    }
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (err) {
        return {};
    }
}

function saveData(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
    getGuildConfig: (guildId) => {
        const data = loadData();
        return data[guildId] || {};
    },
    setGuildConfig: (guildId, newConfig) => {
        const data = loadData();
        data[guildId] = { ...(data[guildId] || {}), ...newConfig };
        saveData(data);
        return data[guildId];
    }
};
