const crypto = require('crypto');

const sessions = new Map();
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const IDENTITY_CACHE_TTL = 5 * 60 * 1000;
const DISCORD_API = 'https://discord.com/api/v10';

function env(...keys) {
    for (const key of keys) {
        const value = String(process.env[key] || '').trim();
        if (value) return value;
    }
    return '';
}

function getConfig() {
    return {
        clientId: env('CLIENT_ID', 'DISCORD_CLIENT_ID'),
        clientSecret: env('CLIENT_SECRET', 'DISCORD_CLIENT_SECRET'),
        redirect:
            env('OAUTH_REDIRECT', 'REDIRECT_URI') ||
            (process.env.RENDER_EXTERNAL_URL
                ? process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '') + '/auth/discord/callback'
                : ''),
        ownerId: env('EDITOR_OWNER_ID', 'OWNER_ID')
    };
}

function cookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || !!process.env.RENDER_EXTERNAL_URL,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL
    };
}

function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

function deleteSession(sessionId) {
    if (sessionId) sessions.delete(sessionId);
}

async function discordRequest(path, accessToken, options = {}) {
    const response = await fetch(DISCORD_API + path, {
        ...options,
        headers: {
            Authorization: 'Bearer ' + accessToken,
            Accept: 'application/json',
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));
    return { response, data };
}

async function fetchIdentity(session) {
    const now = Date.now();
    if (session.identity && now - session.identityAt < IDENTITY_CACHE_TTL) {
        return session.identity;
    }

    const { response, data } = await discordRequest('/users/@me', session.accessToken);
    if (!response.ok || !data.id) {
        throw new Error('Sessão Discord expirada');
    }

    session.identity = data;
    session.identityAt = now;
    return data;
}

async function fetchGuilds(session) {
    const { response, data } = await discordRequest('/users/@me/guilds', session.accessToken);
    if (!response.ok || !Array.isArray(data)) {
        throw new Error('Não foi possível verificar os servidores do usuário');
    }
    session.guilds = data;
    session.guildsAt = Date.now();
    return data;
}

function createSession(token) {
    const id = randomToken();
    sessions.set(id, {
        accessToken: token.access_token,
        refreshToken: token.refresh_token || null,
        expiresAt: Date.now() + Math.max(60, Number(token.expires_in || 604800) - 60) * 1000,
        createdAt: Date.now(),
        identity: null,
        identityAt: 0,
        guilds: null,
        guildsAt: 0
    });
    return id;
}

function getSession(req) {
    const id = req.cookies?.aeternus_session;
    if (!id) return null;
    const session = sessions.get(id);
    if (!session) return null;

    if (Date.now() >= session.expiresAt) {
        deleteSession(id);
        return null;
    }
    return { id, session };
}

async function requireAuth(req, res, next) {
    try {
        const found = getSession(req);
        if (!found) return res.status(401).json({ ok: false, error: 'login_required' });

        const user = await fetchIdentity(found.session);
        req.auth = { sessionId: found.id, session: found.session, user };
        next();
    } catch (_) {
        deleteSession(req.cookies?.aeternus_session);
        res.clearCookie('aeternus_session', { path: '/' });
        return res.status(401).json({ ok: false, error: 'session_expired' });
    }
}

function requireEditorOwner(req, res, next) {
    const ownerId = getConfig().ownerId;
    if (!ownerId) {
        return res.status(503).json({
            ok: false,
            error: 'EDITOR_OWNER_ID/OWNER_ID não configurado'
        });
    }
    if (!req.auth?.user?.id || req.auth.user.id !== ownerId) {
        return res.status(403).json({ ok: false, error: 'editor_forbidden' });
    }
    next();
}

async function requireGuildManager(req, res, next) {
    try {
        const found = getSession(req);
        if (!found) return res.status(401).json({ ok: false, error: 'login_required' });

        const user = await fetchIdentity(found.session);
        const guildId = String(req.params.id || '').trim();
        if (!guildId) return res.status(400).json({ ok: false, error: 'guild_id' });

        let guilds = found.session.guilds;
        if (!guilds || Date.now() - found.session.guildsAt > IDENTITY_CACHE_TTL) {
            guilds = await fetchGuilds(found.session);
        }

        const guild = guilds.find((g) => g.id === guildId);
        if (!guild) return res.status(403).json({ ok: false, error: 'not_guild_member' });

        const permissions = BigInt(String(guild.permissions || '0'));
        const ADMINISTRATOR = 1n << 3n;
        const MANAGE_GUILD = 1n << 5n;

        if ((permissions & ADMINISTRATOR) === 0n && (permissions & MANAGE_GUILD) === 0n) {
            return res.status(403).json({ ok: false, error: 'manage_guild_required' });
        }

        req.auth = { sessionId: found.id, session: found.session, user, guild };
        next();
    } catch (_) {
        deleteSession(req.cookies?.aeternus_session);
        res.clearCookie('aeternus_session', { path: '/' });
        return res.status(401).json({ ok: false, error: 'session_expired' });
    }
}

function setupAuth(app, client) {
    app.get('/login', (req, res) => {
        const cfg = getConfig();
        if (!cfg.clientId || !cfg.clientSecret || !cfg.redirect) {
            return res.status(500).send('OAuth Discord não configurado');
        }

        const state = randomToken(24);
        res.cookie('aeternus_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || !!process.env.RENDER_EXTERNAL_URL,
            sameSite: 'lax',
            path: '/',
            maxAge: 10 * 60 * 1000
        });

        const params = new URLSearchParams({
            client_id: cfg.clientId,
            redirect_uri: cfg.redirect,
            response_type: 'code',
            scope: 'identify guilds',
            state
        });

        res.redirect('https://discord.com/oauth2/authorize?' + params.toString());
    });

    app.get('/auth/discord/callback', async (req, res) => {
        try {
            const cfg = getConfig();
            const code = String(req.query.code || '');
            const state = String(req.query.state || '');
            const savedState = String(req.cookies?.aeternus_oauth_state || '');

            res.clearCookie('aeternus_oauth_state', { path: '/' });

            if (!cfg.clientId || !cfg.clientSecret || !cfg.redirect) {
                return res.status(500).send('OAuth Discord não configurado');
            }
            const stateMatches = state && savedState && state.length === savedState.length &&
                crypto.timingSafeEqual(Buffer.from(state), Buffer.from(savedState));
            if (!code || !stateMatches) {
                return res.status(400).send('OAuth state inválido');
            }

            const body = new URLSearchParams({
                client_id: cfg.clientId,
                client_secret: cfg.clientSecret,
                grant_type: 'authorization_code',
                code,
                redirect_uri: cfg.redirect
            });

            const tokenRes = await fetch(DISCORD_API + '/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const token = await tokenRes.json().catch(() => ({}));

            if (!tokenRes.ok || !token.access_token) {
                return res.status(401).send('Não foi possível autenticar com o Discord');
            }

            const sessionId = createSession(token);
            res.cookie('aeternus_session', sessionId, cookieOptions());
            res.redirect('/dashboard');
        } catch (e) {
            console.error('[auth] callback:', e.message);
            res.status(500).send('Falha na autenticação');
        }
    });

    app.get('/logout', (req, res) => {
        deleteSession(req.cookies?.aeternus_session);
        res.clearCookie('aeternus_session', { path: '/' });
        res.redirect('/dashboard');
    });

    app.get('/api/me', async (req, res) => {
        try {
            const found = getSession(req);
            if (!found) {
                return res.json({
                    ok: true,
                    authenticated: false,
                    bot: client?.user?.tag || null
                });
            }

            const user = await fetchIdentity(found.session);
            res.json({
                ok: true,
                authenticated: true,
                user: {
                    id: user.id,
                    username: user.username,
                    global_name: user.global_name || null,
                    avatar: user.avatar || null
                },
                bot: client?.user?.tag || null
            });
        } catch (_) {
            deleteSession(req.cookies?.aeternus_session);
            res.clearCookie('aeternus_session', { path: '/' });
            res.json({
                ok: true,
                authenticated: false,
                bot: client?.user?.tag || null
            });
        }
    });
}

module.exports = {
    setupAuth,
    requireAuth,
    requireEditorOwner,
    requireGuildManager,
    getConfig
};
