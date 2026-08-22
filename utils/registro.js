const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'registros.json');

function read() {
    if (!fs.existsSync(FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch {
        return {};
    }
}

function write(data) {
    const dir = path.dirname(FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function add(guildId, entry) {
    const all = read();
    if (!all[guildId]) all[guildId] = [];
    const item = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ...entry,
        createdAt: Date.now()
    };
    all[guildId].unshift(item);
    // limita 100 por servidor
    if (all[guildId].length > 100) all[guildId] = all[guildId].slice(0, 100);
    write(all);
    return item;
}

function list(guildId, limit = 15) {
    const all = read();
    return (all[guildId] || []).slice(0, limit);
}

function remove(guildId, id) {
    const all = read();
    if (!all[guildId]) return false;
    const before = all[guildId].length;
    all[guildId] = all[guildId].filter((e) => e.id !== id);
    write(all);
    return all[guildId].length < before;
}

module.exports = { add, list, remove };
