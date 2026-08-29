const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
const { getSettings, setSettings } = require('../utils/settings');

const sessions = new Map();
const SETTINGS_KEYS = [
    'prefix', 'logs', 'welcome', 'leave', 'automod', 'tickets', 'music',
    'economy', 'xp', 'suggestions', 'reports', 'levels', 'starboard',
    'autorole', 'verification', 'antinuke'
];

function setup(client) {
    const app = express();
    const PORT = process.env.PORT || 10000;
    app.use(cookieParser());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '..', 'public')));

    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const REDIRECT_URI =
        process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`;

    function sessionUser(req) {
        return req.cookies?.sid ? sessions.get(req.cookies.sid) : null;
    }

    app.get('/', (req, res) => {
        res.type('html').send(`<!DOCTYPE html><html><body style="font-family:system-ui;background:#0a0a12;color:#eee;padding:2rem">
<h1>Aeternus</h1><p>Bot + painel</p>
<p><a href="/login" style="color:#a78bfa">Login Discord</a> ·
<a href="/dashboard" style="color:#a78bfa">Dashboard</a></p></body></html>`);
    });

    app.get('/login', (req, res) => {
        if (!CLIENT_ID) return res.status(500).send('CLIENT_ID missing');
        const url = new URL('https://discord.com/api/oauth2/authorize');
        url.searchParams.set('client_id', CLIENT_ID);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('redirect_uri', REDIRECT_URI);
        url.searchParams.set('scope', 'identify guilds');
        res.redirect(url.toString());
    });

    app.get('/auth/discord/callback', async (req, res) => {
        const code = req.query.code;
        if (!code) return res.redirect('/');
        try {
            const token = await (
                await fetch('https://discord.com/api/oauth2/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: CLIENT_ID,
                        client_secret: CLIENT_SECRET,
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: REDIRECT_URI
                    })
                })
            ).json();
            if (!token.access_token) return res.redirect('/?err=token');
            const user = await (
                await fetch('https://discord.com/api/users/@me', {
                    headers: { Authorization: `Bearer ${token.access_token}` }
                })
            ).json();
            const guilds = await (
                await fetch('https://discord.com/api/users/@me/guilds', {
                    headers: { Authorization: `Bearer ${token.access_token}` }
                })
            ).json();
            const sid = crypto.randomBytes(16).toString('hex');
            sessions.set(sid, { user, guilds: Array.isArray(guilds) ? guilds : [] });
            res.cookie('sid', sid, { httpOnly: true, maxAge: 7 * 864e5 });
            res.redirect('/dashboard');
        } catch (e) {
            console.error(e);
            res.redirect('/?err=auth');
        }
    });

    app.get('/logout', (req, res) => {
        if (req.cookies?.sid) sessions.delete(req.cookies.sid);
        res.clearCookie('sid');
        res.redirect('/');
    });

    app.get('/api/me', (req, res) => {
        const s = sessionUser(req);
        if (!s) return res.status(401).json({ error: 'auth' });
        res.json({ user: s.user });
    });

    app.get('/api/guilds', (req, res) => {
        const s = sessionUser(req);
        if (!s) return res.status(401).json({ error: 'auth' });
        const list = (s.guilds || [])
            .filter((g) => (BigInt(g.permissions || 0) & 8n) === 8n || g.owner)
            .filter((g) => client.guilds.cache.has(g.id))
            .map((g) => ({
                id: g.id,
                name: g.name,
                icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : null,
                memberCount: client.guilds.cache.get(g.id)?.memberCount || 0
            }));
        res.json({ guilds: list });
    });

    app.get('/api/guild/:id', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });
        res.json({
            id: guild.id,
            name: guild.name,
            settings: getSettings(guild.id),
            channels: guild.channels.cache
                .filter((c) => c.isTextBased() && !c.isThread())
                .map((c) => ({ id: c.id, name: c.name })),
            categories: guild.channels.cache
                .filter((c) => c.type === 4)
                .map((c) => ({ id: c.id, name: c.name })),
            roles: guild.roles.cache
                .filter((r) => r.id !== guild.id)
                .map((r) => ({ id: r.id, name: r.name }))
        });
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
        res.type('html').send(`<!DOCTYPE html><html><body style="font-family:system-ui;background:#0a0a12;color:#eee;padding:2rem">
<h1>Dashboard Aeternus</h1>
<div id="list">Carregando servidores…</div>
<p><a href="/logout" style="color:#a78bfa">Sair</a></p>
<script>
fetch('/api/guilds').then(r=>r.json()).then(d=>{
  const el=document.getElementById('list');
  if(!d.guilds?.length){el.textContent='Nenhum servidor (admin + bot).';return;}
  el.innerHTML=d.guilds.map(g=>'<p><b>'+g.name+'</b> — '+g.memberCount+' membros — ID '+g.id+'</p>').join('');
});
</script></body></html>`);
    });

    app.listen(PORT, () => console.log(`🌐 Painel na porta ${PORT}`));
}

module.exports = setup;
