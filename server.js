const express = require('express');
const path = require('path');
const session = require('express-session');
const { registerPanelRoutes } = require('./routes/panel');
const createAuthRouter = require('./routes/auth');
const setApiRoutes = require('./routes/api');

function startServer(client) {
    const app = express();
    const PORT = process.env.PORT || 3000;
    const isProd = !!(process.env.RENDER || process.env.NODE_ENV === 'production');

    // Render / proxies
    app.set('trust proxy', 1);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Sessão do login Discord (painel)
    app.use(
        session({
            name: 'aeternus.sid',
            secret: process.env.SESSION_SECRET || process.env.CLIENT_SECRET || 'aeternus-change-me',
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                sameSite: 'lax',
                secure: isProd
            }
        })
    );

    // Arquivos estáticos (HTML, CSS, JS do painel)
    app.use(express.static(path.join(__dirname, 'public')));

    // Health — mantém o serviço vivo no Render e mostra status do bot
    app.get('/health', (req, res) => {
        res.json({
            ok: true,
            bot: client.isReady() ? 'online' : 'starting',
            tag: client.user ? client.user.tag : null,
            guilds: client.guilds.cache.size,
            uptime: Math.floor(process.uptime())
        });
    });

    // Login / logout Discord
    app.use('/auth', createAuthRouter());

    // API geral (bot info, comandos, servidores do usuário logado)
    app.use('/api', setApiRoutes(client));

    // Rotas do painel (dashboard + settings + guild-data)
    registerPanelRoutes(app, client);

    app.listen(PORT, () => {
        console.log(`🌐 Painel web na porta ${PORT}`);
        console.log(`   Health: /health | Login: /auth/discord`);
    });

    // Auto-ping (Render free não dorme enquanto houver tráfego)
    const base =
        process.env.RENDER_EXTERNAL_URL ||
        process.env.BASE_URL ||
        (process.env.RENDER_EXTERNAL_HOSTNAME
            ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
            : null);

    if (base) {
        const url = String(base).replace(/\/$/, '') + '/health';
        setInterval(() => {
            fetch(url).catch(() => {});
        }, 10 * 60 * 1000);
        console.log(`⏱️ Keep-alive ativo → ${url}`);
    }

    return app;
}

module.exports = startServer;
module.exports.startServer = startServer;
