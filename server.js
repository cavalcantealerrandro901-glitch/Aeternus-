require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const setApiRoutes = require('./routes/api');
const setAuthRoutes = require('./routes/auth');
const prefixRoutes = require('./routes/prefix');

function startServer(client) {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.use(session({
        secret: process.env.SESSION_SECRET || 'aeternus_segredo_super_seguro',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    }));

    app.use('/api', setApiRoutes(client));
    app.use('/api/prefix', prefixRoutes);
    app.use('/auth', setAuthRoutes());

    function sendInjectedHtml(res, fileName) {
        const filePath = path.join(__dirname, 'public', fileName);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) return res.status(500).send('Erro ao carregar página');

            const assets = `
    <link rel="stylesheet" href="/theme.css">
    <script src="/theme.js"></script>
    <script src="/i18n.js"></script>
    <script src="/snow.js"></script>
    <script>window.onload = () => i18n.loadLanguage(i18n.currentLang);</script>
</head>`;

            let injectedData = data;
            if (/<\/head>/i.test(data)) {
                injectedData = data.replace(/<\/head>/i, assets);
            } else {
                injectedData = assets + data;
            }
            res.send(injectedData);
        });
    }

    app.get('/', (req, res) => sendInjectedHtml(res, 'index.html'));
    app.get('/servers', (req, res) => sendInjectedHtml(res, 'servers.html'));
    app.get('/dashboard', (req, res) => sendInjectedHtml(res, 'dashboard.html'));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🌐 Servidor rodando em http://localhost:${PORT}`));
}

module.exports = { startServer };
