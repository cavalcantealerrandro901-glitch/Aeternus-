/**
 * API geral do bot (público + user servers)
 */
function register(app, client) {
    app.get('/api/bot', (req, res) => {
        res.json({
            avatar: client.user?.displayAvatarURL({ dynamic: true, size: 256 }) || null,
            username: client.user?.username || 'Aeternus',
            tag: client.user?.tag || null,
            online: client.isReady(),
            guilds: client.guilds.cache.size
        });
    });

    app.get('/api/bot-info', (req, res) => {
        res.json({
            name: client.user?.username || 'Aeternus',
            avatar:
                client.user?.displayAvatarURL({ dynamic: true, size: 256 }) ||
                'https://cdn.discordapp.com/embed/avatars/0.png'
        });
    });

    app.get('/api/commands', (req, res) => {
        const list = [];
        if (client.slashCommands) {
            for (const cmd of client.slashCommands.values()) {
                list.push({
                    name: cmd.data?.name || cmd.name,
                    description: cmd.data?.description || cmd.description || '',
                    type: 'slash'
                });
            }
        }
        if (client.commands) {
            for (const cmd of client.commands.values()) {
                list.push({
                    name: cmd.name,
                    description: cmd.description || '',
                    type: 'prefix'
                });
            }
        }
        res.json(list);
    });

    app.get('/api/me', (req, res) => {
        if (!req.session?.isAuthenticated) {
            return res.status(401).json({ authenticated: false });
        }
        res.json({ authenticated: true, user: req.session.user });
    });

    app.get('/api/user/servers', async (req, res) => {
        if (!req.session?.accessToken) {
            return res.status(401).json({ error: 'Não autenticado' });
        }
        try {
            const response = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${req.session.accessToken}` }
            });
            if (!response.ok) return res.status(401).json({ error: 'Token inválido' });
            const guilds = await response.json();
            const admin = guilds.filter((g) => (BigInt(g.permissions) & 8n) === 8n || g.owner);
            const withBot = admin
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
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Erro interno' });
        }
    });
}

module.exports = register;
