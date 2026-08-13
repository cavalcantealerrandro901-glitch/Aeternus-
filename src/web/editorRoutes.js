const crypto = require('crypto');
const { encrypt, decrypt } = require('../bot/utils/cryptoSecrets');
const githubEditor = require('../bot/utils/githubEditor');
const { handleEditorMessage } = require('../bot/utils/editorChat');
const db = require('../database/db');
const renderEditor = require('./views/editor');

const oauthStates = new Map();

function cleanStates() {
    const now = Date.now();
    for (const [k, v] of oauthStates) {
        if (now - v.at > 15 * 60 * 1000) oauthStates.delete(k);
    }
}

module.exports = function registerEditorRoutes(app, { sessions, isOwner, client }) {
    const GH_CLIENT_ID = (process.env.GITHUB_CLIENT_ID || '').trim();
    const GH_CLIENT_SECRET = (process.env.GITHUB_CLIENT_SECRET || '').trim();

    function panelBase(req) {
        if (process.env.PANEL_URL) return process.env.PANEL_URL.replace(/\/$/, '');
        if (process.env.GITHUB_REDIRECT_URI) {
            return process.env.GITHUB_REDIRECT_URI.replace(/\/auth\/github\/callback\/?$/, '');
        }
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        return `${proto}://${host}`;
    }

    function githubRedirectUri(req) {
        if (process.env.GITHUB_REDIRECT_URI) return process.env.GITHUB_REDIRECT_URI.trim();
        return `${panelBase(req)}/auth/github/callback`;
    }

    async function requireEditor(req, res) {
        const session = sessions[req.cookies?.sessionId];
        if (!session) {
            res.status(401).json({ error: 'Não autorizado. Faça login no Discord.' });
            return null;
        }
        const ok = await db.canAccessEditor(session.user.id);
        if (!ok) {
            res.status(403).json({ error: 'Sem permissão no Editor. Use !daracesso @user' });
            return null;
        }
        return session;
    }

    async function userGithubCtx(discordId) {
        const link = await db.getEditorGithubLink(discordId);
        if (!link?.tokenEnc) return { token: null, meta: null, link: null };
        let token = '';
        try {
            token = decrypt(link.tokenEnc);
        } catch {
            token = '';
        }
        if (!token) return { token: null, meta: null, link };
        return {
            token,
            meta: {
                owner: link.selected?.owner || '',
                repo: link.selected?.repo || '',
                branch: link.selected?.branch || 'main'
            },
            link
        };
    }

    app.get('/auth/github', async (req, res) => {
        try {
            const session = sessions[req.cookies?.sessionId];
            if (!session) return res.redirect('/login');
            if (!(await db.canAccessEditor(session.user.id))) {
                return res.status(403).send('Sem permissão no Editor.');
            }
            if (!GH_CLIENT_ID || !GH_CLIENT_SECRET) {
                return res.status(500).send('Configure GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET.');
            }

            cleanStates();
            const state = crypto.randomBytes(24).toString('hex');
            oauthStates.set(state, { discordId: String(session.user.id), at: Date.now() });

            const redirectUri = githubRedirectUri(req);
            const params = new URLSearchParams({
                client_id: GH_CLIENT_ID,
                redirect_uri: redirectUri,
                scope: 'repo user:email read:user',
                state,
                allow_signup: 'true'
            });
            res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
        } catch (err) {
            console.error('auth/github:', err);
            res.status(500).send('Erro GitHub: ' + err.message);
        }
    });

    app.get('/auth/github/callback', async (req, res) => {
        const session = sessions[req.cookies?.sessionId];
        if (!session) return res.redirect('/login');

        const { code, state, error } = req.query;
        if (error) return res.redirect('/editor?gh=denied');
        if (!code || !state) return res.redirect('/editor?gh=error');

        const st = oauthStates.get(String(state));
        oauthStates.delete(String(state));
        if (!st || String(st.discordId) !== String(session.user.id)) {
            return res.redirect('/editor?gh=state');
        }

        try {
            const redirectUri = githubRedirectUri(req);
            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: GH_CLIENT_ID,
                    client_secret: GH_CLIENT_SECRET,
                    code: String(code),
                    redirect_uri: redirectUri
                })
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) {
                console.error('GitHub token error:', tokenData);
                return res.redirect('/editor?gh=token_error');
            }

            const scope = String(tokenData.scope || '');
            const ghUser = await githubEditor.getAuthenticatedUser(tokenData.access_token);

            await db.saveEditorGithubLink(session.user.id, {
                githubId: String(ghUser.id),
                login: ghUser.login,
                tokenEnc: encrypt(tokenData.access_token),
                scope: scope || 'repo',
                linkedAt: Date.now()
            });

            session.github = { login: ghUser.login, id: ghUser.id };
            res.redirect('/editor?gh=ok');
        } catch (err) {
            console.error('GitHub OAuth callback:', err);
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
            res.json({ repos, login: ctx.link?.login || null });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    app.post('/api/editor/repo', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        try {
            const session = sessions[req.cookies?.sessionId];
            let owner = (req.body.owner || '').trim();
            let repo = (req.body.repo || '').trim();
            const branch = (req.body.branch || 'main').trim() || 'main';
            if ((!owner || !repo) && req.body.full_name) {
                const parts = String(req.body.full_name).split('/');
                owner = parts[0] || owner;
                repo = parts[1] || repo;
            }
            if (!owner || !repo) {
                return res.status(400).json({ error: 'Owner e repo obrigatórios' });
            }
            await db.setEditorSelectedRepo(session.user.id, { owner, repo, branch });
            const doc = await db.getEditorConfig();
            await db.saveEditorConfig({
                github: {
                    ...(doc.github?.toObject?.() || doc.github || {}),
                    owner,
                    repo,
                    branch
                }
            });
            res.json({ success: true, owner, repo, branch });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/editor/test', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        try {
            const session = sessions[req.cookies?.sessionId];
            const ctx = await userGithubCtx(session.user.id);
            if (!ctx.token) return res.status(400).json({ error: 'Conecte o GitHub primeiro.' });
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

    app.post('/api/editor/chat', async (req, res) => {
        if (!(await requireEditor(req, res))) return;
        try {
            const session = sessions[req.cookies?.sessionId];
            const message = String(req.body.message || '');
            const doc = await db.getEditorConfig();
            let cfg = doc.toObject ? doc.toObject() : { ...doc };

            const ctx = await userGithubCtx(session.user.id);
            if (ctx.token) {
                cfg = {
                    ...cfg,
                    github: {
                        ...(cfg.github || {}),
                        owner: ctx.meta.owner || cfg.github?.owner,
                        repo: ctx.meta.repo || cfg.github?.repo,
                        branch: ctx.meta.branch || cfg.github?.branch || 'main',
                        _runtimeToken: ctx.token
                    }
                };
            }

            const saveConfig = async (data) => {
                const payload = {
                    github: {
                        owner: data.github?.owner,
                        repo: data.github?.repo,
                        branch: data.github?.branch
                    },
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
                    branch: cfg.github?.branch
                },
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
                    '<h1>Acesso negado</h1><p>Libere com <code>!daracesso @você</code>.</p>' +
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

        res.send(
            renderEditor({
                user: session.user,
                userAvatarUrl,
                botAvatarUrl,
                editorMeta: {
                    owner: link?.selected?.owner || doc.github?.owner || '',
                    repo: link?.selected?.repo || doc.github?.repo || '',
                    branch: link?.selected?.branch || doc.github?.branch || 'main',
                    hasToken: !!link?.tokenEnc,
                    githubLinked: !!link?.tokenEnc,
                    githubLogin: link?.login || '',
                    githubScope: link?.scope || '',
                    isOwner: isOwner(session.user),
                    ghClientConfigured: !!(GH_CLIENT_ID && GH_CLIENT_SECRET),
                    ghStatus: req.query.gh || '',
                    redirectHint: githubRedirectUri(req)
                }
            })
        );
    });
};
