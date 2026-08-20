const { getPrefix, setPrefix, DEFAULT_PREFIX } = require('../utils/prefixManager');

/** API de prefixo por servidor — padrão O., livre no painel */
function register(app) {
    app.get('/api/prefix/:guildId', (req, res) => {
        res.json({ prefix: getPrefix(req.params.guildId), default: DEFAULT_PREFIX });
    });

    app.post('/api/prefix/:guildId', (req, res) => {
        if (!req.session?.isAuthenticated) {
            return res.status(401).json({ error: 'Não autenticado' });
        }
        const raw = req.body && req.body.prefix != null ? req.body.prefix : DEFAULT_PREFIX;
        const prefix = setPrefix(req.params.guildId, raw);
        res.json({ success: true, prefix });
    });
}

module.exports = register;
module.exports.register = register;
