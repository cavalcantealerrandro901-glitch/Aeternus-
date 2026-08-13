const crypto = require('crypto');
const { encrypt, decrypt } = require('../bot/utils/cryptoSecrets');
const gh = require('../bot/utils/githubApi');
const { handleEditorMessage } = require('../bot/utils/editorChat');
const db = require('../database/db');
const renderEditor = require('./views/editor');

const oauthStates = new Map();

module.exports = function registerEditorRoutes(app, { sessions, isOwner, client }) {
    const GH_ID = (process.env.GITHUB_CLIENT_ID || '').trim();
    const GH_SECRET = (process.env.GITHUB_CLIENT_SECRET || '').trim();

    function redirectUri(req) {
        if (process.env.GITHUB_REDIRECT_URI) return process.env.GITHUB_REDIRECT_URI.trim();
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        return `${proto}://${host}/auth/github/callback`;
    }

    async function getSession(req, res) {
        const session = sessions[req.cookies?.sessionId];
        if (!session?.user) {
            res.status(401).json({ error: 'Faça login no Discord de novo.' });
            return null;
        }
        if (!(await db.canAccessEditor(session.user.id))) {
            res.status(403).json({ error: 'Sem permissão. Use !daracesso @você' });
            return null;
        }
        return session;
    }

    async function githubCtx(session) {
        if (session.github?.token) {
            return {
                token: session.github.token,
                login: session.github.login,
                owner: session.github.owner || '',
                repo: session.github.repo || '',
                branch: session.github.branch || 'main'
            };
        }
        const link = await db.getEditorGithubLink(session.user.id);
        if (!link?.tokenEnc) return { token: null, login: '', owner: '', repo: '', branch: 'main' };
        const token = decrypt(link.tokenEnc);
        if (!token) return { token: null, login: link.login || '', owner: '', repo: '', branch: 'main' };

        session.github = {
            token,
            login: link.login,
            owner: link.selected?.owner || '',
            repo: link.selected?.repo || '',
            branch: link.selected?.branch || 'main'
        };
        return {
            token,
            login: link.login,
            owner: link.selected?.owner || '',
            repo: link.selected?.repo || '',
            branch: link.selected?.branch || 'main'
        };
    }

    app.get('/auth/github', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');
        if (!(await db.canAccessEditor(session.user.id))) {
            return res.status(403).send('Sem permissão no Editor.');
        }
        if (!GH_ID || !GH_SECRET) {
            return res.status(500).send('GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET faltando no Render.');
        }

        const state = crypto.randomBytes(16).toString('hex');
        oauthStates.set(state, { id: String(session.user.id), at: Date.now() });

        const params = new URLSearchParams({
            client_id: GH_ID,
            redirect_uri: redirectUri(req),
            scope: 'repo read:user',
            state
        });
        res.redirect('https://github.com/login/oauth/authorize?' + params.toString());
    });

    app.get('/auth/github/callback', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const { code, state, error } = req.query;
        if (error) return res.redirect('/editor?e=denied');
        if (!code || !state) return res.redirect('/editor?e=code');

        const st = oauthStates.get(String(state));
        oauthStates.delete(String(state));
        if (!st || st.id !== String(session.user.id) || Date.now() - st.at > 600000) {
            return res.redirect('/editor?e=state');
        }

        try {
            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: GH_ID,
                    client_secret: GH_SECRET,
                    code: String(code),
                    redirect_uri: redirectUri(req)
                })
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) {
                console.error('GH token:', tokenData);
                return res.redirect('/editor?e=token');
            }

            const user = await gh.me(tokenData.access_token);
            session.github = {
                token: tokenData.access_token,
                login: user.login,
                owner: session.github?.owner || '',
                repo: session.github?.repo || '',
                branch: session.github?.branch || 'main'
            };

            await db.saveEditorGithubLink(session.user.id, {
                githubId: String(user.id),
                login: user.login,
                tokenEnc: encrypt(tokenData.access_token),
                scope: tokenData.scope || 'repo',
                linkedAt: Date.now()
            });

            res.redirect('/editor?e=ok');
        } catch (err) {
            console.error('GH callback:', err);
            res.redirect('/editor?e=fail');
        }
    });

    app.get('/api/editor/me', async (req, res) => {
        const session = await getSession(req, res);
        if (!session) return;
        const ctx = await githubCtx(session);
        res.json({
            discord: session.user.username,
            github: ctx.token ? ctx.login : null,
            linked: !!ctx.token,
            owner: ctx.owner,
            repo: ctx.repo,
            branch: ctx.branch
        });
    });

    app.get('/api/editor/repos', async (req, res) => {
        const session = await getSession(req, res);
        if (!session) return;
        try {
            const ctx = await githubCtx(session);
            if (!ctx.token) return res.status(400).json({ error: 'Conecte o GitHub.' });
            const repos = await gh.listRepos(ctx.token);
            res.json({ repos, count: repos.length });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    app.post('/api/editor/repo', async (req, res) => {
        const session = await getSession(req, res);
        if (!session) return;
        try {
            const owner = String(req.body.owner || '').trim();
            const repo = String(req.body.repo || '').trim();
            const branch = String(req.body.branch || 'main').trim() || 'main';
            if (!owner || !repo) return res.status(400).json({ error: 'Owner e repo obrigatórios' });

            session.github = session.github || {};
            session.github.owner = owner;
            session.github.repo = repo;
            session.github.branch = branch;

            await db.setEditorSelectedRepo(session.user.id, { owner, repo, branch });
            res.json({ success: true, owner, repo, branch });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/editor/test', async (req, res) => {
        const session = await getSession(req, res);
        if (!session) return;
        try {
            const ctx = await githubCtx(session);
            if (!ctx.token) return res.status(400).json({ error: 'Conecte o GitHub.' });
            if (ctx.owner && ctx.repo) {
                const r = await gh.getRepo(ctx.token, ctx.owner, ctx.repo);
                return res.json({ full_name: r.full_name, default_branch: r.default_branch });
            }
            const u = await gh.me(ctx.token);
            res.json({ login: u.login });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    app.post('/api/editor/disconnect', async (req, res) => {
        const session = await getSession(req, res);
        if (!session) return;
        await db.clearEditorGithubLink(session.user.id);
        delete session.github;
        res.json({ success: true });
    });

    app.post('/api/editor/chat', async (req, res) => {
        const session = await getSession(req, res);
        if (!session) return;
        try {
            const message = String(req.body.message || '').trim();
            if (!message) return res.status(400).json({ reply: 'Mensagem vazia.' });

            const ctx = await githubCtx(session);
            const result = await handleEditorMessage(message, ctx);

            if (result.setRepo) {
                session.github = session.github || {};
                Object.assign(session.github, result.setRepo);
                await db.setEditorSelectedRepo(session.user.id, result.setRepo);
            }

            res.json({ reply: result.reply || 'OK' });
        } catch (err) {
            console.error('editor chat:', err);
            res.status(500).json({ reply: 'Erro: ' + err.message, error: err.message });
        }
    });

    app.get('/editor', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        if (!(await db.canAccessEditor(session.user.id))) {
            return res
                .status(403)
                .send(
                    '<body style="background:#0b0b12;color:#eee;font-family:sans-serif;padding:40px">' +
                        '<h1>Sem permissão</h1><p>Use <code>!daracesso @você</code></p>' +
                        '<a href="/dashboard" style="color:#a78bfa">Voltar</a></body>'
                );
        }

        await githubCtx(session);
        const ctx = session.github || {};

        const botAvatarUrl = client?.user
            ? client.user.displayAvatarURL({ size: 128, extension: 'png' })
            : '';

        res.send(
            renderEditor({
                username: session.user.username,
                botAvatarUrl,
                meta: {
                    linked: !!ctx.token,
                    login: ctx.login || '',
                    owner: ctx.owner || '',
                    repo: ctx.repo || '',
                    branch: ctx.branch || 'main',
                    ghReady: !!(GH_ID && GH_SECRET),
                    callback: redirectUri(req),
                    flash: req.query.e || ''
                }
            })
        );
    });
};
