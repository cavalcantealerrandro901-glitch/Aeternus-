const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const ecoFile = path.join(dataDir, 'economy.json');
const xpFile = path.join(dataDir, 'xp.json');
const cristaisFile = path.join(dataDir, 'cristais.json');
const permFile = path.join(dataDir, 'permissions.json');
const warnFile = path.join(dataDir, 'warnings.json');
const dailyFile = path.join(dataDir, 'daily.json');

function readJson(file) {
    if (!fs.existsSync(file)) return {};
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return {};
    }
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getAmount(file, userId) {
    const data = readJson(file);
    return data[userId] || 0;
}

function addAmount(file, userId, amount) {
    const data = readJson(file);
    const next = Math.max(0, Math.floor((data[userId] || 0) + Number(amount || 0)));
    data[userId] = next;
    writeJson(file, data);
    return next;
}

module.exports = {
    // ❄️ Flocos
    getBal(userId) {
        return getAmount(ecoFile, userId);
    },
    addBal(userId, amount) {
        return addAmount(ecoFile, userId, amount);
    },

    // ⭐ XP (total acumulado)
    getXp(userId) {
        return getAmount(xpFile, userId);
    },
    addXp(userId, amount) {
        return addAmount(xpFile, userId, amount);
    },

    // 🧊 Cristais de gelo
    getCristais(userId) {
        return getAmount(cristaisFile, userId);
    },
    addCristais(userId, amount) {
        return addAmount(cristaisFile, userId, amount);
    },

    getPerms() {
        const data = readJson(permFile);
        return data.allowed || [];
    },
    setPerm(userId, allow) {
        const data = readJson(permFile);
        if (!data.allowed) data.allowed = [];
        if (allow && !data.allowed.includes(userId)) data.allowed.push(userId);
        if (!allow) data.allowed = data.allowed.filter((id) => id !== userId);
        writeJson(permFile, data);
    },

    addWarn(userId, reason, moderator) {
        const data = readJson(warnFile);
        if (!data[userId]) data[userId] = [];
        data[userId].push({ reason, moderator, date: new Date().toLocaleDateString('pt-BR') });
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
