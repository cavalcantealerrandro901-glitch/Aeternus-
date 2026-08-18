const settings = require('../utils/settings');

/** API de prefixo por servidor */
function register(app) {
    app.get('/api/prefix/:guildId', (req, res) => {
        const g = settings.getGuild(req.params.guildId);
        res.json({ prefix: g.prefix || '!' });
    });

    app.post('/api/prefix/:guildId', (req, res) => {
        if (!req.session?.isAuthenticated) {
            return res.status(401).json({ error: 'Não autenticado' });
        }
        const prefix = String((req.body && req.body.prefix) || '!').slice(0, 5);
        settings.setKey(req.params.guildId, 'prefix', prefix);
        res.json({ success: true, prefix });
    });
}

module.exports = register;
module.exports.register = register;
