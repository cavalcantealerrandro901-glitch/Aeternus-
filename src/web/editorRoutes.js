const { encrypt } = require('../bot/utils/cryptoSecrets');
const githubEditor = require('../bot/utils/githubEditor');
const { handleEditorMessage } = require('../bot/utils/editorChat');
const db = require('../database/db');
const renderEditor = require('./views/editor');

module.exports = function registerEditorRoutes(app, { sessions, isOwner, client }) {
    async function requireEditor(req, res) {
        const session = sessions[req.cookies?.sessionId];
        if (!session) {
            res.status(401).json({ error: 'Não autorizado. Faça login de novo.' });
            return null;
        }
        const ok = await db.canAccessEditor(session.user.id);
        if (!ok) {
            res.status(403).json({
                error: 'Sem permissão no Editor. O dono libera com !daracesso @você'
            });
            return null;
        }
        return session;
    }

    app.get('/editor', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const ok = await db.canAccessEditor(session.user.id);
        if (!ok) {
            return res
                .status(403)
                .send(
                    '<!DOCTYPE html><html><body style="background:#0b0b12;color:#eee;font-family:sans-serif;padding:40px">' +
                    '<h1>Acesso negado</h1><p>Você não tem permissão no Sistema de Editor.</p>' +
                    '<p>O dono libera com <code>!daracesso @você</code> no Discord.</p>' +
                    '<p><a href="/dashboard" style="color:#a78bfa">Voltar</a></p></body></html>'
                );
        }

        const userAvatarUrl = session.user.avatar
            ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

        const botAvatarUrl = client?.user
            ? client.user.displayAvatarURL({ size: 128, extension: 'png' })
            : '';

        const doc = await db.getEditorConfig();
        const editorMeta = {
            owner: doc.github?.owner || '',
            repo: doc.github?.repo || '',
            branch: doc.github?.branch || 'main',
            hasToken: !!doc.github?.tokenEnc,
            secrets: (doc.secrets || []).map((s) => s.name),
            isOwner: isOwner(session.user)
        };

        res.send(
            renderEditor({
                user: session.user,
                userAvatarUrl,
                botAvatarUrl,
                editorMeta
            })
        );
    });

    app.post('/api/editor/repo', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
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
            console.error('editor/repo', err);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/editor/test', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        try {
            const doc = await db.getEditorConfig();
            const info = await githubEditor.testConnection(
                doc.toObject ? doc.toObject() : doc
            );
            res.json(info);
        } catch (err) {
            console.error('editor/test', err);
            res.status(400).json({ error: err.message });
        }
    });

    app.post('/api/editor/secret', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        try {
            const name = String(req.body.name || '').trim().toUpperCase();
            const value = String(req.body.value || '');
            if (!name || !value) {
                return res.status(400).json({ error: 'Nome e valor obrigatórios' });
            }

            const doc = await db.getEditorConfig();
            const secrets = [...(doc.secrets || [])];
            const idx = secrets.findIndex((s) => s.name === name);
            const entry = { name, valueEnc: encrypt(value), updatedAt: Date.now() };
            if (idx >= 0) secrets[idx] = entry;
            else secrets.push(entry);

            const github = { ...(doc.github?.toObject?.() || doc.github || {}) };
            if (name === 'GITHUB_TOKEN' || name === 'GH_TOKEN') {
                github.tokenEnc = encrypt(value);
            }

            await db.saveEditorConfig({ secrets, github });
            res.json({ success: true, secrets: secrets.map((s) => s.name) });
        } catch (err) {
            console.error('editor/secret', err);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/editor/chat', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        try {
            const message = String(req.body.message || '');
            const doc = await db.getEditorConfig();
            let cfg = doc.toObject ? doc.toObject() : { ...doc };

            const saveConfig = async (data) => {
                const payload = {
                    github: data.github,
                    secrets: data.secrets,
                    allowedEditors: data.allowedEditors,
                    chatHistory: (data.chatHistory || cfg.chatHistory || []).slice(-40)
                };
                await db.saveEditorConfig(payload);
                cfg = { ...cfg, ...payload };
            };

            const result = await handleEditorMessage(message, cfg, saveConfig);

            const history = [
                ...(cfg.chatHistory || []),
                { role: 'user', content: message, at: Date.now() },
                { role: 'bot', content: result.reply, at: Date.now() }
            ].slice(-40);

            await db.saveEditorConfig({
                github: cfg.github,
                secrets: cfg.secrets,
                allowedEditors: cfg.allowedEditors,
                chatHistory: history
            });

            res.json({ reply: result.reply });
        } catch (err) {
            console.error('Editor chat:', err);
            res.status(500).json({
                error: err.message,
                reply: 'Erro: ' + err.message
            });
        }
    });
};
