const express = require('express');

function setApiRoutes(client) {
    const router = express.Router();

    router.get('/bot', (req, res) => {
        res.json({
            avatar: client.user ? client.user.displayAvatarURL({ dynamic: true, size: 256 }) : null,
            username: client.user ? client.user.username : 'Aeternus'
        });
    });

    router.get('/commands', (req, res) => {
        // Pega os comandos da estrutura client.slashCommands do bot
        if (client.slashCommands && typeof client.slashCommands.map === 'function') {
            const commandList = client.slashCommands.map(cmd => {
                const name = cmd.data ? cmd.data.name : (cmd.name || 'desconhecido');
                const description = cmd.data ? cmd.data.description : (cmd.description || 'Sem descrição');
                return { name, description };
            });
            res.json(commandList);
        } else {
            res.json([]);
        }
    });

    router.get('/user/servers', async (req, res) => {
        if (!req.session || !req.session.accessToken) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        try {
            const response = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${req.session.accessToken}` }
            });

            if (!response.ok) return res.status(401).json({ error: 'Token inválido' });

            const guilds = await response.json();
            const adminGuilds = guilds.filter(guild => (guild.permissions & 0x8) === 0x8 || guild.owner);
            res.json(adminGuilds);
        } catch (error) {
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    return router;
}

module.exports = setApiRoutes;
