const map = new Map();
module.exports = {
    set(id, reason) { map.set(id, { reason: reason || 'AFK', at: Date.now() }); },
    get(id) { return map.get(id); },
    has(id) { return map.has(id); },
    clear(id) { map.delete(id); }
};
