const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const ecoFile = path.join(dataDir, 'economy.json');
const permFile = path.join(dataDir, 'permissions.json');
const warnFile = path.join(dataDir, 'warnings.json');
const dailyFile = path.join(dataDir, 'daily.json');

function readJson(file) {
    if (!fs.existsSync(file)) return {};
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
    getBal(userId) {
        const data = readJson(ecoFile);
        return data[userId] || 0;
    },
    addBal(userId, amount) {
        const data = readJson(ecoFile);
        data[userId] = (data[userId] || 0) + amount;
        writeJson(ecoFile, data);
        return data[userId];
    },
    getPerms() {
        const data = readJson(permFile);
        return data.allowed || [];
    },
    setPerm(userId, allow) {
        const data = readJson(permFile);
        if (!data.allowed) data.allowed = [];
        if (allow && !data.allowed.includes(userId)) data.allowed.push(userId);
        if (!allow) data.allowed = data.allowed.filter(id => id !== userId);
        writeJson(permFile, data);
    },
    addWarn(userId, reason, moderator) {
        const data = readJson(warnFile);
        if (!data[userId]) data[userId] = [];
        data[userId].push({ reason, moderator, date: new Date().toLocaleDateString() });
        writeJson(warnFile, data);
        return data[userId].length;
    },
    getWarns(userId) {
        const data = readJson(warnFile);
        return data[userId] || [];
    },
    getDaily(userId) {
        const data = readJson(dailyFile);
        return data[userId] || { streak: 0, lastClaimed: 0 };
    },
    setDaily(userId, streak, time) {
        const data = readJson(dailyFile);
        data[userId] = { streak, lastClaimed: time };
        writeJson(dailyFile, data);
    }
};
