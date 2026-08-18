const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

function isExpressRouter(mod) {
    return (
        mod &&
        typeof mod === 'function' &&
        Array.isArray(mod.stack) &&
        typeof mod.handle === 'function'
    );
}

/**
 * Painel web — Express + carrega routes/*.js
 * Cada arquivo deve exportar: function register(app, client) { ... }
 * Routers antigos (Express.Router) são ignorados com aviso.
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

    const routesDir = path.join(__dirname, '..', 'routes');
    if (fs.existsSync(routesDir)) {
        for (const file of fs.readdirSync(routesDir).filter((f) => f.endsWith('.js'))) {
            try {
                const mod = require(path.join(routesDir, file));

                if (mod && typeof mod.register === 'function') {
                    mod.register(app, client);
                    console.log(`🛣️  [ROTA] ${file}`);
                    continue;
                }

                // function (app, client) — mas NÃO Express.Router
                if (typeof mod === 'function' && !isExpressRouter(mod)) {
                    mod(app, client);
                    console.log(`🛣️  [ROTA] ${file}`);
                    continue;
                }

                if (isExpressRouter(mod)) {
                    console.log(`⏭️  [ROTA] ${file} ignorada (formato Router antigo)`);
                    continue;
                }

                console.log(`⏭️  [ROTA] ${file} ignorada (export inválido)`);
            } catch (e) {
                console.error(`Falha rota ${file}:`, e.message);
            }
        }
    }

    app.listen(PORT, () => {
        console.log(`🌐 Painel na porta ${PORT}`);
    });

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
