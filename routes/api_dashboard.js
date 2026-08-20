const fetch = require('node-fetch');

module.exports = function(app, client) {
    app.get('/api/user-guilds', async (req, res) => {
        if (!req.session.accessToken) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        try {
            const response = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${req.session.accessToken}` }
            });

            if (!response.ok) throw new Error('Falha ao buscar servidores');

            const guilds = await response.json();

            // 0x8 é a flag de ADMINISTRATOR no Discord
            const adminGuilds = guilds.filter(g => (g.permissions & 0x8) === 0x8);

            res.json(adminGuilds);
        } catch (error) {
            res.status(500).json({ error: 'Erro interno' });
        }
    });
};
