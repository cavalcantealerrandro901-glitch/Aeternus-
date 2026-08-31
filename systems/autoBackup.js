const backup = require('../utils/backup');

function setup(client) {
    backup.startAutoBackup();
    client.backup = backup;
}

module.exports = { setup };
