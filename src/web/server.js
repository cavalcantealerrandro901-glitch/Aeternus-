const express = require('express');
const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
// Define o callback exato do Render
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://aeternus-q7gt.onrender.com/auth/discord/callback';

const homeView = require('./views/home');
const dashboardView = require('./views/dashboard');
const portalView = require('./views/portal');

app.use(express.json());

// Rota Principal
app.get('/', (req, res) => {
    res.send(homeView(null));
});

// Rota de Login (Gera a URL do Discord corretamente)
app.get('/login', (req, res) => {
    if (!CLIENT_ID) {
        return res.status(500).send('CLIENT_ID não configurado nas variáveis de ambiente.');
    }
    
    const encodedRedirect = encodeURIComponent(REDIRECT_URI);
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodedRedirect}&response_type=code&scope=identify%20guilds`;
    
    res.redirect(discordAuthUrl);
});

// Rota de Callback do Discord
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/');

    try {
        // Redireciona para o dashboard após o login básico
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro na autenticação:', error);
        res.status(500).send('Erro ao autenticar com o Discord.');
    }
});

// Painel Geral
app.get('/dashboard', (req, res) => {
    const user = { username: 'Usuário' };
    const guilds = [];
    res.send(dashboardView(user, guilds));
});

// Portal do Servidor
app.get('/dashboard/:id', (req, res) => {
    const guild = { id: req.params.id, name: 'Servidor Exemplo' };
    const guilds = [guild];
    res.send(portalView(guild, guilds));
});

module.exports = app;
