const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { getSettings, setSettings, getPrefix } = require('../utils/settings');
const pvpArena = require('../utils/pvpArena');
const rpgHub = require('../utils/rpgHub');
const player = require('../utils/player');
const xp = require('../utils/xp');

function startWeb(client) {
    const app = express();
    app.use(express.json({ limit: '2mb' }));
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

    app.get('/pvp/:id', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'pvp-game.html'));
    });

    app.get('/api/pvp/:id', (req, res) => {
        const fight = pvpArena.getArena(req.params.id);
        if (!fight) return res.status(404).json({ error: 'not found' });
        const as = req.query.as || null;
        return res.json(pvpArena.publicState(fight, as));
    });

    app.post('/api/pvp/:id/move', (req, res) => {
        const fight = pvpArena.getArena(req.params.id);
        if (!fight) return res.status(404).json({ error: 'not found' });
        const body = req.body || {};
        const playerId = body.playerId;
        if (!playerId) return res.status(400).json({ error: 'playerId' });
        const result = pvpArena.applyMove(req.params.id, playerId, body.move);
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.get('/rpg', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'rpg.html'));
    });

    app.post('/api/rpg/create', (req, res) => {
        try {
            const body = req.body || {};
            const userId = String(body.userId || '').trim();
            if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
            let name = String(body.name || 'Aventureiro').slice(0, 32);
            let classId = 'guerreiro';
            let className = 'Guerreiro';
            let emoji = '⚔️';
            let photo = null;
            let level = 0;
            try {
                const prof = player.get(userId);
                if (prof) {
                    name = prof.name || name;
                    classId = prof.classId || classId;
                    const cls = player.getClass(classId);
                    className = cls?.name || className;
                    emoji = cls?.emoji || emoji;
                    photo = prof.photoUrl || null;
                }
                level = Number(xp.get(userId).level || 0);
            } catch (_) {}
            const room = rpgHub.createRoom({
                id: userId,
                name,
                level,
                classId,
                className,
                emoji,
                photo
            });
            return res.json({ ok: true, code: room.code, room: rpgHub.publicRoom(room, userId) });
        } catch (e) {
            return res.status(500).json({ error: e.message || 'erro' });
        }
    });

    app.post('/api/rpg/join', (req, res) => {
        try {
            const body = req.body || {};
            const userId = String(body.userId || '').trim();
            const code = String(body.code || '').trim();
            if (!userId || !code) return res.status(400).json({ error: 'code e userId obrigatórios' });
            let name = String(body.name || 'Aventureiro').slice(0, 32);
            let classId = 'guerreiro';
            let className = 'Guerreiro';
            let emoji = '⚔️';
            let photo = null;
            let level = 0;
            try {
                const prof = player.get(userId);
                if (prof) {
                    name = prof.name || name;
                    classId = prof.classId || classId;
                    const cls = player.getClass(classId);
                    className = cls?.name || className;
                    emoji = cls?.emoji || emoji;
                    photo = prof.photoUrl || null;
                }
                level = Number(xp.get(userId).level || 0);
            } catch (_) {}
            const result = rpgHub.joinRoom(code, {
                id: userId,
                name,
                level,
                classId,
                className,
                emoji,
                photo
            });
            if (!result.ok) return res.status(400).json({ error: result.error });
            return res.json({ ok: true, room: rpgHub.publicRoom(result.room, userId) });
        } catch (e) {
            return res.status(500).json({ error: e.message || 'erro' });
        }
    });

    app.get('/api/rpg/room/:code', (req, res) => {
        const room = rpgHub.getRoom(req.params.code);
        if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
        const as = req.query.as || null;
        return res.json(rpgHub.publicRoom(room, as));
    });

    app.post('/api/rpg/chat', (req, res) => {
        const body = req.body || {};
        const result = rpgHub.chat(body.code, body.userId, body.text);
        if (!result.ok) return res.status(400).json({ error: result.error });
        return res.json({ ok: true, room: rpgHub.publicRoom(result.room, body.userId) });
    });

    app.post('/api/rpg/profile', (req, res) => {
        const body = req.body || {};
        const result = rpgHub.updateMemberProfile(body.code, body.userId, { name: body.name });
        if (!result.ok) return res.status(400).json({ error: result.error });
        return res.json({ ok: true, room: rpgHub.publicRoom(result.room, body.userId) });
    });

    app.post('/api/rpg/leave', (req, res) => {
        const body = req.body || {};
        rpgHub.leaveRoom(body.code, body.userId);
        return res.json({ ok: true });
    });

    app.post('/api/rpg/duel', (req, res) => {
        try {
            const body = req.body || {};
            const pvpCommand = require('../utils/pvpCommand');
            const lf =
                typeof pvpCommand.loadFighter === 'function'
                    ? pvpCommand.loadFighter
                    : (userId) => {
                          const prof = player.get(userId);
                          const st = xp.get(userId);
                          const attrs = xp.getAttrs(userId);
                          const cls = player.getClass(prof?.classId || 'guerreiro');
                          const con = attrs.constituicao || 10;
                          const maxHp = 50 + con * 40 + Math.floor((attrs.forca || 0) * 2);
                          const maxMana =
                              40 +
                              Math.floor((attrs.inteligencia || 10) * 12) +
                              Math.floor((attrs.espirito || 10) * 10) +
                              Math.floor((attrs.agilidade || 10) * 2);
                          return {
                              id: userId,
                              isBot: false,
                              name: prof?.name || 'Jogador',
                              level: st.level || 0,
                              classId: prof?.classId || 'guerreiro',
                              className: cls?.name || 'Guerreiro',
                              emoji: cls?.emoji || '⚔️',
                              photo: prof?.photoUrl || null,
                              attrs: { ...attrs, defesa: con, vida: con },
                              hp: maxHp,
                              maxHp,
                              mana: maxMana,
                              maxMana,
                              defending: false,
                              specialCd: 0
                          };
                      };
            const result = rpgHub.startDuel({
                code: body.code,
                aId: body.aId,
                bId: body.bId,
                bet: body.bet || 0,
                loadFighter: lf
            });
            if (!result.ok) return res.status(400).json({ error: result.error });
            return res.json({
                ok: true,
                room: rpgHub.publicRoom(result.room, body.aId),
                fightId: result.fightId,
                urlA: result.urlA,
                urlB: result.urlB
            });
        } catch (e) {
            return res.status(500).json({ error: e.message || 'erro no duelo' });
        }
    });

    app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    app.get('/', (req, res) => res.redirect('/dashboard'));

    const port = process.env.PORT || 10000;
    const server = app.listen(port, () => {
        console.log('Painel na porta', port);
        if (REDIRECT) console.log('[web] OAuth redirect:', REDIRECT);
    });
    return server;
}

// index.js usa: const startWeb = require('./web/server'); startWeb(client);
module.exports = startWeb;
module.exports.startWeb = startWeb;
