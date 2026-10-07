const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { getSettings, setSettings, getPrefix } = require('../utils/settings');
const player = require('../utils/player');
const xp = require('../utils/xp');
const { registerAvatarRoutes } = require('../utils/avatarApi');
const { registerEditorRoutes } = require('./editorRoutes');
const { setupAuth, requireAuth, requireGuildManager, fetchGuildsForSession } = require('./auth');

function startWeb(client) {
    const app = express();
    app.use(express.json({ limit: '6mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    const publicDir = path.join(__dirname, '..', 'public');

    app.use((req, res, next) => {
        if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html') || !path.extname(req.path))) {
            let fileName = req.path === '/' ? 'index.html' : req.path;
            if (!fileName.endsWith('.html')) fileName += '.html';
            let filePath = path.join(publicDir, fileName);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                let content = fs.readFileSync(filePath, 'utf8');
                if (!content.includes('dashboard.css')) {
                    content = content.replace('</head>', '    <link rel="stylesheet" href="dashboard.css">\n</head>');
                }
                if (!content.includes('dashboard-app.js')) {
                    content = content.replace('</body>', '    <script src="dashboard-app.js"></script>\n</body>');
                }
                res.setHeader('Content-Type', 'text/html');
                return res.send(content);
            }
        }
        next();
    });

    app.use(express.static(publicDir));

    const CLIENT_ID = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET;
    const REDIRECT =
        process.env.OAUTH_REDIRECT ||
        (process.env.RENDER_EXTERNAL_URL
            ? process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '') + '/auth/discord/callback'
            : null);

    setupAuth(app, client);

    app.get('/api/dashboard/guilds', requireAuth, async (req, res) => { try { const guilds = req.auth.session.guilds || await fetchGuildsForSession(req.auth.session); const list = guilds.filter(g => { const p = BigInt(String(g.permissions || '0')); const ADMINISTRATOR = 1n << 3n; const MANAGE_GUILD = 1n << 5n; return client.guilds.cache.has(g.id) && (((p & ADMINISTRATOR) !== 0n) || ((p & MANAGE_GUILD) !== 0n)); }).map(g => ({ id: g.id, name: g.name, icon: g.icon || null })); return res.json({ ok: true, guilds: list }); } catch (_) { return res.status(500).json({ ok: false, error: 'guilds_failed' }); } });

    app.get('/api/dashboard/guild/:id/daily', requireGuildManager, (req, res) => {
        const settings = getSettings(req.params.id);
        const min = Math.max(0, Math.floor(Number(settings.economy?.dailyMin) || 0));
        const max = Math.max(min, Math.floor(Number(settings.economy?.dailyMax) || min));
        return res.json({ ok: true, dailyMin: min, dailyMax: max });
    });

    app.post('/api/dashboard/guild/:id/daily', requireGuildManager, (req, res) => {
        const body = req.body || {};
        const min = Math.max(0, Math.floor(Number(body.dailyMin)));
        const max = Math.max(min, Math.floor(Number(body.dailyMax)));
        if (!Number.isFinite(min) || !Number.isFinite(max) || max > 100000000) {
            return res.status(400).json({ ok: false, error: 'Valores de daily inválidos.' });
        }
        const settings = setSettings(req.params.id, {
            economy: { dailyMin: min, dailyMax: max }
        });
        return res.json({
            ok: true,
            dailyMin: settings.economy.dailyMin,
            dailyMax: settings.economy.dailyMax
        });
    });

    app.get('/api/dashboard/guild/:id/shop', requireGuildManager, (req, res) => {
        const settings = getSettings(req.params.id);
        const shop = settings.shop || {};
        return res.json({
            ok: true,
            enabled: shop.enabled !== false,
            vipCount: Array.isArray(shop.vips) ? shop.vips.length : 0
        });
    });

    app.post('/api/dashboard/guild/:id/shop', requireGuildManager, (req, res) => {
        const enabled = req.body?.enabled !== false;
        const settings = setSettings(req.params.id, { shop: { enabled } });
        return res.json({
            ok: true,
            enabled: settings.shop?.enabled !== false
        });
    });

    app.get('/api/dashboard/guild/:id/drops', requireGuildManager, (req, res) => {
        const g = client.guilds.cache.get(req.params.id);
        if (!g) return res.status(404).json({ ok: false, error: 'Servidor não encontrado.' });
        const settings = getSettings(req.params.id);
        const d = settings.drops || {};
        return res.json({
            ok: true,
            enabled: d.enabled !== false,
            channelId: d.channelId || null,
            activationPrefix: d.activationPrefix || settings.prefix || 'O.',
            embedColor: d.embedColor || '#8B5CF6',
            winnerMessage: d.winnerMessage || '',
            winnerDm: d.winnerDm !== false,
            templateId: d.templateId || 'default',
            templates: Array.isArray(d.templates) ? d.templates : [],
            requirements: d.requirements || {},
            extraEntries: Array.isArray(d.extraEntries) ? d.extraEntries : [],
            channels: g.channels.cache
                .filter(ch => ch.isTextBased?.())
                .map(ch => ({ id: ch.id, name: ch.name }))
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
            roles: g.roles.cache
                .filter(r => r.id !== g.id)
                .map(r => ({ id: r.id, name: r.name, position: r.position, color: r.hexColor }))
                .sort((a, b) => b.position - a.position)
        });
    });

    app.post('/api/dashboard/guild/:id/drops', requireGuildManager, (req, res) => {
        const g = client.guilds.cache.get(req.params.id);
        if (!g) return res.status(404).json({ ok: false, error: 'Servidor não encontrado.' });

        const body = req.body || {};
        const settings = getSettings(req.params.id);
        const current = settings.drops || {};
        const validHex = /^#[0-9a-fA-F]{6}$/;
        const activationPrefix = String(body.activationPrefix || settings.prefix || 'O.').trim().replace(/\s+/g, '').slice(0, 5) || 'O.';
        const embedColor = validHex.test(String(body.embedColor || '')) ? String(body.embedColor).toUpperCase() : '#8B5CF6';

        const templates = Array.isArray(body.templates) ? body.templates.slice(0, 20).map((t, i) => ({
            id: String(t.id || ('template-' + (i + 1))).slice(0, 40),
            name: String(t.name || 'Modelo ' + (i + 1)).slice(0, 60),
            title: String(t.title || '🎁 DROP EM ANDAMENTO').slice(0, 256),
            description: String(t.description || '').slice(0, 4000),
            footer: String(t.footer || '').slice(0, 2048),
            color: validHex.test(String(t.color || '')) ? String(t.color).toUpperCase() : embedColor
        })) : (Array.isArray(current.templates) ? current.templates : []);

        const ids = new Set();
        for (const t of templates) {
            let base = t.id || 'template';
            let id = base;
            let n = 2;
            while (ids.has(id)) id = base + '-' + n++;
            t.id = id;
            ids.add(id);
        }

        const templateId = ids.has(String(body.templateId)) ? String(body.templateId) : (templates[0]?.id || 'default');
        const requiredRoleIds = Array.isArray(body.requirements?.requiredRoleIds) ? body.requirements.requiredRoleIds.map(String).filter(id => g.roles.cache.has(id)).slice(0, 20) : [];
        const blockedRoleIds = Array.isArray(body.requirements?.blockedRoleIds) ? body.requirements.blockedRoleIds.map(String).filter(id => g.roles.cache.has(id)).slice(0, 20) : [];
        const bypassRoleIds = Array.isArray(body.requirements?.bypassRoleIds) ? body.requirements.bypassRoleIds.map(String).filter(id => g.roles.cache.has(id)).slice(0, 20) : [];
        const extraEntries = Array.isArray(body.extraEntries) ? body.extraEntries.slice(0, 30).map(rule => ({
            roleId: String(rule.roleId || ''),
            entries: Math.min(100, Math.max(0, Math.floor(Number(rule.entries) || 0))),
            label: String(rule.label || '').slice(0, 60)
        })).filter(rule => g.roles.cache.has(rule.roleId) && rule.entries > 0) : [];

        const requirements = {
            minMessagesDay: Math.max(0, Math.floor(Number(body.requirements?.minMessagesDay) || 0)),
            minMessagesWeek: Math.max(0, Math.floor(Number(body.requirements?.minMessagesWeek) || 0)),
            minMessagesMonth: Math.max(0, Math.floor(Number(body.requirements?.minMessagesMonth) || 0)),
            minLevel: Math.max(0, Math.floor(Number(body.requirements?.minLevel) || 0)),
            accountAgeDays: Math.max(0, Math.floor(Number(body.requirements?.accountAgeDays) || 0)),
            minInvites: Math.max(0, Math.floor(Number(body.requirements?.minInvites) || 0)),
            minFlocos: Math.max(0, Math.floor(Number(body.requirements?.minFlocos) || 0)),
            minCristais: Math.max(0, Math.floor(Number(body.requirements?.minCristais) || 0)),
            requiredRoleIds,
            blockedRoleIds,
            bypassRoleIds
        };

        const patch = {
            drops: {
                enabled: body.enabled !== false,
                channelId: g.channels.cache.has(String(body.channelId || '')) ? String(body.channelId) : null,
                activationPrefix,
                embedColor,
                winnerMessage: String(body.winnerMessage || '').slice(0, 1000),
                winnerDm: body.winnerDm !== false,
                templateId,
                templates,
                requirements,
                extraEntries
            },
            prefix: activationPrefix
        };
        const saved = setSettings(req.params.id, patch);
        return res.json({ ok: true, drops: saved.drops, prefix: saved.prefix });
    });

    app.get('/servidores', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'servidores.html')));
    app.get('/admin/:id', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));

    app.get('/api/guild/:id', requireGuildManager, async (req, res) => {
        const g = client.guilds.cache.get(req.params.id);
        if (!g) return res.status(404).json({ error: 'guild' });

        let ownerTag = null;
        try {
            const owner = await g.fetchOwner();
            ownerTag = owner.user?.tag || owner.user?.username || null;
        } catch (_) {}

        const premiumLabels = { 0: 'Nenhum', 1: 'Nível 1', 2: 'Nível 2', 3: 'Nível 3' };

        return res.json({
            id: g.id,
            name: g.name,
            description: g.description || null,
            icon: g.iconURL({ size: 256, extension: 'png' }) || null,
            ownerId: g.ownerId || null,
            ownerTag,
            memberCount: g.memberCount ?? null,
            channelCount: g.channels?.cache?.size ?? 0,
            roleCount: g.roles?.cache?.size ?? 0,
            emojiCount: g.emojis?.cache?.size ?? 0,
            stickerCount: g.stickers?.cache?.size ?? 0,
            premiumTier: Number(g.premiumTier || 0),
            premiumTierLabel: premiumLabels[Number(g.premiumTier || 0)] || 'Desconhecido',
            premiumSubscriptionCount: g.premiumSubscriptionCount ?? 0,
            verificationLevel: String(g.verificationLevel ?? 'unknown'),
            preferredLocale: g.preferredLocale || null,
            createdAt: g.createdAt || null,
            features: Array.isArray(g.features) ? g.features : [],
            prefix: getPrefix(req.params.id),
            settings: getSettings(req.params.id)
        });
    });

    app.post('/api/guild/:id/prefix', requireGuildManager, (req, res) => {
        const prefix = String(req.body?.prefix || 'O.').slice(0, 8);
        setSettings(req.params.id, { prefix });
        res.json({ ok: true, prefix });
    });

    app.post('/api/guild/:id/settings', requireGuildManager, (req, res) => {
        setSettings(req.params.id, req.body || {});
        res.json({ ok: true });
    });

    // Limite simples de requisições por sessão/IP para APIs de jogo.
    const rateBuckets = new Map();
    function rateLimit(max = 60, windowMs = 60_000) {
        return (req, res, next) => {
            const key = String(req.auth?.user?.id || req.ip || 'unknown');
            const now = Date.now();
            let bucket = rateBuckets.get(key);
            if (!bucket || now - bucket.start >= windowMs) {
                bucket = { start: now, count: 0 };
                rateBuckets.set(key, bucket);
            }
            bucket.count++;
            if (bucket.count > max) {
                return res.status(429).json({ ok: false, error: 'Muitas requisições. Tente novamente em alguns segundos.' });
            }
            next();
        };
    }

    const arenaEngine = require('../utils/arenaEngine');
    const dungeon = require('../utils/dungeon');

    app.get('/wiki', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'wiki.html')));
    app.get('/arena', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'arena.html')));
    app.get('/dungeon', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'dungeon.html')));
    app.get('/masmorra', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'dungeon.html')));
    app.get('/editor', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'editor.html')));

    app.get('/api/arena/:id', requireAuth, rateLimit(), (req, res) => {
        const match = arenaEngine.getMatch(req.params.id);
        if (!match) return res.status(404).json({ error: 'Arena não encontrada' });
        const userId = String(req.auth.user.id);
        const isParticipant = [...(match.teamA || []), ...(match.teamB || [])].some((p) => String(p?.id || p) === userId);
        if (!isParticipant) return res.status(403).json({ error: 'Você não participa desta batalha.' });
        return res.json(arenaEngine.publicState(match, userId));
    });

    app.post('/api/arena/:id/move', requireAuth, rateLimit(30), (req, res) => {
        const body = req.body || {};
        const result = arenaEngine.applyMove(req.params.id, req.auth.user.id, {
            moveId: body.moveId,
            targetId: body.targetId
        });
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.post('/api/arena/create', requireAuth, rateLimit(10), (req, res) => {
        const body = req.body || {};
        const teamA = Array.isArray(body.teamA) ? body.teamA : [body.aId].filter(Boolean);
        const teamB = Array.isArray(body.teamB) ? body.teamB : [body.bId].filter(Boolean);
        const callerId = String(req.auth.user.id);
        const isParticipant = [...teamA, ...teamB].some((id) => String(id) === callerId);
        if (!isParticipant) return res.status(403).json({ error: 'Você precisa participar da batalha que está criando.' });
        const result = arenaEngine.createMatch({
            mode: body.mode,
            teamA,
            teamB,
            bet: 0,
            fun: true
        });
        if (!result.ok) return res.status(400).json(result);
        return res.json({
            ok: true,
            id: result.match.id,
            state: arenaEngine.publicState(result.match, callerId)
        });
    });

    app.post('/api/arena/:id/chat', requireAuth, rateLimit(20), (req, res) => {
        const body = req.body || {};
        const result = arenaEngine.postChat(req.params.id, req.auth.user.id, body.text);
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.post('/api/arena/:id/skip', requireAuth, rateLimit(20), (req, res) => {
        const body = req.body || {};
        const result = arenaEngine.skipTurn(req.params.id, req.auth.user.id);
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.post('/api/arena/:id/forfeit', requireAuth, rateLimit(10), (req, res) => {
        const body = req.body || {};
        const result = arenaEngine.forfeit(req.params.id, req.auth.user.id);
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.get('/api/dungeon/:id', requireAuth, rateLimit(), (req, res) => {
        const match = dungeon.getDungeonMatch(req.params.id);
        if (!match) return res.status(404).json({ error: 'Masmorra não encontrada' });
        const userId = String(req.auth.user.id);
        const isParticipant = [...(match.players || []), ...(match.team || [])].some((p) => String(p.id || p) === userId);
        if (!isParticipant && String(match.userId || '') !== userId) return res.status(403).json({ error: 'Você não participa desta masmorra.' });
        return res.json(dungeon.publicDungeon(match, userId));
    });

    app.post('/api/dungeon/:id/move', requireAuth, rateLimit(30), (req, res) => {
        const body = req.body || {};
        const result = dungeon.applyDungeonMove(req.params.id, req.auth.user.id, body);
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.post('/api/dungeon/start', requireAuth, rateLimit(10), (req, res) => {
        const body = req.body || {};
        const result = dungeon.startFloor(req.auth.user.id, body.floor);
        if (!result.ok) return res.status(400).json(result);
        return res.json({
            ok: true,
            id: result.match.id,
            state: dungeon.publicDungeon(result.match, req.auth.user.id)
        });
    });

    app.post('/api/dungeon/:id/chat', requireAuth, rateLimit(20), (req, res) => {
        const body = req.body || {};
        const result = dungeon.postDungeonChat(req.params.id, req.auth.user.id, body.text);
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.post('/api/dungeon/:id/leave', requireAuth, rateLimit(10), (req, res) => {
        const body = req.body || {};
        const result = dungeon.leaveDungeon(req.params.id, req.auth.user.id);
        if (!result.ok) return res.status(400).json(result);
        return res.json(result);
    });

    app.post('/api/dungeon/:id/advance', requireAuth, rateLimit(10), (req, res) => {
        const body = req.body || {};
        const result = dungeon.advanceFloor(req.params.id, req.auth.user.id);
        if (!result.ok) return res.status(400).json(result);
        return res.json({
            ok: true,
            id: result.match.id,
            match: dungeon.publicDungeon(result.match, req.auth.user.id)
        });
    });

    app.get('/avatar', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'avatar.html')));

    app.get('/api/avatar/:userId', requireAuth, (req, res) => {
        try {
            if (String(req.params.userId) !== String(req.auth.user.id)) return res.status(403).json({ error: 'Você só pode acessar seu próprio avatar.' });
            const av = player.getBattleAvatar
                ? player.getBattleAvatar(req.params.userId)
                : (player.get(req.params.userId) || {}).battleAvatar || null;
            return res.json({ ok: true, avatar: av });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    });

    registerAvatarRoutes(app);
    try {
        registerEditorRoutes(app);
    } catch (e) {
        console.warn('[web] editor routes:', e.message);
    }

    app.post('/api/avatar/save', requireAuth, (req, res) => {
        try {
            const body = req.body || {};
            const userId = String(req.auth.user.id);
            if (body.userId && String(body.userId) !== userId) return res.status(403).json({ error: 'Você só pode salvar seu próprio avatar.' });
            if (!player.has(userId)) {
                return res.status(400).json({ error: 'Crie o personagem no bot primeiro (O.j criar).' });
            }
            const saved = player.setBattleAvatar(userId, body.avatar || {});
            if (!saved) return res.status(400).json({ error: 'Falha ao salvar' });
            return res.json({ ok: true, avatar: saved.battleAvatar });
        } catch (e) {
            return res.status(500).json({ error: e.message || 'erro' });
        }
    });

    app.get('/dashboard', (req, res) => res.redirect('/servidores'));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

    app.get('/health', (req, res) => {
        const mongo = (() => {
            try {
                const { isConnected } = require('../utils/mongo');
                return isConnected();
            } catch (_) {
                return false;
            }
        })();
        res.status(200).json({ ok: true, service: 'aeternus', mongo, uptime: process.uptime() });
    });

    const port = process.env.PORT || 10000;
    const host = process.env.HOST || '0.0.0.0';
    const server = app.listen(port, host, () => {
        const publicBase =
            (process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(/\/$/, '') ||
            'http://' + host + ':' + port;
        console.log('🌐 Painel:  ' + publicBase + '/dashboard');
        if (REDIRECT) console.log('[web] OAuth redirect:', REDIRECT);
    });
    return server;
}

module.exports = startWeb;
module.exports.startWeb = startWeb;
