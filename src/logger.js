const logs = [];

function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    logs.unshift({ type, message, timestamp });
    if (logs.length > 15) logs.pop(); // Mantém apenas os últimos 15 logs
}

module.exports = { logs, addLog };
