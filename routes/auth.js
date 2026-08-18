/**
 * Login Discord OAuth2 (sessão)
 * Montado automaticamente por web/server.js
 */
function register(app) {
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const REDIRECT_URI =
        process.env.REDIRECT_URI ||
        (process.env.RENDER_EXTERNAL_URL
            ? `${String(process.env.RENDER_EXTERNAL_URL).replace(/\/$/, '')}/auth/discord/callback`
            : 'http://localhost:3000/auth/discord/callback');

    app.get('/auth/discord', (req, res) => {
        if (!CLIENT_ID) {
            return res.status(500).send('Defina CLIENT_ID no Render.');
        }
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: 'identify guilds'
        });
        res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
    });

    app.get('/auth/discord/callback', async (req, res) => {
        const code = req.query.code;
        if (!code) return res.redirect('/?error=no_code');
        if (!CLIENT_ID || !CLIENT_SECRET) return res.redirect('/?error=oauth_env');

        try {
            const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: String(code),
                    redirect_uri: REDIRECT_URI
                })
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) return res.redirect('/?error=token');

            const userRes = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            const user = await userRes.json();

            req.session.accessToken = tokenData.access_token;
            req.session.isAuthenticated = true;
            req.session.user = {
                id: user.id,
                username: user.username,
                globalName: user.global_name || user.username,
                avatar: user.avatar
                    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                    : null
            };

            req.session.save(() => res.redirect('/servers.html'));
        } catch (e) {
            console.error('OAuth:', e);
            res.redirect('/?error=server');
        }
    });

    app.get('/auth/logout', (req, res) => {
        req.session.destroy(() => {
            res.clearCookie('aeternus.sid');
            res.redirect('/');
        });
    });

    app.get('/auth/me', (req, res) => {
        if (!req.session?.isAuthenticated) {
            return res.status(401).json({ authenticated: false });
        }
        res.json({ authenticated: true, user: req.session.user });
    });
}

module.exports = register;
