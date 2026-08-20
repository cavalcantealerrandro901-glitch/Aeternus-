const fs = require('fs');
const path = require('path');

const prefixesPath = path.join(__dirname, '..', 'prefixes.json');

function getPrefixes() {
    if (!fs.existsSync(prefixesPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(prefixesPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

function getPrefix(guildId) {
    if (!guildId) return '!';
    const prefixes = getPrefixes();
    return prefixes[guildId] || '!';
}

function setPrefix(guildId, newPrefix) {
    const prefixes = getPrefixes();
    prefixes[guildId] = newPrefix;
    fs.writeFileSync(prefixesPath, JSON.stringify(prefixes, null, 2));
    return newPrefix;
}

module.exports = { getPrefix, setPrefix };
