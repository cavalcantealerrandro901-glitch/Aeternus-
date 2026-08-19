const phrases = require('../utils/phrases');

/**
 * API geral do bot (público + user servers)
 */
function register(app, client) {
    function botPayload() {
        const phrase = phrases.getRandomPhrase
            ? phrases.getRandomPhrase()
            : 'As almas do abismo sussurram seu nome...';
        const flirt = phrases.getFlirt ? phrases.getFlirt() : '';
        const emoji = phrases.getRandomEmoji ? phrases.getRandomEmoji() : '✨';

        return {
            name: client.user?.username || 'Aeternus',
            username: client.user?.username || 'Aeternus',
            tag: client.user?.tag || null,
            avatar:
                client.user?.displayAvatarURL({ dynamic: true, size: 512 }) ||
                'https://cdn.discordapp.com/embed/avatars/0.png',
            online: client.isReady(),
            guilds: client.guilds.cache.size,
            // Frase decorativa (bem grandona)
            phrase: `${emoji} ${phrase}`,
            subtitle: flirt,
            bannerText: phrase,
            inviteUrl: process.env.CLIENT_ID
                ? `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&scope=bot%20applications.commands&permissions=8`
                : null
        };
    }

    app.get('/api/bot', (req, res) => res.json(botPayload()));
    app.get('/api/bot-info', (req, res) => res.json(botPayload()));

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

    // Lista de idiomas do dicionário (para o modal)
    app.get('/api/languages', (req, res) => {
        res.json([
            { code: 'pt', name: 'Português', native: 'Português', flag: '🇧🇷' },
            { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
            { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
            { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
            { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
            { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
            { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
            { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
            { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
            { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳' },
            { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
            { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
            { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
            { code: 'pl', name: 'Polish', native: 'Polski', flag: '🇵🇱' },
            { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' }
        ]);
    });
}

module.exports = register;
