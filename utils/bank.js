const store = require('./store');
function all() { return store.load('bank.json', {}); }
function get(userId) { return Number(all()[userId] || 0); }
function set(userId, amount) {
    const d = all();
    d[userId] = Math.max(0, Math.floor(Number(amount) || 0));
    store.save('bank.json', d);
    return d[userId];
}
function add(userId, amount) { return set(userId, get(userId) + Number(amount || 0)); }
function remove(userId, amount) { return set(userId, get(userId) - Number(amount || 0)); }
module.exports = { get, set, add, remove, all };
