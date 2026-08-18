const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'settings.json');

function readAll() {
    if (!fs.existsSync(FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(FILE, 'utf8') || '{}');
    } catch {
        return {};
    }
}

function writeAll(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getGuild(guildId) {
    const all = readAll();
    return all[guildId] || {};
}

function setGuild(guildId, patch) {
    const all = readAll();
    all[guildId] = { ...(all[guildId] || {}), ...patch };
    writeAll(all);
    return all[guildId];
}

function setKey(guildId, key, value) {
    const all = readAll();
    if (!all[guildId]) all[guildId] = {};
    all[guildId][key] = value;
    writeAll(all);
    return all[guildId];
}

/** Compatível com handlers: getSettings(guildId) */
async function getSettings(guildId) {
    return getGuild(guildId);
}

module.exports = {
    readAll,
    writeAll,
    getGuild,
    setGuild,
    setKey,
    getSettings
};
