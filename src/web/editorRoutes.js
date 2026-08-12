const { encrypt } = require('../bot/utils/cryptoSecrets');
const githubEditor = require('../bot/utils/githubEditor');
const { handleEditorMessage } = require('../bot/utils/editorChat');
const db = require('../database/db');
const renderEditor = require('./views/editor');

/**
 * Rotas do Sistema de Editor (apenas OWNER_ID)
 */
module.exports = function registerEditorRoutes(app, { sessions, isOwner }) {
    function requireOwner(req, res) {
        const session = sessions[req.cookies?.sessionId];
        if (!session) {
            res.status(401).json({ error: 'Não autorizado' });
            return null;
        }
        if (!isOwner(session.user)) {
            res.status(403).json({ error: 'Apenas o dono pode usar o editor' });
            return null;
        }
        return session;
    }

    app.get('/editor', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');
        if (!isOwner(session.user)) return res.status(403).send('Acesso negado. Apenas o dono do bot pode usar o editor.');

        const userAvatarUrl = session.user.avatar
            ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

        const doc = await db.getEditorConfig();
        const editorMeta = {
            owner: doc.github?.owner || '',
            repo: doc.github?.repo || '',
            branch: doc.github?.branch || 'main',
            hasToken: !!doc.github?.tokenEnc,
            secrets: (doc.secrets || []).map(s => s.name)
        };

        res.send(renderEditor({ user: session.user, userAvatarUrl, editorMeta }));
    });

    app.post('/api/editor/repo', async (req, res) => {
        if (!requireOwner(req, res)) return;
        try {
            const doc = await db.getEditorConfig();
            const github = {
                owner: (req.body.owner || '').trim(),
                repo: (req.body.repo || '').trim(),
                branch: (req.body.branch || 'main').trim() || 'main',
                tokenEnc: doc.github?.tokenEnc
            };
            await db.saveEditorConfig({ github });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/editor/test', async (req, res) => {
        if (!requireOwner(req, res)) return;
        try {
            const doc = await db.getEditorConfig();
            const info = await githubEditor.testConnection(doc.toObject ? doc.toObject() : doc);
            res.json(info);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    app.post('/api/editor/secret', async (req, res) => {
        if (!requireOwner(req, res)) return;
        try {
            const name = String(req.body.name || '').trim().toUpperCase();
            const value = String(req.body.value || '');
            if (!name || !value) return res.status(400).json({ error: 'Nome e valor obrigatórios' });

            const doc = await db.getEditorConfig();
            const secrets = [...(doc.secrets || [])];
            const idx = secrets.findIndex(s => s.name === name);
            const entry = { name, valueEnc: encrypt(value), updatedAt: Date.now() };
            if (idx >= 0) secrets[idx] = entry;
            else secrets.push(entry);

            const github = { ...(doc.github?.toObject?.() || doc.github || {}) };
            if (name === 'GITHUB_TOKEN' || name === 'GH_TOKEN') {
                github.tokenEnc = encrypt(value);
            }

            await db.saveEditorConfig({ secrets, github });
            res.json({ success: true, secrets: secrets.map(s => s.name) });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/editor/chat', async (req, res) => {
        if (!requireOwner(req, res)) return;
        try {
            const message = String(req.body.message || '');
            const doc = await db.getEditorConfig();
            let cfg = doc.toObject ? doc.toObject() : { ...doc };

            const saveConfig = async (data) => {
                const payload = {
                    github: data.github,
                    secrets: data.secrets,
                    chatHistory: (data.chatHistory || []).slice(-40)
                };
                await db.saveEditorConfig(payload);
                cfg = { ...cfg, ...payload };
            };

            const result = await handleEditorMessage(message, cfg, saveConfig);

            const history = [...(cfg.chatHistory || []),
                { role: 'user', content: message, at: Date.now() },
                { role: 'bot', content: result.reply, at: Date.now() }
            ].slice(-40);
            await db.saveEditorConfig({
                github: cfg.github,
                secrets: cfg.secrets,
                chatHistory: history
            });

            res.json({ reply: result.reply });
        } catch (err) {
            console.error('Editor chat:', err);
            res.status(500).json({ error: err.message, reply: '❌ ' + err.message });
        }
    });
};
