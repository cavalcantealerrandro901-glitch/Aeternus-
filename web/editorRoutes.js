const express = require('express');
const shell = require('../utils/aiShell');
const ai = require('../utils/aeternusAI');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireEditorOwner } = require('./auth');

function panelAuth(req, res, next) {
    const secret = String(process.env.PANEL_SECRET || process.env.EDITOR_SECRET || '').trim();
    if (!secret) return next();
    const got = req.headers['x-panel-secret'] || req.query.secret || req.body?.secret || '';
    if (String(got) !== secret) return res.status(401).json({ ok: false, error: 'secret inválido' });
    next();
}

function env(n) {
    return String(process.env[n] || '').trim();
}

function isCodeWriteRequest(msg) {
    return /\b(edit|editar|ajusta|ajustar|corrija|corrigir|modifica|modificar|muda|mudar|altera|alterar|refatora|refatorar|reescrev|implementa|adiciona|remove|conserta|conserte|consertar|fix|patch|atualiza|cria|criar|create|gere|gerar|escreva|escrever|salva|salvar|novo\s+comando|novo\s+arquivo|faz\s+o\s+comando|fa[cç]a|resolve|resolver|quebra|quebrado|bug|erro|error|syntaxerror|typeerror|cannot find|module_not_found|n[aã]o\s+funciona|nao\s+sobe|deploy)\b/i.test(
        msg
    );
}

function isErrorFixRequest(msg) {
    return (
        /\b(erro|error|syntaxerror|typeerror|referenceerror|bug|quebra|quebrado|falha|failed|exception|stack|cannot find|module_not_found|n[aã]o\s+(funciona|sobe|inicia)|conserta|conserte|consertar|corrija|corrigir|fix)\b/i.test(
            msg
        ) ||
        /at\s+[\w./]+:\d+/i.test(msg) ||
        /\/app\/[\w./-]+\.js:\d+/i.test(msg)
    );
}

function extractPaths(msg) {
    const found = new Set();
    const re =
        /(?:^|[\s"'`(])((?:commands|utils|web|tools|systems|events|bot|public|data|js)\/[\w./-]+\.[a-z0-9]+)/gi;
    let m;
    while ((m = re.exec(msg))) found.add(m[1].replace(/^["'`(]+|["'`)]+$/g, ''));

    const stackRe =
        /(?:\/app\/|\(\s*|\s)((?:commands|utils|web|tools|systems|events|bot|public|data)[\/][\w./-]+\.[a-z]+):\d+/gi;
    while ((m = stackRe.exec(msg))) found.add(m[1].replace(/^\/+/, ''));

    const simple = msg.match(/(?:arquivo|file|comando)\s+["'`]?([\w./-]+\.[a-z0-9]+)/i);
    if (simple) found.add(simple[1]);

    const cmdName = msg.match(/(?:comando|command)\s+["'`]?([a-z0-9_-]+)/i);
    if (cmdName) found.add('commands/' + cmdName[1].toLowerCase() + '.js');

    return [...found];
}

function readFileSafe(rel) {
    try {
        const r = shell.cat(rel, { max: 40_000 });
        if (!r.ok) return { path: rel, error: r.error };
        return { path: r.path || rel, content: r.content, truncated: r.truncated };
    } catch (e) {
        return { path: rel, error: e.message };
    }
}

function buildFileContext({ message, currentPath, editorContent }) {
    const files = [];
    const paths = extractPaths(message);
    if (currentPath) paths.unshift(String(currentPath));

    const seen = new Set();
    for (const p of paths) {
        const key = String(p).replace(/^\.\//, '').replace(/^app\//, '');
        if (!key || seen.has(key)) continue;
        seen.add(key);

        if (
            currentPath &&
            key === String(currentPath).replace(/^\.\//, '') &&
            typeof editorContent === 'string' &&
            editorContent.length
        ) {
            files.push({ path: key, content: editorContent.slice(0, 40_000), source: 'editor-buffer' });
            continue;
        }
        files.push(readFileSafe(key));
    }

    if (!files.length && currentPath) {
        if (typeof editorContent === 'string' && editorContent.length) {
            files.push({ path: currentPath, content: editorContent.slice(0, 40_000), source: 'editor-buffer' });
        } else {
            files.push(readFileSafe(currentPath));
        }
    }
    return files;
}

function formatFilesForPrompt(files) {
    if (!files.length) return '';
    const parts = ['\n\n=== CÓDIGO DO PROJETO (use isto) ==='];
    for (const f of files) {
        if (f.error) {
            parts.push(`\n--- ${f.path} ---\n[ERRO AO LER: ${f.error}]`);
            continue;
        }
        parts.push(`\n--- ${f.path} (${f.source || 'disco'}) ---\n${f.content}`);
    }
    parts.push('\n=== FIM ===\n');
    return parts.join('');
}

function extractWritableBlocks(reply, fallbackPath) {
    const out = [];
    const re = /```([\w.+-]*)?(?:\s*:?\s*([\w./\\-]+\.[a-z0-9]+))?\s*\n([\s\S]*?)```/gi;
    let m;
    while ((m = re.exec(reply))) {
        const lang = (m[1] || '').trim();
        let pathHint = (m[2] || '').trim().replace(/^[:\s]+/, '');
        let code = m[3] || '';
        const firstLine = code.split('\n')[0] || '';
        const fileLine = firstLine.match(
            /^\s*(?:\/\/|#)\s*(?:FILE|PATH|ARQUIVO)\s*:?\s*([\w./\\-]+\.[a-z0-9]+)/i
        );
        if (fileLine) {
            pathHint = fileLine[1];
            code = code.split('\n').slice(1).join('\n');
        }
        code = code.replace(/^\n+/, '').replace(/\n+$/, '');
        if (!code.trim()) continue;
        if (code.trim().split('\n').length < 2 && code.length < 30 && !pathHint) continue;

        let target = pathHint || fallbackPath || '';
        if (!target && lang && /[\/]/.test(lang) && /\.[a-z0-9]+$/i.test(lang)) target = lang;
        if (!target) continue;

        target = String(target).replace(/^\.\//, '').replace(/\\/g, '/').replace(/^app\//, '');
        if (target.startsWith('/')) target = target.slice(1);
        out.push({ path: target, code, lang });
    }
    return out;
}

/* ── GitHub: commit pra o Render puxar deploy ── */

function ghConfig() {
    const token = env('GITHUB_TOKEN') || env('GH_TOKEN');
    const owner = env('GITHUB_OWNER') || 'cavalcantealerrandro901-glitch';
    const repo = env('GITHUB_REPO') || 'Aeternus-';
    const branch = env('GITHUB_BRANCH') || 'main';
    if (!token) return null;
    return { token, owner, repo, branch };
}

async function githubPutFile(relPath, content, message) {
    const cfg = ghConfig();
    if (!cfg) {
        return {
            ok: false,
            error: 'GITHUB_TOKEN não configurado no Render — arquivo só no disco local (some no redeploy)'
        };
    }

    const apiBase = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${relPath}`;
    const headers = {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Aeternus-Editor',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
    };

    let sha;
    try {
        const getRes = await fetch(`${apiBase}?ref=${cfg.branch}`, { headers });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }
    } catch (_) {}

    const body = {
        message: message || `Aeternus editor: ${relPath}`,
        content: Buffer.from(String(content), 'utf8').toString('base64'),
        branch: cfg.branch
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(apiBase, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
    });
    const putData = await putRes.json().catch(() => ({}));
    if (!putRes.ok) {
        return {
            ok: false,
            error: putData.message || `GitHub ${putRes.status}`
        };
    }
    return {
        ok: true,
        commit: putData.commit?.sha,
        url: putData.content?.html_url || putData.commit?.html_url
    };
}

async function writeBlocksToDiskAndGitHub(blocks) {
    const written = [];
    for (const b of blocks) {
        const item = { path: b.path, ok: false };
        try {
            const result = shell.writeFile(b.path, b.code);
            if (!result.ok) {
                item.error = result.error || 'falha local';
                written.push(item);
                continue;
            }
            item.ok = true;
            item.bytes = result.bytes;
            item.path = result.path || b.path;

            const gh = await githubPutFile(
                item.path,
                b.code,
                `Aeternus IA: atualiza ${item.path}`
            );
            item.github = gh;
        } catch (e) {
            item.error = e.message;
        }
        written.push(item);
    }
    return written;
}

function syntaxCheck(relPath) {
    return new Promise((resolve) => {
        try {
            const abs = path.join(shell.ROOT || process.cwd(), relPath);
            if (!fs.existsSync(abs)) return resolve({ ok: false, error: 'arquivo não existe' });
            execFile('node', ['--check', abs], { timeout: 8000 }, (err, stdout, stderr) => {
                if (err) resolve({ ok: false, error: String(stderr || err.message).slice(0, 500) });
                else resolve({ ok: true });
            });
        } catch (e) {
            resolve({ ok: false, error: e.message });
        }
    });
}

async function askAI(message, fileContext, { wantWrite, fallbackPath, isFix }) {
    const rules = [
        'Você é uma IA de código completa (nível Grok): analisa e CONCERTA.',
        'Português do Brasil, direto e agressivo quando o código estiver zoado.',
        'Nunca diga só "verifique" — aplique o fix e entregue o arquivo inteiro.',
        isFix
            ? 'MODO CONSERTO: o usuário mandou erro/log. Reescreva o arquivo CORRETO por completo.'
            : '',
        wantWrite
            ? [
                  'MODO GRAVAÇÃO — arquivo completo:',
                  '```js caminho/arquivo.js',
                  '// código inteiro',
                  '```',
                  fallbackPath ? 'Arquivo principal: ' + fallbackPath : '',
                  'Depois: 2–4 linhas do bug e do que mudou.'
              ].join('\n')
            : 'Se envolver código quebrado, proponha o fix completo com path no bloco.'
    ]
        .filter(Boolean)
        .join('\n');

    const extra = ['[Aeternus Editor AI]', rules, fileContext, '\nPedido:\n'].join('\n');

    if (typeof ai.fetchPublicAIResponse === 'function') {
        return await ai.fetchPublicAIResponse(extra + message, 'editor');
    }
    const r = await ai.fetchJarvisReply(extra + message, 'editor', []);
    if (!r) return null;
    return typeof r === 'string' ? r : r.text || null;
}

function registerEditorRoutes(app) {
    const r = express.Router();
    r.use(panelAuth);
    r.use(requireAuth);
    r.use(requireEditorOwner);

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

    r.post('/write', async (req, res) => {
        try {
            const p = req.body?.path;
            if (!p) return res.status(400).json({ ok: false, error: 'path obrigatório' });
            const content = req.body?.content ?? '';
            const local = shell.writeFile(p, content);
            const github = await githubPutFile(p, content, `Aeternus editor: ${p}`);
            res.json({ ...local, github });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    r.post('/exec', async (req, res) => {
        try {
            const line = req.body?.cmd || req.body?.line || '';
            res.json(await shell.execLine(line));
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    r.post('/chat', async (req, res) => {
        try {
            const msg = String(req.body?.message || '').trim();
            if (!msg) return res.status(400).json({ ok: false, error: 'message vazio' });

            const currentPath = req.body?.currentPath ? String(req.body.currentPath) : null;
            const editorContent =
                req.body?.editorContent != null ? String(req.body.editorContent) : null;

            const isFix = isErrorFixRequest(msg);
            const wantWrite = isCodeWriteRequest(msg) || isFix;

            const files = buildFileContext({ message: msg, currentPath, editorContent });
            const fileContext = formatFilesForPrompt(files);

            let fallbackPath = currentPath || null;
            if (!fallbackPath && files.length && files[0].path && !files[0].error) {
                fallbackPath = files[0].path;
            }
            if (!fallbackPath) {
                const paths = extractPaths(msg);
                if (paths.length) fallbackPath = paths[0].replace(/^app\//, '');
            }

            const reply = await askAI(msg, fileContext, { wantWrite, fallbackPath, isFix });
            const text = reply || 'IA não respondeu. Confere GROQ_API_KEY no Render.';

            let written = [];
            if (wantWrite) {
                let blocks = extractWritableBlocks(text, fallbackPath);
                if (!blocks.length && fallbackPath) {
                    const loose = /```[\w.+-]*\n([\s\S]*?)```/.exec(text);
                    if (loose && loose[1] && loose[1].trim().length > 40) {
                        blocks = [{ path: fallbackPath, code: loose[1].replace(/\n+$/, ''), lang: 'js' }];
                    }
                }
                if (blocks.length) written = await writeBlocksToDiskAndGitHub(blocks);
            }

            const checks = [];
            for (const w of written) {
                if (!w.ok || !/\.js$/i.test(w.path || '')) continue;
                const c = await syntaxCheck(w.path);
                checks.push({ path: w.path, ...c });
            }

            const ghOk = written.filter((w) => w.github && w.github.ok).length;
            const ghMissing = !ghConfig();

            res.json({
                ok: true,
                reply: text,
                written,
                syntaxChecks: checks,
                githubConfigured: !ghMissing,
                githubCommits: ghOk,
                readFiles: files.map((f) => ({
                    path: f.path,
                    ok: !f.error,
                    error: f.error || null,
                    source: f.source || (f.error ? null : 'disk'),
                    chars: f.content ? f.content.length : 0
                }))
            });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    app.use('/api/editor', r);
    const gh = ghConfig();
    console.log(
        '🛠️  [web] Editor chat · GitHub ' +
            (gh ? `ok (${gh.owner}/${gh.repo}@${gh.branch})` : 'MISSING GITHUB_TOKEN')
    );
}

module.exports = { registerEditorRoutes };
