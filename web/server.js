const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
const { getSettings, setSettings } = require('../utils/settings');
const dropsUtil = require('../utils/drops');
const daily = require('../utils/daily');
const flocos = require('../utils/flocos');
const cristais = require('../utils/cristais');
const xp = require('../utils/xp');
const shop = require('../utils/shop');
const snapshot = require('../utils/userSnapshot');

const sessions = new Map();
const SETTINGS_KEYS = [
    'prefix', 'logs', 'welcome', 'leave', 'automod', 'tickets', 'music',
    'economy', 'xp', 'suggestions', 'reports', 'levels', 'starboard',
    'autorole', 'verification', 'antinuke', 'drops', 'shop'
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
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    app.get('/decoracoes', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'decoracoes.html'));
    });

    app.get('/itens', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'itens.html'));
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

            try {
                const avatarURL = user.avatar
                    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                    : null;
                snapshot.captureFromLive(user.id, {
                    username: user.username,
                    avatarURL,
                    discriminator: user.discriminator
                });
            } catch (e) {
                console.error('snapshot login:', e.message);
            }

            const sid = crypto.randomBytes(16).toString('hex');
            sessions.set(sid, { user, guilds: Array.isArray(guilds) ? guilds : [] });
            res.cookie('sid', sid, { httpOnly: true, maxAge: 7 * 864e5, sameSite: 'lax' });
            const next = req.cookies?.afterLogin || '/dashboard';
            res.clearCookie('afterLogin');
            res.redirect(next);
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
        const uid = s.user.id;

        let snap;
        try {
            const avatarURL = s.user.avatar
                ? `https://cdn.discordapp.com/avatars/${s.user.id}/${s.user.avatar}.png?size=128`
                : null;
            snap = snapshot.captureFromLive(uid, {
                username: s.user.username,
                avatarURL
            });
        } catch {
            snap = snapshot.getSnapshot(uid);
        }

        res.json({
            user: s.user,
            economy: {
                flocos: flocos.get(uid),
                cristais: cristais.get(uid),
                xp: xp.get(uid)
            },
            inventory: shop.getInv(uid),
            equippedDecoration: shop.getEquippedDecoration(uid),
            snapshot: snap,
            bot: client.user
                ? {
                      tag: client.user.tag,
                      id: client.user.id,
                      avatar: client.user.displayAvatarURL({ size: 128 })
                  }
                : null
        });
    });

    app.get('/api/user/:id/snapshot', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const snap = snapshot.getSnapshot(req.params.id);
        if (!snap) return res.status(404).json({ error: 'Sem snapshot (expirou ou nunca salvo).' });
        res.json(snap);
    });

    app.get('/api/shop/decorations', (req, res) => {
        const s = sessionUser(req);
        const items = shop.decorations();
        res.json({
            items,
            owned: s ? shop.getInv(s.user.id).owned : [],
            equipped: s ? shop.getInv(s.user.id).equipped : null
        });
    });

    app.get('/api/shop/items', (req, res) => {
        const s = sessionUser(req);
        const guildId = req.query.guild || null;
        const items = shop.items(guildId);
        res.json({
            items,
            owned: s ? shop.getInv(s.user.id).owned : [],
            equipped: s ? shop.getInv(s.user.id).equipped : null
        });
    });

    app.post('/api/shop/buy', (req, res) => {
        const s = sessionUser(req);
        if (!s) return res.status(401).json({ error: 'Faça login no Discord.' });
        const itemId = req.body?.itemId;
        const guildId = req.body?.guildId || null;
        const result = shop.buy(s.user.id, guildId, itemId);
        if (!result.ok) return res.status(400).json(result);
        snapshot.captureFromLive(s.user.id, {
            username: s.user.username
        });
        res.json({
            ok: true,
            item: result.item,
            gain: result.gain,
            gainCristais: result.gainCristais,
            boost: result.boost,
            balance: {
                flocos: flocos.get(s.user.id),
                cristais: cristais.get(s.user.id)
            },
            equipped: shop.getEquippedDecoration(s.user.id)
        });
    });

    app.post('/api/shop/equip', (req, res) => {
        const s = sessionUser(req);
        if (!s) return res.status(401).json({ error: 'Faça login no Discord.' });
        const result = shop.equip(s.user.id, req.body?.itemId);
        if (!result.ok) return res.status(400).json(result);
        snapshot.captureFromLive(s.user.id, { username: s.user.username });
        res.json({ ok: true, item: result.item });
    });

    app.get('/api/daily', (req, res) => {
        const s = sessionUser(req);
        if (!s) return res.status(401).json({ error: 'auth' });
        const guildId = req.query.guildId || null;
        res.json(daily.status(s.user.id, guildId));
    });

    app.post('/api/daily/claim', (req, res) => {
        const s = sessionUser(req);
        if (!s) return res.status(401).json({ error: 'auth' });
        const guildId = req.body?.guildId || null;
        const result = daily.claim(s.user.id, guildId);
        if (!result.ok) return res.status(400).json(result);
        snapshot.captureFromLive(s.user.id, { username: s.user.username });
        res.json(result);
    });

    app.get('/api/guilds', (req, res) => {
        const s = sessionUser(req);
        if (!s) return res.status(401).json({ error: 'auth' });
        const list = (s.guilds || [])
            .filter((g) => (BigInt(g.permissions || 0) & 8n) === 8n || g.owner)
            .filter((g) => client.guilds.cache.has(g.id))
            .map((g) => {
                const botG = client.guilds.cache.get(g.id);
                return {
                    id: g.id,
                    name: g.name,
                    icon: g.icon
                        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
                        : null,
                    memberCount: botG?.memberCount || 0
                };
            });
        res.json({ guilds: list });
    });

    app.get('/api/guild/:id', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });
        const activeDrops = dropsUtil
            .listActive()
            .filter((d) => d.guildId === guild.id)
            .map((d) => ({
                id: d.id,
                prize: d.prize?.label,
                winners: d.winners,
                endsAt: d.endsAt,
                channelId: d.channelId,
                autopix: !!d.autopix
            }));
        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 128 }),
            memberCount: guild.memberCount,
            settings: getSettings(guild.id),
            activeDrops,
            channels: [...guild.channels.cache.values()]
                .filter((c) => c.isTextBased() && !c.isThread())
                .sort((a, b) => a.rawPosition - b.rawPosition)
                .map((c) => ({ id: c.id, name: c.name })),
            categories: [...guild.channels.cache.values()]
                .filter((c) => c.type === 4)
                .map((c) => ({ id: c.id, name: c.name })),
            roles: [...guild.roles.cache.values()]
                .filter((r) => r.id !== guild.id)
                .sort((a, b) => b.position - a.position)
                .map((r) => ({ id: r.id, name: r.name, color: r.hexColor }))
        });
    });

    app.get('/api/guild/:id/shop', (req, res) => {
        if (!sessionUser(req)) return res.status(401).json({ error: 'auth' });
        const guild = client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: 'not found' });
        const settings = getSettings(guild.id);
        res.json({
            enabled: settings.shop?.enabled !== false,
            vips: settings.shop?.vips || [],
            catalog: shop.catalog(guild.id),
            globalItems: shop.GLOBAL_ITEMS
        });
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
                currency: v.currency === 'flocos' ? 'flocos' : 'cristais',
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

    app.listen(PORT, () => console.log(`🌐 Painel na porta ${PORT}`));
}

module.exports = setup;
