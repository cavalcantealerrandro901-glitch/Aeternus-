const sg = require('../utils/supremeGate');

function requireAuth(req, res, next) {
    if (req.session?.isAuthenticated) return next();
    return res.status(401).json({ error: 'Não autenticado' });
}

function register(app, client) {
    app.get('/api/gate/:guildId', requireAuth, (req, res) => {
        res.json({
            success: true,
            config: sg.getConfig(req.params.guildId),
            stats: sg.getStats(req.params.guildId)
        });
    });

    app.post('/api/gate/:guildId', requireAuth, (req, res) => {
        const body = req.body || {};
        if (!body.config) return res.status(400).json({ error: 'config obrigatório' });
        const cfg = sg.setConfig(req.params.guildId, body.config);
        res.json({ success: true, config: cfg });
    });

    app.post('/api/gate/:guildId/test', requireAuth, async (req, res) => {
        try {
            const guild = client.guilds.cache.get(req.params.guildId);
            if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
            const user = req.session.user;
            if (!user?.id) return res.status(401).json({ error: 'Sessão inválida' });
            const discordUser = await client.users.fetch(user.id);
            await sg.sendTest(guild, discordUser);
            res.json({ success: true });
        } catch (e) {
            res.status(400).json({ error: e.message || 'Falha no teste' });
        }
    });
}

module.exports = register;
module.exports.register = register;
