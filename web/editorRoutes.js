const express = require('express');
const shell = require('../utils/aiShell');
const ai = require('../utils/aeternusAI');

function panelAuth(req, res, next) {
    const secret = String(process.env.PANEL_SECRET || process.env.EDITOR_SECRET || '').trim();
    if (!secret) return next();
    const got = req.headers['x-panel-secret'] || req.query.secret || req.body?.secret || '';
    if (String(got) !== secret) return res.status(401).json({ ok: false, error: 'secret inválido' });
    next();
}

function registerEditorRoutes(app) {
    const r = express.Router();
    r.use(panelAuth);

    r.get('/tree', (req, res) => {
        try {
            res.json({ ok: true, root: shell.ROOT, files: shell.listProjectFiles('.') });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    r.get('/ls', (req, res) => {
        const result = shell.listDir(req.query.path || '.');
        res.status(result.ok ? 200 : 400).json(result);
    });

    r.get('/read', (req, res) => {
        const result = shell.cat(req.query.path || '');
        res.status(result.ok ? 200 : 400).json(result);
    });

    r.post('/write', (req, res) => {
        try {
            const p = req.body?.path;
            if (!p) return res.status(400).json({ ok: false, error: 'path obrigatório' });
            res.json(shell.writeFile(p, req.body?.content ?? ''));
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    r.post('/exec', async (req, res) => {
        try {
            const line = req.body?.cmd || req.body?.line || '';
            if (/^cat\s+>\s*\S+\s*<<\s*\w+/i.test(String(line).trim()) && req.body?.content != null) {
                const m = String(line).match(/^cat\s+>\s*(\S+)/i);
                if (!m?.[1]) return res.status(400).json({ ok: false, error: 'path inválido' });
                const result = shell.writeFile(m[1], req.body.content);
                return res.json({ ok: true, text: 'escrito ' + result.path + ' (' + result.bytes + ' bytes)' });
            }
            res.json(await shell.execLine(line));
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    r.post('/chat', async (req, res) => {
        try {
            const msg = String(req.body?.message || '').trim();
            if (!msg) return res.status(400).json({ ok: false, error: 'message vazio' });
            const persona = req.body?.persona || 'default';
            const extra = '[Editor Aeternus] Pode sugerir ls/cat/nano/npm. Fale de boa, gíria e palavrão liberados.\n\n';
            const fn = ai.fetchPublicAIResponse || ai.fetchJarvisReply;
            const reply = await fn(extra + msg, persona);
            res.json({ ok: true, reply: reply || '… deu ruim, tenta de novo.' });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    app.use('/api/editor', r);
    console.log('🛠️  [web] Editor API em /api/editor/*');
}

module.exports = { registerEditorRoutes };
