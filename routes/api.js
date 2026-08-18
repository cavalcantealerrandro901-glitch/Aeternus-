const express = require('express');
const fs = require('fs');

function setApiRoutes(client) {
    const router = express.Router();

    // Rota Genérica para salvar qualquer configuração
    router.post('/set-setting', (req, res) => {
        const { guildId, key, value } = req.body;

        if (!guildId || !key) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        try {
            let settings = {};
            if (fs.existsSync('./settings.json')) {
                settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
            }

            if (!settings[guildId]) settings[guildId] = {};
            settings[guildId][key] = value;

            fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 2));
            res.json({ success: true, message: `Configuração ${key} salva com sucesso!` });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao salvar configuração' });
        }
    });

    // Rota para pegar configurações (útil para o painel carregar os inputs atuais)
    router.get('/settings/:guildId', (req, res) => {
        try {
            const settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
            res.json(settings[req.params.guildId] || {});
        } catch (error) {
            res.json({});
        }
    });

    // Rota para carregar os dados gerais do servidor (Resolve o travamento "Carregando...")
    router.get('/guild-data/:guildId', (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Servidor não encontrado ou bot não está nele' });
        }

        res.json({
            name: guild.name,
            id: guild.id,
            icon: guild.iconURL({ dynamic: true, size: 256 }),
            memberCount: guild.memberCount,
            roleCount: guild.roles.cache.size,
            channelCount: guild.channels.cache.size,
            description: guild.description || 'Sem descrição definida'
        });
    });

    // Rotas existentes
    router.get('/bot', (req, res) => {
        res.json({
            avatar: client.user ? client.user.displayAvatarURL({ dynamic: true, size: 256 }) : null,
            username: client.user ? client.user.username : 'Aeternus'
        });
    });

    router.get('/commands', (req, res) => {
        if (client.slashCommands) {
            const commandList = client.slashCommands.map(cmd => ({
                name: cmd.data ? cmd.data.name : (cmd.name || 'desconhecido'),
                description: cmd.data ? cmd.data.description : (cmd.description || 'Sem descrição')
            }));
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
            const adminGuilds = guilds.filter(g => (g.permissions & 0x8) === 0x8 || g.owner);
            res.json(adminGuilds);
        } catch (error) {
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    return router;
}

module.exports = setApiRoutes;
