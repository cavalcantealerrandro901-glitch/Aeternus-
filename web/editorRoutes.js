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

/** Detecta se o pedido é para editar/ajustar código */
function isEditRequest(msg) {
    return /\b(edit|editar|ajusta|ajustar|corrija|corrigir|modifica|modificar|muda|mudar|altera|alterar|refatora|refatorar|reescrev|implementa|adiciona|remove|conserta|fix|patch|atualiza)\b/i.test(
        msg
    );
}

/** Extrai caminhos de arquivo da mensagem */
function extractPaths(msg) {
    const found = new Set();
    const re =
        /(?:^|[\s"'`(])((?:commands|utils|web|tools|systems|events|bot|public|data|js)\/[\w./-]+\.[a-z0-9]+|[\w.-]+\/(?:[\w./-]+\.)+[a-z0-9]+)/gi;
    let m;
    while ((m = re.exec(msg))) found.add(m[1].replace(/^["'`(]+|["'`)]+$/g, ''));
    // caminhos simples tipo rob.js, banco.js se citados com editar
    const simple = msg.match(/(?:arquivo|file)\s+["'`]?([\w./-]+\.[a-z0-9]+)/i);
    if (simple) found.add(simple[1]);
    return [...found];
}

function readFileSafe(rel) {
    try {
        const r = shell.cat(rel, { max: 24_000 });
        if (!r.ok) return { path: rel, error: r.error };
        return { path: r.path || rel, content: r.content, truncated: r.truncated };
    } catch (e) {
        return { path: rel, error: e.message };
    }
}

/**
 * Monta contexto: sempre lê o arquivo aberto e/ou os citados
 * antes de pedir resposta ao JARVIS.
 */
function buildFileContext({ message, currentPath, editorContent }) {
    const files = [];
    const paths = extractPaths(message);

    if (currentPath) paths.unshift(String(currentPath));

    // únicos
    const seen = new Set();
    for (const p of paths) {
        const key = String(p).replace(/^\.\//, '');
        if (!key || seen.has(key)) continue;
        seen.add(key);

        // se é o arquivo aberto e o client mandou o buffer, usa o buffer (pode ter edits não salvos)
        if (
            currentPath &&
            key === String(currentPath).replace(/^\.\//, '') &&
            typeof editorContent === 'string' &&
            editorContent.length
        ) {
            files.push({
                path: key,
                content: editorContent.slice(0, 24_000),
                source: 'editor-buffer'
            });
            continue;
        }

        const r = readFileSafe(key);
        files.push(r);
    }

    // pedido de edição sem path → ainda assim lê o arquivo aberto se houver
    if (!files.length && currentPath) {
        if (typeof editorContent === 'string' && editorContent.length) {
            files.push({
                path: currentPath,
                content: editorContent.slice(0, 24_000),
                source: 'editor-buffer'
            });
        } else {
            files.push(readFileSafe(currentPath));
        }
    }

    return files;
}

function formatFilesForPrompt(files) {
    if (!files.length) return '';
    const parts = ['\n\n=== ARQUIVOS LIDOS (leia isto ANTES de responder) ==='];
    for (const f of files) {
        if (f.error) {
            parts.push(`\n--- ${f.path} ---\n[ERRO ao ler: ${f.error}]`);
            continue;
        }
        parts.push(
            `\n--- ${f.path} (${f.source || 'disco'}${f.truncated ? ', truncado' : ''}) ---\n${f.content}`
        );
    }
    parts.push('\n=== FIM DOS ARQUIVOS ===\n');
    return parts.join('');
}

async function askJarvis(message, persona, fileContext) {
    const editHint = isEditRequest(message)
        ? '\nO usuário pediu EDITAR/AJUSTAR. Você JÁ TEM o conteúdo do arquivo acima. Baseie a resposta no código lido. Se propor mudança, mostre o trecho completo em bloco ```...``` com o path no início se possível.'
        : '';

    const extra = [
        '[Editor Aeternus]',
        'Fale de boa, gíria e palavrão liberados.',
        'REGRA: se o usuário pedir editar/ajustar/corrigir um arquivo, o conteúdo JÁ FOI LIDO e está no contexto — use esse conteúdo, não invente o arquivo.',
        'Pode sugerir ls/cat/nano/npm quando fizer sentido.',
        editHint,
        fileContext,
        '\nPedido do usuário:\n'
    ].join('\n');

    if (typeof ai.fetchPublicAIResponse === 'function') {
        return await ai.fetchPublicAIResponse(extra + message, persona);
    }
    const r = await ai.fetchJarvisReply(extra + message, persona, []);
    if (!r) return null;
    return typeof r === 'string' ? r : r.text || null;
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

            const currentPath = req.body?.currentPath ? String(req.body.currentPath) : null;
            const editorContent =
                req.body?.editorContent != null ? String(req.body.editorContent) : null;

            // 1) Lê arquivo(s) PRIMEIRO
            const files = buildFileContext({ message: msg, currentPath, editorContent });
            const fileContext = formatFilesForPrompt(files);

            // 2) Só então chama a IA com o conteúdo
            const reply = await askJarvis(msg, req.body?.persona || 'default', fileContext);

            res.json({
                ok: true,
                reply: reply || '… deu ruim, tenta de novo.',
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
    console.log('🛠️  [web] Editor API em /api/editor/*');
}

module.exports = { registerEditorRoutes };
