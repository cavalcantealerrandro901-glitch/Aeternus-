const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

/** @type {Map<string, {user: object, access: string, exp: number}>} */
const sessions = new Map();

function cleanSessions() {
    const now = Date.now();
    for (const [k, v] of sessions) {
        if (!v || v.exp < now) sessions.delete(k);
    }
}
setInterval(cleanSessions, 60 * 60 * 1000).unref?.();

const store = require('../utils/store');
const { mountReactionRoutes, getSettings, setSettings } = require('./reactionRoutes');

const CLIENT_ID = () => process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = () => process.env.CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET;
const SESSION_SECRET = () => process.env.SESSION_SECRET || process.env.TOKEN || 'aeternus-dev';

const SETTINGS_KEYS = [
    'welcomeChannel',
    'goodbyeChannel',
    'logChannel',
    'autorole',
    'prefix',
    'shop',
    'modules'
];

function setup(client) {
    const app = express();
    const PORT = process.env.PORT || 10000;

    app.use(cookieParser(SESSION_SECRET()));
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, '..', 'public')));

    const publicBase =
        (process.env.REDIRECT_URI &&
            process.env.REDIRECT_URI.replace(/\/auth\/discord\/callback\/?$/, '')) ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.PUBLIC_URL ||
        `http://localhost:${PORT}`;
    const REDIRECT_URI =
        process.env.REDIRECT_URI ||
        `${String(publicBase).replace(/\/$/, '')}/auth/discord/callback`;
    console.log('[web] OAuth redirect:', REDIRECT_URI);

    function sessionUser(req) {
        try {
            const sid =
                req.signedCookies?.aeternus_sid ||
                req.cookies?.aeternus_sid ||
                null;
            if (!sid) return null;
            const s = sessions.get(String(sid));
            if (!s || s.exp < Date.now()) {
                if (sid) sessions.delete(String(sid));
                return null;
            }
            return s.user;
        } catch {
            return null;
        }
    }

    function createSession(user, accessToken) {
        cleanSessions();
        const sid = crypto.randomBytes(24).toString('hex');
        sessions.set(sid, {
            user,
            access: accessToken || null,
            exp: Date.now() + 7 * 864e5
        });
        return sid;
    }

    function setSessionCookie(res, sid) {
        res.cookie('aeternus_sid', sid, {
            signed: true,
            httpOnly: true,
            maxAge: 7 * 864e5,
            sameSite: 'lax',
            secure: true,
            path: '/'
        });
        res.clearCookie('aeternus_user', { path: '/' });
    }

    app.get('/api/health', (_req, res) => {
        res.json({
            ok: true,
            bot: client.user?.tag || null,
            guilds: client.guilds.cache.size,
            support: process.env.SUPPORT_SERVER_URL || process.env.DISCORD_SUPPORT || '',
            redirect: REDIRECT_URI
        });
    });

    app.get('/login', (req, res) => {
        if (sessionUser(req)) return res.redirect('/dashboard');
        const cid = CLIENT_ID();
        if (!cid) return res.status(500).send('CLIENT_ID não configurado');
        if (!CLIENT_SECRET()) {
            return res
                .status(500)
                .send('CLIENT_SECRET não configurado no Render (Environment)');
        }
        const urlConsent =
            `https://discord.com/api/oauth2/authorize?client_id=${cid}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&response_type=code&scope=identify%20guilds`;
        res.redirect(urlConsent);
    });

    app.get('/auth/discord/callback', async (req, res) => {
        const code = req.query.code;
        if (!code) {
            return res
                .status(400)
                .send(
                    'Login cancelado ou code ausente. Tente de novo em /login. Redirect esperado: ' +
                        REDIRECT_URI
                );
        }
        try {
            const body = new URLSearchParams({
                client_id: CLIENT_ID(),
                client_secret: CLIENT_SECRET(),
                grant_type: 'authorization_code',
                code: String(code),
                redirect_uri: REDIRECT_URI
            });
            const tokenRes = await axios.post(
                'https://discord.com/api/oauth2/token',
                body.toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            const access = tokenRes.data.access_token;
            const me = await axios.get('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${access}` }
            });
            const guilds = await axios.get('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${access}` }
            });
            const user = {
                id: me.data.id,
                username: me.data.username,
                avatar: me.data.avatar,
                guilds: (guilds.data || []).map((g) => ({
                    id: g.id,
                    name: g.name,
                    icon: g.icon
                }))
            };
            const sid = createSession(user, access);
            setSessionCookie(res, sid);
            res.redirect('/dashboard');
        } catch (e) {
            console.error('[web auth]', e.response?.data || e.message);
            const detail =
                e.response?.data?.error_description ||
                e.response?.data?.error ||
                e.message;
            res.status(500).send(
                'Auth falhou: ' +
                    detail +
                    '. Confira CLIENT_SECRET e Redirect no Developer Portal: ' +
                    REDIRECT_URI
            );
        }
    });

    app.get('/logout', (req, res) => {
        try {
            const sid =
                req.signedCookies?.aeternus_sid || req.cookies?.aeternus_sid;
            if (sid) sessions.delete(String(sid));
        } catch (_) {}
        res.clearCookie('aeternus_sid', { path: '/' });
        res.clearCookie('aeternus_user', { path: '/' });
        res.redirect('/');
    });

    app.get('/api/me', (req, res) => {
        const u = sessionUser(req);
        if (!u) return res.status(401).json({ error: 'auth' });
        res.json(u);
    });

    app.get('/api/guilds', (req, res) => {
        const u = sessionUser(req);
        if (!u) return res.status(401).json({ error: 'auth' });
        const botGuilds = new Set(client.guilds.cache.keys());
        res.json(
            (u.guilds || []).map((g) => ({
                ...g,
                botIn: botGuilds.has(g.id),
                memberCount: client.guilds.cache.get(g.id)?.memberCount || 0
            }))
        );
    });

    app.get('/api/guild/:id/settings', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        res.json(getSettings(req.params.id));
    });

    app.post('/api/guild/:id/shop/vips', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });

        const raw = Array.isArray(req.body?.vips) ? req.body.vips : [];
        const vips = raw
            .filter((v) => v && v.name && v.roleId)
            .map((v, i) => ({
                id: String(v.id || `vip_${Date.now()}_${i}`),
                name: String(v.name).slice(0, 64),
                desc: String(v.desc || 'Cargo VIP').slice(0, 120),
                price: Math.max(0, Math.floor(Number(v.price) || 0)),
                currency: 'eter',
                roleId: String(v.roleId),
                durationDays: Math.max(0, Math.floor(Number(v.durationDays) || 0))
            }));

        const settings = setSettings(guild.id, { shop: { enabled: true, vips } });
        res.json({ ok: true, vips: settings.shop.vips });
    });

    app.post('/api/guild/:id/settings', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });
        const patch = {};
        for (const k of SETTINGS_KEYS) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
        res.json({ ok: true, settings: setSettings(guild.id, patch) });
    });

    mountReactionRoutes(app, client, sessionUser);

    app.get('/dashboard', (req, res) => {
        if (!sessionUser(req)) return res.redirect('/login');
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    const tryListen = (port, attempts = 0) => {
        const server = app.listen(port, () => {
            console.log(`🌐 Painel na porta ${port}`);
            console.log('[web] OAuth redirect:', REDIRECT_URI);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE' && attempts < 15) {
                const next = port + 1;
                console.warn(`⚠️ Porta ${port} em uso — tentando ${next}…`);
                tryListen(next, attempts + 1);
            } else {
                console.error('🌐 Painel web não iniciou:', err.message);
            }
        });
    };
    tryListen(Number(PORT) || 10000);
}

module.exports = setup;
