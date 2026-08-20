const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'database.json');

function loadData() {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveData(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function claimDaily(userId) {
    const db = loadData();
    if (!db[userId]) db[userId] = { balance: 0, lastDaily: 0 };

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const lastDaily = db[userId].lastDaily || 0;

    if (now - lastDaily < cooldown) {
        const remaining = cooldown - (now - lastDaily);
        return { success: false, remaining, balance: db[userId].balance };
    }

    const reward = 500;
    db[userId].balance = (db[userId].balance || 0) + reward;
    db[userId].lastDaily = now;
    saveData(db);

    return { success: true, reward, balance: db[userId].balance };
}

function getUserData(userId) {
    const db = loadData();
    return db[userId] || { balance: 0, lastDaily: 0 };
}

module.exports = { claimDaily, getUserData };
