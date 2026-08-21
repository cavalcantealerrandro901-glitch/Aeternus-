/** Usa fetch nativo do Node 18+ (sem node-fetch) */
module.exports = function (app, client) {
    app.get('/api/user-guilds', async (req, res) => {
        if (!req.session?.accessToken) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        try {
            const response = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${req.session.accessToken}` }
            });

            if (!response.ok) throw new Error('Falha ao buscar servidores');

            const guilds = await response.json();

            // 0x8 = ADMINISTRATOR
            const adminGuilds = guilds.filter((g) => (BigInt(g.permissions) & 8n) === 8n);

            res.json(adminGuilds);
        } catch (error) {
            console.error('user-guilds:', error.message);
            res.status(500).json({ error: 'Erro interno' });
        }
    });
};

module.exports.register = function (app, client) {
    module.exports(app, client);
};
