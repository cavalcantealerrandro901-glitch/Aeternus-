const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const store = require('../utils/store');

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

    const REDIRECT_URI =
        process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`;

    function sessionUser(req) {
        try {
            const raw = req.signedCookies?.aeternus_user;
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function setSettings(guildId, patch) {
        const all = store.load('guild_settings.json', {});
        all[guildId] = { ...(all[guildId] || {}), ...patch, updatedAt: Date.now() };
        store.save('guild_settings.json', all);
        return all[guildId];
    }

    function getSettings(guildId) {
        const all = store.load('guild_settings.json', {});
        return all[guildId] || {};
    }

    app.get('/api/health', (_req, res) => {
        res.json({
            ok: true,
            bot: client.user?.tag || null,
            guilds: client.guilds.cache.size,
            support: process.env.SUPPORT_SERVER_URL || process.env.DISCORD_SUPPORT || ''
        });
    });

    app.get('/login', (_req, res) => {
        const cid = CLIENT_ID();
        if (!cid) return res.status(500).send('CLIENT_ID não configurado');
        const url =
            `https://discord.com/api/oauth2/authorize?client_id=${cid}` +
            `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&response_type=code&scope=identify%20guilds`;
        res.redirect(url);
    });

    app.get('/auth/discord/callback', async (req, res) => {
        const code = req.query.code;
        if (!code) return res.status(400).send('code missing');
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
                guilds: (guilds.data || []).map((g) => ({ id: g.id, name: g.name, icon: g.icon }))
            };
            res.cookie('aeternus_user', JSON.stringify(user), {
                signed: true,
                httpOnly: true,
                maxAge: 7 * 864e5
            });
            res.redirect('/dashboard');
        } catch (e) {
            console.error('[web auth]', e.message);
            res.status(500).send('Auth falhou');
        }
    });

    app.get('/logout', (req, res) => {
        res.clearCookie('aeternus_user');
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
                botIn: botGuilds.has(g.id)
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

    app.get('/dashboard', (req, res) => {
        if (!sessionUser(req)) return res.redirect('/login');
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    const tryListen = (port, attempts = 0) => {
        const server = app.listen(port, () => {
            console.log(`🌐 Painel na porta ${port}`);
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
