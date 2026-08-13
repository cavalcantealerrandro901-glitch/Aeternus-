const crypto = require('crypto');
const { encrypt, decrypt } = require('../bot/utils/cryptoSecrets');
const gh = require('../bot/utils/githubApi');
const { handleEditorMessage } = require('../bot/utils/editorChat');
const db = require('../database/db');
const renderEditor = require('./views/editor');

function signState(payload) {
    const key = process.env.EDITOR_SECRET_KEY || process.env.TOKEN || 'aeternus';
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', key).update(body).digest('base64url');
    return body + '.' + sig;
}

function verifyState(state) {
    try {
        const [body, sig] = String(state || '').split('.');
        if (!body || !sig) return null;
        const key = process.env.EDITOR_SECRET_KEY || process.env.TOKEN || 'aeternus';
        const expect = crypto.createHmac('sha256', key).update(body).digest('base64url');
        if (expect !== sig) return null;
        const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        if (!data.uid || !data.at) return null;
        if (Date.now() - data.at > 15 * 60 * 1000) return null;
        return data;
    } catch {
        return null;
    }
}

module.exports = function registerEditorRoutes(app, { sessions, isOwner, client }) {
    const GH_ID = (process.env.GITHUB_CLIENT_ID || '').trim();
    const GH_SECRET = (process.env.GITHUB_CLIENT_SECRET || '').trim();

    function redirectUri(req) {
        const fromEnv = (process.env.GITHUB_REDIRECT_URI || '').trim();
        if (fromEnv) return fromEnv;
        const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
        const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
        return `${proto}://${host}/auth/github/callback`;
    }

    function cookieOpts() {
        return {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 14,
            path: '/'
        };
    }

    async function getSession(req, res) {
        const session = sessions[req.cookies?.sessionId];
        if (!session?.user) {
            if (res) res.status(401).json({ error: 'Sessão Discord expirada. Entre de novo no painel.' });
            return null;
        }
        if (!(await db.canAccessEditor(session.user.id))) {
            if (res) res.status(403).json({ error: 'Sem permissão. Use !daracesso @você' });
            return null;
        }
        return session;
    }

    async function githubCtx(session) {
        if (session.github?.token) {
            return {
                token: session.github.token,
                login: session.github.login || '',
                owner: session.github.owner || '',
                repo: session.github.repo || '',
                branch: session.github.branch || 'main'
            };
        }
        try {
            const link = await db.getEditorGithubLink(session.user.id);
            if (!link?.tokenEnc) {
                return { token: null, login: '', owner: '', repo: '', branch: 'main' };
            }
            const token = decrypt(link.tokenEnc);
            if (!token) {
                return { token: null, login: link.login || '', owner: '', repo: '', branch: 'main' };
            }
            session.github = {
                token,
                login: link.login,
                owner: link.selected?.owner || '',
                repo: link.selected?.repo || '',
                branch: link.selected?.branch || 'main'
            };
            return {
                token,
                login: link.login || '',
                owner: link.selected?.owner || '',
                repo: link.selected?.repo || '',
                branch: link.selected?.branch || 'main'
            };
        } catch (err) {
            console.error('githubCtx:', err.message);
            return { token: null, login: '', owner: '', repo: '', branch: 'main' };
        }
    }

    // ——— OAuth GitHub ———
    app.get('/auth/github', async (req, res) => {
        try {
            const session = sessions[req.cookies?.sessionId];
            if (!session?.user) return res.redirect('/login');
            if (!(await db.canAccessEditor(session.user.id))) {
                return res.status(403).send('Sem permissão no Editor. Use !daracesso no Discord.');
            }
            if (!GH_ID || !GH_SECRET) {
                return res
                    .status(500)
                    .send(
                        'Faltam GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET no Render.\n' +
                            'Callback deve ser: ' +
                            redirectUri(req)
                    );
            }

            // reforça cookie da sessão antes de sair para o GitHub
            if (req.cookies?.sessionId) {
                res.cookie('sessionId', req.cookies.sessionId, cookieOpts());
            }

            const state = signState({ uid: String(session.user.id), at: Date.now() });
            const params = new URLSearchParams({
                client_id: GH_ID,
                redirect_uri: redirectUri(req),
                scope: 'repo read:user',
                state,
                allow_signup: 'true'
            });
            res.redirect('https://github.com/login/oauth/authorize?' + params.toString());
        } catch (err) {
            console.error('/auth/github:', err);
            res.status(500).send('Erro ao iniciar login GitHub: ' + err.message);
        }
    });

    app.get('/auth/github/callback', async (req, res) => {
        try {
            const { code, state, error, error_description } = req.query;
            if (error) {
                console.error('GH oauth error:', error, error_description);
                return res.redirect('/editor?e=denied');
            }
            if (!code || !state) return res.redirect('/editor?e=code');

            const st = verifyState(state);
            if (!st) return res.redirect('/editor?e=state');

            const session = sessions[req.cookies?.sessionId];
            // se perdeu a sessão Discord, ainda salva o token no userId do state
            const discordId = st.uid;

            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: GH_ID,
                    client_secret: GH_SECRET,
                    code: String(code),
                    redirect_uri: redirectUri(req)
                })
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) {
                console.error('GH token body:', tokenData);
                return res.redirect('/editor?e=token');
            }

            const user = await gh.me(tokenData.access_token);

            await db.saveEditorGithubLink(discordId, {
                githubId: String(user.id),
                login: user.login,
                tokenEnc: encrypt(tokenData.access_token),
                scope: tokenData.scope || 'repo',
                linkedAt: Date.now()
            });

            if (session?.user && String(session.user.id) === String(discordId)) {
                session.github = {
                    token: tokenData.access_token,
                    login: user.login,
                    owner: session.github?.owner || '',
                    repo: session.github?.repo || '',
                    branch: session.github?.branch || 'main'
                };
                return res.redirect('/editor?e=ok');
            }

            // sessão Discord sumiu — pede login de novo, token já está salvo
            return res.redirect('/login');
        } catch (err) {
            console.error('GH callback:', err);
            return res.redirect('/editor?e=fail');
        }
    });

    // ——— APIs ———
    app.get('/api/editor/me', async (req, res) => {
        try {
            const session = await getSession(req, res);
            if (!session) return;
            const ctx = await githubCtx(session);
            res.json({
                ok: true,
                discord: session.user.username,
                github: ctx.token ? ctx.login : null,
                linked: !!ctx.token,
                owner: ctx.owner,
                repo: ctx.repo,
                branch: ctx.branch
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/editor/repos', async (req, res) => {
        try {
            const session = await getSession(req, res);
            if (!session) return;
            const ctx = await githubCtx(session);
            if (!ctx.token) return res.status(400).json({ error: 'Conecte o GitHub primeiro.' });
            const repos = await gh.listRepos(ctx.token);
            res.json({ ok: true, repos, count: repos.length });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    app.post('/api/editor/repo', async (req, res) => {
        try {
            const session = await getSession(req, res);
            if (!session) return;
            const owner = String(req.body.owner || '').trim();
            const repo = String(req.body.repo || '').trim();
            const branch = String(req.body.branch || 'main').trim() || 'main';
            if (!owner || !repo) return res.status(400).json({ error: 'Owner e repo obrigatórios' });

            session.github = session.github || {};
            session.github.owner = owner;
            session.github.repo = repo;
            session.github.branch = branch;
            await db.setEditorSelectedRepo(session.user.id, { owner, repo, branch });
            res.json({ ok: true, success: true, owner, repo, branch });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/editor/test', async (req, res) => {
        try {
            const session = await getSession(req, res);
            if (!session) return;
            const ctx = await githubCtx(session);
            if (!ctx.token) return res.status(400).json({ error: 'Conecte o GitHub.' });
            if (ctx.owner && ctx.repo) {
                const r = await gh.getRepo(ctx.token, ctx.owner, ctx.repo);
                return res.json({ ok: true, full_name: r.full_name, default_branch: r.default_branch });
            }
            const u = await gh.me(ctx.token);
            res.json({ ok: true, login: u.login });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    app.post('/api/editor/disconnect', async (req, res) => {
        try {
            const session = await getSession(req, res);
            if (!session) return;
            await db.clearEditorGithubLink(session.user.id);
            delete session.github;
            res.json({ ok: true, success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // chat SEMPRE devolve JSON { reply } — nunca deixa o front sem resposta
    app.post('/api/editor/chat', async (req, res) => {
        try {
            const session = await getSession(req, res);
            if (!session) return;

            const message = String(req.body?.message ?? '').trim();
            if (!message) {
                return res.json({ reply: 'Mensagem vazia. Digite ajuda.' });
            }

            const ctx = await githubCtx(session);
            const result = await handleEditorMessage(message, ctx);

            if (result?.setRepo) {
                session.github = session.github || {};
                Object.assign(session.github, result.setRepo);
                try {
                    await db.setEditorSelectedRepo(session.user.id, result.setRepo);
                } catch {}
            }

            return res.json({ reply: String(result?.reply || 'OK') });
        } catch (err) {
            console.error('editor chat fatal:', err);
            return res.status(200).json({ reply: 'Erro interno: ' + (err.message || String(err)) });
        }
    });

    app.get('/editor', async (req, res) => {
        try {
            const session = sessions[req.cookies?.sessionId];
            if (!session) return res.redirect('/login');

            if (!(await db.canAccessEditor(session.user.id))) {
                return res
                    .status(403)
                    .send(
                        '<body style="background:#0b0b12;color:#eee;font-family:sans-serif;padding:40px">' +
                            '<h1>Sem permissão</h1><p>No Discord: <code>!daracesso @você</code></p>' +
                            '<a href="/dashboard" style="color:#a78bfa">Voltar</a></body>'
                    );
            }

            const ctx = await githubCtx(session);
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
                        flash: String(req.query.e || '')
                    }
                })
            );
        } catch (err) {
            console.error('/editor page:', err);
            res.status(500).send('Erro ao abrir editor: ' + err.message);
        }
    });
};
