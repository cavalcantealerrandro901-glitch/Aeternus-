const express = require('express');
const router = express.Router();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI =
    process.env.REDIRECT_URI ||
    (process.env.RENDER_EXTERNAL_URL
        ? `${String(process.env.RENDER_EXTERNAL_URL).replace(/\/$/, '')}/auth/discord/callback`
        : 'http://localhost:3000/auth/discord/callback');

// Inicia OAuth2 Discord
router.get('/discord', (req, res) => {
    if (!CLIENT_ID) {
        return res
            .status(500)
            .send('CLIENT_ID não configurado. Defina CLIENT_ID nas variáveis do Render.');
    }

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'identify guilds'
    });

    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

// Callback OAuth2
router.get('/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/?error=no_code');

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.redirect('/?error=missing_oauth_env');
    }

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: String(code),
                redirect_uri: REDIRECT_URI
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) {
            console.error('OAuth token error:', tokenData);
            return res.redirect('/?error=invalid_token');
        }

        // Dados do usuário
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const user = await userRes.json();

        req.session.accessToken = tokenData.access_token;
        req.session.refreshToken = tokenData.refresh_token || null;
        req.session.isAuthenticated = true;
        req.session.user = {
            id: user.id,
            username: user.username,
            globalName: user.global_name || user.username,
            avatar: user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                : null
        };

        req.session.save((err) => {
            if (err) console.error('session save:', err);
            res.redirect('/servers.html');
        });
    } catch (error) {
        console.error('Erro no OAuth Discord:', error);
        res.redirect('/?error=server_error');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('aeternus.sid');
        res.redirect('/');
    });
});

// Status da sessão (opcional para o front)
router.get('/me', (req, res) => {
    if (!req.session || !req.session.isAuthenticated) {
        return res.status(401).json({ authenticated: false });
    }
    res.json({
        authenticated: true,
        user: req.session.user || null
    });
});

module.exports = function createAuthRouter() {
    return router;
};
