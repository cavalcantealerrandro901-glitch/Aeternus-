const express = require('express');
const router = express.Router();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/discord/callback';

// Rota de redirecionamento para o Discord
router.get('/discord', (req, res) => {
    const discordLoginUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    res.redirect(discordLoginUrl);
});

// Rota de callback que recebe o código e redireciona para a página de servidores
router.get('/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/?error=no_code');

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) return res.redirect('/?error=invalid_token');

        req.session.accessToken = tokenData.access_token;
        req.session.isAuthenticated = true;

        res.redirect('/servers');
    } catch (error) {
        console.error('Erro no redirecionamento do Discord:', error);
        res.redirect('/?error=server_error');
    }
});

// Rota de logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

module.exports = function() {
    return router;
};
