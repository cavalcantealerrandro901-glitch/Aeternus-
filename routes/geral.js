const path = require('path');

/** Página de servidor individual */
function register(app) {
    app.get('/server/:guildId', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'server.html'));
    });
}

module.exports = register;
module.exports.register = register;
