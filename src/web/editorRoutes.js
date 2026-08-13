const { encrypt, decrypt } = require('../bot/utils/cryptoSecrets');
const githubEditor = require('../bot/utils/githubEditor');
const { handleEditorMessage } = require('../bot/utils/editorChat');
const db = require('../database/db');
const renderEditor = require('./views/editor');

module.exports = function registerEditorRoutes(app, { sessions, isOwner, client }) {
    const GH_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
    const GH_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
    const GH_REDIRECT =
        process.env.GITHUB_REDIRECT_URI ||
        (process.env.PANEL_URL
            ? `${process.env.PANEL_URL.replace(/\/$/, '')}/auth/github/callback`
            : 'https://aeternus-q7gt.onrender.com/auth/github/callback');

    async function requireEditor(req, res) {
        const session = sessions[req.cookies?.sessionId];
        if (!session) {
            res.status(401).json({ error: 'Não autorizado. Faça login no Discord.' });
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

    async function userGithubCtx(discordId) {
        const link = await db.getEditorGithubLink(discordId);
        if (!link?.tokenEnc) return { token: null, meta: null, link: null };
        return {
            token: decrypt(link.tokenEnc),
            meta: {
                owner: link.selected?.owner || '',
                repo: link.selected?.repo || '',
                branch: link.selected?.branch || 'main'
            },
            link
        };
    }

    // —— OAuth GitHub ——
    app.get('/auth/github', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');
        const ok = await db.canAccessEditor(session.user.id);
        if (!ok) return res.status(403).send('Sem permissão no Editor.');

        if (!GH_CLIENT_ID) {
            return res
                .status(500)
                .send('GITHUB_CLIENT_ID não configurado no Render.');
        }

        const state = Buffer.from(
            JSON.stringify({ d: session.user.id, t: Date.now() })
        ).toString('base64url');

        const params = new URLSearchParams({
            client_id: GH_CLIENT_ID,
            redirect_uri: GH_REDIRECT,
            scope: 'repo read:user',
            state,
            allow_signup: 'true'
        });

        res.redirect(`https://github.com/login/oauth/authorize?${params}`);
    });

    app.get('/auth/github/callback', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const { code, state, error } = req.query;
        if (error) {
            return res.redirect('/editor?gh=denied');
        }
        if (!code) return res.redirect('/editor?gh=error');

        try {
            if (state) {
                const parsed = JSON.parse(
                    Buffer.from(String(state), 'base64url').toString('utf8')
                );
                if (String(parsed.d) !== String(session.user.id)) {
                    return res.status(403).send('State inválido.');
                }
            }

            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: GH_CLIENT_ID,
                    client_secret: GH_CLIENT_SECRET,
                    code,
                    redirect_uri: GH_REDIRECT
                })
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) {
                console.error('GitHub token error:', tokenData);
                return res.redirect('/editor?gh=token_error');
            }

            const ghUser = await githubEditor.getAuthenticatedUser(tokenData.access_token);

            await db.saveEditorGithubLink(session.user.id, {
                githubId: String(ghUser.id),
                login: ghUser.login,
                tokenEnc: encrypt(tokenData.access_token),
                scope: tokenData.scope || 'repo,read:user',
                linkedAt: Date.now()
            });

            // Guarda na sessão em memória também
            session.github = {
                login: ghUser.login,
                id: ghUser.id
            };

            res.redirect('/editor?gh=ok');
        } catch (err) {
            console.error('GitHub OAuth:', err);
            res.redirect('/editor?gh=error');
        }
    });

    app.post('/api/editor/github/disconnect', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        const session = sessions[req.cookies?.sessionId];
        await db.clearEditorGithubLink(session.user.id);
        delete session.github;
        res.json({ success: true });
    });

    app.get('/api/editor/repos', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        try {
            const session = sessions[req.cookies?.sessionId];
            const ctx = await userGithubCtx(session.user.id);
            if (!ctx.token) return res.status(400).json({ error: 'Conecte o GitHub primeiro.' });
            const repos = await githubEditor.listUserRepos(ctx.token);
            res.json({ repos });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    app.post('/api/editor/repo', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        try {
            const session = sessions[req.cookies?.sessionId];
            const owner = (req.body.owner || '').trim();
            const repo = (req.body.repo || '').trim();
            const branch = (req.body.branch || 'main').trim() || 'main';
            if (!owner || !repo) {
                return res.status(400).json({ error: 'Owner e repo obrigatórios' });
            }

            await db.setEditorSelectedRepo(session.user.id, { owner, repo, branch });

            // Também atualiza config global (fallback para IA do editor)
            const doc = await db.getEditorConfig();
            const github = {
                ...(doc.github?.toObject?.() || doc.github || {}),
                owner,
                repo,
                branch
            };
            await db.saveEditorConfig({ github });

            res.json({ success: true, owner, repo, branch });
        } catch (err) {
            console.error('editor/repo', err);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/editor/test', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        try {
            const session = sessions[req.cookies?.sessionId];
            const ctx = await userGithubCtx(session.user.id);
            const doc = await db.getEditorConfig();
            const info = await githubEditor.testConnection(
                doc.toObject ? doc.toObject() : doc,
                { token: ctx.token, ...ctx.meta }
            );
            res.json(info);
        } catch (err) {
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

            await db.saveEditorConfig({ secrets });
            res.json({ success: true, secrets: secrets.map((s) => s.name) });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/editor/chat', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        try {
            const session = sessions[req.cookies?.sessionId];
            const message = String(req.body.message || '');
            const doc = await db.getEditorConfig();
            let cfg = doc.toObject ? doc.toObject() : { ...doc };

            const ctx = await userGithubCtx(session.user.id);
            // Injeta token/repo do usuário no config usado pelo chat
            if (ctx.token) {
                cfg = {
                    ...cfg,
                    github: {
                        ...(cfg.github || {}),
                        owner: ctx.meta.owner || cfg.github?.owner,
                        repo: ctx.meta.repo || cfg.github?.repo,
                        branch: ctx.meta.branch || cfg.github?.branch || 'main',
                        // token em memória só para esta requisição (não salvar plaintext)
                        _runtimeToken: ctx.token
                    }
                };
            }

            const saveConfig = async (data) => {
                const payload = {
                    github: {
                        owner: data.github?.owner,
                        repo: data.github?.repo,
                        branch: data.github?.branch,
                        tokenEnc: cfg.github?.tokenEnc
                    },
                    secrets: data.secrets,
                    allowedEditors: data.allowedEditors,
                    chatHistory: (data.chatHistory || cfg.chatHistory || []).slice(-40)
                };
                await db.saveEditorConfig(payload);
                if (data.github?.owner && data.github?.repo) {
                    await db.setEditorSelectedRepo(session.user.id, {
                        owner: data.github.owner,
                        repo: data.github.repo,
                        branch: data.github.branch || 'main'
                    });
                }
                cfg = { ...cfg, ...payload };
            };

            const result = await handleEditorMessage(message, cfg, saveConfig, {
                userToken: ctx.token,
                userMeta: ctx.meta
            });

            const history = [
                ...(cfg.chatHistory || []),
                { role: 'user', content: message, at: Date.now() },
                { role: 'bot', content: result.reply, at: Date.now() }
            ].slice(-40);

            await db.saveEditorConfig({
                github: {
                    owner: cfg.github?.owner,
                    repo: cfg.github?.repo,
                    branch: cfg.github?.branch,
                    tokenEnc: cfg.github?.tokenEnc
                },
                secrets: cfg.secrets,
                allowedEditors: cfg.allowedEditors,
                chatHistory: history
            });

            res.json({ reply: result.reply });
        } catch (err) {
            console.error('Editor chat:', err);
            res.status(500).json({ error: err.message, reply: 'Erro: ' + err.message });
        }
    });

    app.get('/editor', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const ok = await db.canAccessEditor(session.user.id);
        if (!ok) {
            return res.status(403).send(
                '<!DOCTYPE html><html><body style="background:#0b0b12;color:#eee;font-family:sans-serif;padding:40px">' +
                    '<h1>Acesso negado</h1><p>Sem permissão no Editor.</p>' +
                    '<p>O dono libera com <code>!daracesso @você</code>.</p>' +
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
        const link = await db.getEditorGithubLink(session.user.id);

        const editorMeta = {
            owner: link?.selected?.owner || doc.github?.owner || '',
            repo: link?.selected?.repo || doc.github?.repo || '',
            branch: link?.selected?.branch || doc.github?.branch || 'main',
            hasToken: !!(link?.tokenEnc || doc.github?.tokenEnc),
            githubLinked: !!link?.tokenEnc,
            githubLogin: link?.login || '',
            secrets: (doc.secrets || []).map((s) => s.name),
            isOwner: isOwner(session.user),
            ghClientConfigured: !!GH_CLIENT_ID,
            ghStatus: req.query.gh || ''
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
};
