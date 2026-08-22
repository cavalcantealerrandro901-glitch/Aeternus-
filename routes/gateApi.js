const sg = require('../utils/supremeGate');

function requireAuth(req, res, next) {
    if (req.session?.isAuthenticated) return next();
    return res.status(401).json({ error: 'Não autenticado' });
}

function register(app, client) {
    app.get('/api/gate/:guildId', requireAuth, (req, res) => {
        const cfg = sg.getConfig(req.params.guildId);
        const stats = sg.getStats(req.params.guildId);
        res.json({ success: true, config: cfg, stats });
    });

    app.post('/api/gate/:guildId', requireAuth, (req, res) => {
        const guildId = req.params.guildId;
        const body = req.body || {};
        if (!body.config) return res.status(400).json({ error: 'config obrigatório' });
        sg.setConfig(guildId, body.config);
        // flags legadas para compat
        const c = body.config;
        const settings = require('../utils/settings');
        settings.setKey(guildId, 'sgEnabled', !!c.enabled);
        if (c.welcome?.channelId) settings.setKey(guildId, 'sgChannel', c.welcome.channelId);
        if (c.logs?.channelId) settings.setKey(guildId, 'sgLogChannel', c.logs.channelId);
        if (c.roles?.visitorId) settings.setKey(guildId, 'sgVisitorRole', c.roles.visitorId);
        if (c.roles?.verifiedId) settings.setKey(guildId, 'sgVerifiedRole', c.roles.verifiedId);
        res.json({ success: true, config: sg.getConfig(guildId) });
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
