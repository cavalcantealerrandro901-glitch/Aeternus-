const logs = [];

function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    logs.unshift({ type, message, timestamp });
    if (logs.length > 50) logs.pop(); // Aumentado para 50 logs
}

module.exports = { logs, addLog };
