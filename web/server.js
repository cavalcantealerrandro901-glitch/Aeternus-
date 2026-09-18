const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { getSettings, setSettings, getPrefix } = require('../utils/settings');
const pvpArena = require('../utils/pvpArena');

const PORT = process.env.PORT || 10000;
const CLIENT_ID = process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const REDIRECT_URI =
    process.env.OAUTH_REDIRECT_URI ||
    process.env.REDIRECT_URI ||
    '';

const sessions = new Map();

function sessionUser(req) {
    const sid = req.cookies?.sid;
    if (!sid) return null;
    return sessions.get(sid) || null;
}

function setup(client) {
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '..', 'public')));

    console.log('[web] OAuth redirect:', REDIRECT_URI || '(não definido)');

    app.get('/login', (req, res) => {
        if (!CLIENT_ID || !REDIRECT_URI) {
            return res.status(500).send('OAuth não configurado (CLIENT_ID / REDIRECT_URI).');
        }
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: 'identify guilds'
        });
        res.redirect('https://discord.com/api/oauth2/authorize?' + params.toString());
    });

    app.get('/auth/discord/callback', async (req, res) => {
        try {
            const code = req.query.code;
            if (!code) return res.redirect('/login');
            const body = new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: String(code),
                redirect_uri: REDIRECT_URI
            });
            const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const token = await tokenRes.json();
            if (!token.access_token) return res.redirect('/login');
            const meRes = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: 'Bearer ' + token.access_token }
            });
            const me = await meRes.json();
            const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: 'Bearer ' + token.access_token }
            });
            const guilds = await guildsRes.json();
            const sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
            sessions.set(sid, { user: me, guilds: Array.isArray(guilds) ? guilds : [], access: token.access_token });
            res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 864e5 });
            res.redirect('/dashboard');
        } catch (e) {
            console.error('[web] oauth', e.message);
            res.redirect('/login');
        }
    });

    app.get('/logout', (req, res) => {
        const sid = req.cookies?.sid;
        if (sid) sessions.delete(sid);
        res.clearCookie('sid');
        res.redirect('/login');
    });

    app.get('/api/me', (req, res) => {
        const u = sessionUser(req);
        if (!u) return res.status(401).json({ error: 'auth' });
        res.json({ user: u.user, guilds: u.guilds });
    });

    app.get('/api/guild/:id', (req, res) => {
        const u = sessionUser(req);
        if (!u) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });
        const s = getSettings(guild.id);
        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 128 }),
            prefix: getPrefix(guild.id),
            settings: s
        });
    });

    app.post('/api/guild/:id/prefix', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });
        const prefix = String(req.body?.prefix || '').slice(0, 8);
        if (!prefix) return res.status(400).json({ error: 'prefix' });
        try {
            setSettings(guild.id, { prefix });
            return res.json({ ok: true, prefix });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/guild/:id/settings', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });
        try {
            const s = setSettings(guild.id, req.body || {});
            return res.json({ ok: true, settings: s });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/guild/:id/drops', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });
        const body = req.body || {};
        const extraEntries = Array.isArray(body.extraEntries)
            ? body.extraEntries.map((e) => ({
                  roleId: String(e.roleId || ''),
                  entries: Math.max(0, Math.floor(Number(e.entries) || 0)),
                  label: String(e.label || e.name || '').slice(0, 64)
              }))
            : [];
        const requirements = {
            minLevel: Math.max(0, Math.floor(Number(body.minLevel) || 0)),
            blockedRoleIds: Array.isArray(body.blockedRoleIds) ? body.blockedRoleIds.map(String) : [],
            requiredRoleIds: Array.isArray(body.requiredRoleIds) ? body.requiredRoleIds.map(String) : [],
            bypassRoleIds: Array.isArray(body.bypassRoleIds) ? body.bypassRoleIds.map(String) : []
        };
        const drops = {
            enabled: body.enabled !== false,
            channelId: body.channelId || null,
            requirements,
            extraEntries
        };
        try {
            const s = setSettings(guild.id, { drops });
            return res.json({ ok: true, drops: s.drops });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/guild/:id/partnership', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });
        const body = req.body || {};
        const partnership = {
            enabled: body.enabled !== false,
            channelId: body.channelId || null,
            roleId: body.roleId || null,
            notifyRoleId: body.notifyRoleId || null,
            phrase: body.phrase || '',
            image: body.image || null
        };
        try {
            const s = setSettings(guild.id, { partnership });
            return res.json({ ok: true, partnership: s.partnership });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    });

    app.get('/pvp/:id', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'pvp-game.html'));
    });

    app.get('/api/pvp/:id', (req, res) => {
        const fight = pvpArena.getArena(req.params.id);
        if (!fight) return res.status(404).json({ error: 'not found' });
        const as = req.query.as || sessionUser(req)?.user?.id || null;
        return res.json(pvpArena.publicState(fight, as));
    });

    app.post('/api/pvp/:id/move', (req, res) => {
        const fight = pvpArena.getArena(req.params.id);
        if (!fight) return res.status(404).json({ ok: false, error: 'Arena não encontrada.' });
        const body = req.body || {};
        const session = sessionUser(req);
        let playerId = body.playerId || null;
        if (session?.user?.id) {
            const sid = String(session.user.id);
            if (sid === String(fight.a.id) || sid === String(fight.b.id)) {
                playerId = sid;
            }
        }
        if (!playerId) {
            return res.status(400).json({ ok: false, error: 'Informe playerId.' });
        }
        if (String(playerId) !== String(fight.a.id) && String(playerId) !== String(fight.b.id)) {
            return res.status(403).json({ ok: false, error: 'Você não está neste duelo.' });
        }
        const result = pvpArena.applyMove(req.params.id, playerId, body.move);
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.get('/dashboard', (req, res) => {
        if (!sessionUser(req)) return res.redirect('/login');
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    app.get('/', (req, res) => res.redirect('/dashboard'));

    const tryListen = (port, attempts = 0) => {
        const server = app.listen(port, () => {
            console.log('Painel na porta', port);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE' && attempts < 15) tryListen(port + 1, attempts + 1);
            else console.error('Painel não iniciou:', err.message);
        });
    };
    tryListen(Number(PORT) || 10000);
}

module.exports = setup;
