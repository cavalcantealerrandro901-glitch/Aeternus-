const store = require('./store');
function all() { return store.load('cristais.json', {}); }
function get(userId) { return Number(all()[userId] || 0); }
function set(userId, amount) {
    const d = all();
    d[userId] = Math.max(0, Math.floor(Number(amount) || 0));
    store.save('cristais.json', d);
    return d[userId];
}
function add(userId, amount) { return set(userId, get(userId) + Number(amount || 0)); }
function remove(userId, amount) { return set(userId, get(userId) - Number(amount || 0)); }
function formatPlain(n) { return Number(n || 0).toLocaleString('pt-BR'); }
function format(n) { return `💠 **${formatPlain(n)}** cristais`; }
module.exports = { get, set, add, remove, format, formatPlain, all };
