const express = require('express');
const path = require('path');
const session = require('express-session');

/**
 * Painel web — só monta Express e puxa as rotas.
 * Cada sistema de rota fica em /routes/*.js
 */
function startServer(client) {
    const app = express();
    const PORT = process.env.PORT || 3000;
    const isProd = !!(process.env.RENDER || process.env.NODE_ENV === 'production');

    app.set('trust proxy', 1);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(
        session({
            name: 'aeternus.sid',
            secret: process.env.SESSION_SECRET || process.env.CLIENT_SECRET || 'aeternus-secret',
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

    // Disponibiliza o client nas rotas
    app.use((req, res, next) => {
        req.client = client;
        next();
    });

    app.use(express.static(path.join(__dirname, '..', 'public')));

    app.get('/health', (req, res) => {
        res.json({
            ok: true,
            bot: client.isReady() ? 'online' : 'starting',
            tag: client.user?.tag || null,
            guilds: client.guilds.cache.size,
            uptime: Math.floor(process.uptime())
        });
    });

    // Carrega rotas automaticamente da pasta routes/
    const fs = require('fs');
    const routesDir = path.join(__dirname, '..', 'routes');
    if (fs.existsSync(routesDir)) {
        for (const file of fs.readdirSync(routesDir).filter((f) => f.endsWith('.js'))) {
            try {
                const mod = require(path.join(routesDir, file));
                if (typeof mod === 'function') {
                    // module.exports = (app, client) => {}
                    mod(app, client);
                    console.log(`🛣️  [ROTA] ${file}`);
                } else if (mod && mod.router) {
                    app.use(mod.base || '/', mod.router);
                    console.log(`🛣️  [ROTA] ${file}`);
                } else if (mod && typeof mod.register === 'function') {
                    mod.register(app, client);
                    console.log(`🛣️  [ROTA] ${file}`);
                }
            } catch (e) {
                console.error(`Falha rota ${file}:`, e.message);
            }
        }
    }

    app.listen(PORT, () => {
        console.log(`🌐 Painel na porta ${PORT}`);
    });

    // Keep-alive Render
    const base =
        process.env.RENDER_EXTERNAL_URL ||
        (process.env.RENDER_EXTERNAL_HOSTNAME
            ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
            : null);
    if (base) {
        const url = String(base).replace(/\/$/, '') + '/health';
        setInterval(() => fetch(url).catch(() => {}), 10 * 60 * 1000);
    }

    return app;
}

module.exports = { startServer };
