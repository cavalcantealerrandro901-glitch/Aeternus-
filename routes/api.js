const express = require('express');

function setApiRoutes(client) {
    const router = express.Router();

    // Info do bot (público)
    router.get('/bot', (req, res) => {
        res.json({
            avatar: client.user
                ? client.user.displayAvatarURL({ dynamic: true, size: 256 })
                : null,
            username: client.user ? client.user.username : 'Aeternus',
            tag: client.user ? client.user.tag : null,
            online: client.isReady(),
            guilds: client.guilds.cache.size
        });
    });

    // Lista de comandos slash
    router.get('/commands', (req, res) => {
        if (!client.slashCommands) return res.json([]);
        const commandList = client.slashCommands.map((cmd) => ({
            name: cmd.data ? cmd.data.name : cmd.name || 'desconhecido',
            description: cmd.data
                ? cmd.data.description
                : cmd.description || 'Sem descrição'
        }));
        res.json(commandList);
    });

    // Sessão do usuário logado
    router.get('/me', (req, res) => {
        if (!req.session || !req.session.isAuthenticated) {
            return res.status(401).json({ authenticated: false });
        }
        res.json({
            authenticated: true,
            user: req.session.user || null
        });
    });

    // Servidores onde o usuário é admin E o bot está presente
    router.get('/user/servers', async (req, res) => {
        if (!req.session || !req.session.accessToken) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        try {
            const response = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${req.session.accessToken}` }
            });

            if (!response.ok) {
                return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
            }

            const guilds = await response.json();
            const adminGuilds = guilds.filter(
                (g) => (BigInt(g.permissions) & 8n) === 8n || g.owner
            );

            // Só servidores em que o bot está online
            const withBot = adminGuilds
                .filter((g) => client.guilds.cache.has(g.id))
                .map((g) => ({
                    id: g.id,
                    name: g.name,
                    icon: g.icon
                        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`
                        : null,
                    owner: !!g.owner
                }));

            res.json(withBot);
        } catch (error) {
            console.error('user/servers:', error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    return router;
}

module.exports = setApiRoutes;
