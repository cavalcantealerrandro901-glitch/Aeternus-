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
            return res.status(500).send('CLIENT_ID não configurado');
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
        if (!code) return res.redirect('/');

        try {
            const body = new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: String(code),
                redirect_uri: REDIRECT_URI
            });

            const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) {
                console.error('OAuth token error', tokenData);
                return res.status(400).send('Falha no login Discord');
            }

            const userRes = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            const user = await userRes.json();

            req.session.accessToken = tokenData.access_token;
            req.session.refreshToken = tokenData.refresh_token;
            req.session.isAuthenticated = true;
            req.session.user = {
                id: user.id,
                username: user.username,
                global_name: user.global_name,
                avatar: user.avatar
                    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                    : null
            };

            req.session.save(() => res.redirect('/servers'));
        } catch (e) {
            console.error('OAuth callback', e);
            res.status(500).send('Erro no login');
        }
    });

    app.get('/auth/logout', (req, res) => {
        req.session.destroy(() => res.redirect('/'));
    });

    app.get('/auth/me', (req, res) => {
        if (!req.session?.isAuthenticated) {
            return res.json({ authenticated: false });
        }
        res.json({ authenticated: true, user: req.session.user });
    });

    // alias estático /servers -> servers.html
    app.get('/servers', (req, res) => {
        res.redirect('/servers.html');
    });
}

module.exports = register;
module.exports.register = register;
