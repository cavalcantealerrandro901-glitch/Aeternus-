const backup = require('../utils/backup');

module.exports = (client) => {
    backup.startAutoBackup();
    client.backup = backup;
};
