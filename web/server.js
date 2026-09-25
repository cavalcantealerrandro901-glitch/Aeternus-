const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { getSettings, setSettings, getPrefix } = require('../utils/settings');
const player = require('../utils/player');
const xp = require('../utils/xp');
const { registerAvatarRoutes } = require('../utils/avatarApi');

function startWeb(client) {
    const app = express();
    app.use(express.json({ limit: '6mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '..', 'public')));

    const CLIENT_ID = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET;
    const REDIRECT =
        process.env.OAUTH_REDIRECT ||
        (process.env.RENDER_EXTERNAL_URL
            ? process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '') + '/auth/discord/callback'
            : null);

    app.get('/login', (req, res) => {
        if (!CLIENT_ID || !REDIRECT) {
            return res.status(500).send('OAuth não configurado');
        }
        const url =
            'https://discord.com/api/oauth2/authorize?client_id=' +
            CLIENT_ID +
            '&redirect_uri=' +
            encodeURIComponent(REDIRECT) +
            '&response_type=code&scope=identify%20guilds';
        res.redirect(url);
    });

    app.get('/auth/discord/callback', async (req, res) => {
        try {
            const code = req.query.code;
            if (!code) return res.redirect('/dashboard');
            const body = new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: String(code),
                redirect_uri: REDIRECT
            });
            const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const token = await tokenRes.json();
            if (!token.access_token) return res.redirect('/dashboard');
            res.cookie('discord_token', token.access_token, {
                httpOnly: true,
                maxAge: 7 * 24 * 3600 * 1000
            });
            res.redirect('/dashboard');
        } catch (e) {
            res.redirect('/dashboard');
        }
    });

    app.get('/logout', (req, res) => {
        res.clearCookie('discord_token');
        res.redirect('/dashboard');
    });

    app.get('/api/me', (req, res) => {
        res.json({ ok: true, bot: client?.user?.tag || null });
    });

    app.get('/api/guild/:id', (req, res) => {
        const g = client.guilds.cache.get(req.params.id);
        if (!g) return res.status(404).json({ error: 'guild' });
        const settings = getSettings(req.params.id);
        res.json({
            id: g.id,
            name: g.name,
            prefix: getPrefix(req.params.id),
            settings
        });
    });

    app.post('/api/guild/:id/prefix', (req, res) => {
        const prefix = String(req.body?.prefix || 'O.').slice(0, 8);
        setSettings(req.params.id, { prefix });
        res.json({ ok: true, prefix });
    });

    app.post('/api/guild/:id/settings', (req, res) => {
        setSettings(req.params.id, req.body || {});
        res.json({ ok: true });
    });

    app.post('/api/guild/:id/drops', (req, res) => {
        res.json({ ok: true });
    });

    app.post('/api/guild/:id/partnership', (req, res) => {
        res.json({ ok: true });
    });

    // —— Arena & Masmorra ——
    const arenaEngine = require('../utils/arenaEngine');
    const dungeon = require('../utils/dungeon');

    app.get('/arena', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'arena.html'));
    });

    app.get('/api/arena/:id', (req, res) => {
        const match = arenaEngine.getMatch(req.params.id);
        if (!match) return res.status(404).json({ error: 'Arena não encontrada' });
        return res.json(arenaEngine.publicState(match, req.query.as || null));
    });

    app.post('/api/arena/:id/move', (req, res) => {
        const body = req.body || {};
        const result = arenaEngine.applyMove(req.params.id, body.playerId, {
            moveId: body.moveId,
            targetId: body.targetId
        });
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.post('/api/arena/create', (req, res) => {
        const body = req.body || {};
        const teamA = Array.isArray(body.teamA) ? body.teamA : [body.aId].filter(Boolean);
        const teamB = Array.isArray(body.teamB) ? body.teamB : [body.bId].filter(Boolean);
        const result = arenaEngine.createMatch({ mode: body.mode, teamA, teamB, bet: body.bet });
        if (!result.ok) return res.status(400).json(result);
        return res.json({
            ok: true,
            id: result.match.id,
            state: arenaEngine.publicState(result.match, body.as || teamA[0])
        });
    });

    app.get('/api/dungeon/:id', (req, res) => {
        const match = dungeon.getDungeonMatch(req.params.id);
        if (!match) return res.status(404).json({ error: 'Masmorra não encontrada' });
        return res.json(dungeon.publicDungeon(match, req.query.as || null));
    });

    app.post('/api/dungeon/:id/move', (req, res) => {
        const body = req.body || {};
        const result = dungeon.applyDungeonMove(req.params.id, body.playerId, {
            moveId: body.moveId,
            targetId: body.targetId
        });
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.post('/api/dungeon/start', (req, res) => {
        const body = req.body || {};
        const result = dungeon.startFloor(body.userId, body.floor);
        if (!result.ok) return res.status(400).json(result);
        return res.json({
            ok: true,
            id: result.match.id,
            state: dungeon.publicDungeon(result.match, body.userId)
        });
    });

    app.post('/api/arena/:id/chat', (req, res) => {
        const body = req.body || {};
        const result = arenaEngine.postChat(req.params.id, body.playerId, body.text);
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.post('/api/dungeon/:id/chat', (req, res) => {
        const body = req.body || {};
        const result = dungeon.postDungeonChat(req.params.id, body.playerId, body.text);
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.post('/api/dungeon/:id/advance', (req, res) => {
        const body = req.body || {};
        const result = dungeon.advanceFloor(req.params.id, body.playerId || body.userId);
        if (!result.ok) return res.status(400).json(result);
        return res.json({
            ok: true,
            id: result.match.id,
            match: dungeon.publicDungeon(result.match, body.playerId || body.userId)
        });
    });

    // Avatar
    app.get('/avatar', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'avatar.html'));
    });

    app.get('/api/avatar/:userId', (req, res) => {
        try {
            const av = player.getBattleAvatar
                ? player.getBattleAvatar(req.params.userId)
                : (player.get(req.params.userId) || {}).battleAvatar || null;
            return res.json({ ok: true, avatar: av });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    });

    registerAvatarRoutes(app);

    app.post('/api/avatar/save', (req, res) => {
        try {
            const body = req.body || {};
            const userId = String(body.userId || '').trim();
            if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
            if (!player.has(userId)) {
                return res
                    .status(400)
                    .json({ error: 'Crie o personagem no bot primeiro (O.j criar).' });
            }
            const saved = player.setBattleAvatar(userId, body.avatar || {});
            if (!saved) return res.status(400).json({ error: 'Falha ao salvar' });
            return res.json({ ok: true, avatar: saved.battleAvatar });
        } catch (e) {
            return res.status(500).json({ error: e.message || 'erro' });
        }
    });

    app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    app.get('/', (req, res) => res.redirect('/dashboard'));

        app.get('/health', (req, res) => {
        const mongo = (() => {
            try {
                const { isConnected } = require('../utils/mongo');
                return isConnected();
            } catch (_) {
                return false;
            }
        })();
        res.status(200).json({
            ok: true,
            service: 'aeternus',
            mongo,
            uptime: process.uptime()
        });
    });

const port = process.env.PORT || 10000;
    const host = process.env.HOST || '0.0.0.0';
    const server = app.listen(port, host, () => {
        console.log('Painel em http://' + host + ':' + port);
        if (REDIRECT) console.log('[web] OAuth redirect:', REDIRECT);
    });
    return server;
}

module.exports = startWeb;
module.exports.startWeb = startWeb;
