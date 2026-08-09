const express = require('express');
const path = require('path');
const session = require('express-session');
const dashboardRoutes = require('./routes/dashboard');

module.exports = (client) => {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    // Configuração de Sessão para o Login
    app.use(session({
        secret: 'aeternus_secret_key_super_segura',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    }));

    app.use('/', dashboardRoutes(client));

    app.listen(PORT, () => {
        console.log(`🌐 Painel Web rodando em: http://localhost:${PORT}`);
    });
};
