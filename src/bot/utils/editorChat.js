const github = require('./githubEditor');
const { encrypt, decrypt } = require('./cryptoSecrets');
const { resolveApiConfig } = require('./ai');

function extractJsonBlock(text) {
    if (!text) return null;
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fence ? fence[1].trim() : text.trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
        return JSON.parse(raw.slice(start, end + 1));
    } catch {
        return null;
    }
}

function userCtxFrom(cfg, opts = {}) {
    const token = opts.userToken || cfg?.github?._runtimeToken || null;
    const meta = opts.userMeta || {
        owner: cfg?.github?.owner,
        repo: cfg?.github?.repo,
        branch: cfg?.github?.branch || 'main'
    };
    return { token, ...meta };
}

async function executeActions(actions, editorConfig, saveConfig, opts = {}) {
    const logs = [];
    let cfg = editorConfig;
    const uctx = () => userCtxFrom(cfg, opts);

    for (const action of actions || []) {
        const type = String(action.type || '').toLowerCase();
        try {
            if (type === 'set_repo') {
                cfg.github = cfg.github || {};
                if (action.owner) cfg.github.owner = String(action.owner).trim();
                if (action.repo) cfg.github.repo = String(action.repo).trim();
                if (action.branch) cfg.github.branch = String(action.branch).trim();
                await saveConfig(cfg);
                logs.push(
                    `Repo: ${cfg.github.owner}/${cfg.github.repo} (${cfg.github.branch || 'main'})`
                );
            } else if (type === 'set_secret') {
                const name = String(action.name || '').trim().toUpperCase();
                const value = String(action.value || '');
                if (!name || !value) {
                    logs.push('set_secret sem nome/valor');
                    continue;
                }
                cfg.secrets = cfg.secrets || [];
                const idx = cfg.secrets.findIndex((s) => s.name === name);
                const entry = { name, valueEnc: encrypt(value), updatedAt: Date.now() };
                if (idx >= 0) cfg.secrets[idx] = entry;
                else cfg.secrets.push(entry);
                await saveConfig(cfg);
                logs.push(`Segredo ${name} salvo`);
            } else if (type === 'list') {
                const files = await github.listFiles(cfg, action.path || '', uctx());
                const lines = files
                    .slice(0, 40)
                    .map((f) => (f.type === 'dir' ? '📁 ' : '📄 ') + f.path);
                logs.push('Lista:\n' + (lines.join('\n') || '(vazio)'));
            } else if (type === 'read') {
                const file = await github.getFile(cfg, action.path, uctx());
                const body = file.decoded || '';
                const cut = body.length > 5000 ? body.slice(0, 5000) + '\n…' : body;
                logs.push(`Lido ${file.path}:\n\`\`\`\n${cut}\n\`\`\``);
            } else if (type === 'write' || type === 'create' || type === 'edit') {
                const path = action.path;
                const content = action.content ?? '';
                if (!path) {
                    logs.push('write sem path');
                    continue;
                }
                await github.putFile(
                    cfg,
                    path,
                    content,
                    action.message || `Aeternus AI Editor: ${path}`,
                    uctx()
                );
                logs.push(`Arquivo ${path} gravado`);
            } else if (type === 'delete') {
                await github.deleteFile(cfg, action.path, action.message, uctx());
                logs.push(`Removido ${action.path}`);
            } else if (type === 'test_repo') {
                const info = await github.testConnection(cfg, uctx());
                logs.push(
                    info.full_name
                        ? `OK: ${info.full_name}`
                        : `GitHub: ${info.login || 'conectado'}`
                );
            } else if (type === 'reply') {
                if (action.text) logs.push(String(action.text));
            } else if (type === 'deploy') {
                logs.push('Deploy: o Render atualiza sozinho no push.');
            } else {
                logs.push(`Ação desconhecida: ${type}`);
            }
        } catch (err) {
            logs.push(`${type}: ${err.message}`);
        }
    }

    return { logs, cfg };
}

async function handleWithAI(message, editorConfig, saveConfig, opts = {}) {
    const { apiKey } = await resolveApiConfig();
    if (!apiKey) {
        return {
            reply:
                'IA do Editor sem chave. Defina AI_API_KEY no Render. Conecte o GitHub pelo botão da página.'
        };
    }

    const g = editorConfig.github || {};
    const linked = !!(opts.userToken || g._runtimeToken || g.tokenEnc);
    const secretsNames = (editorConfig.secrets || []).map((s) => s.name).join(', ') || 'nenhum';

    const system =
        'Você é o Editor IA do Aeternus. O usuário descreve o que quer no código.\n' +
        'Responda com um JSON: {"reply":"texto curto","actions":[...]}\n' +
        'Ações: set_repo, list, read, write, delete, test_repo, reply, set_secret.\n' +
        'Em write envie o arquivo completo. Não invente tokens.\n' +
        `Repo: ${g.owner || '—'}/${g.repo || '—'} (${g.branch || 'main'}). GitHub OAuth: ${linked ? 'sim' : 'não'}. Segredos: ${secretsNames}.`;

    const { baseUrl, model } = await resolveApiConfig();
    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            temperature: 0.3,
            max_tokens: 4000,
            messages: [
                { role: 'system', content: system },
                {
                    role: 'user',
                    content: 'Pedido:\n' + message + '\n\nResponda só JSON {"reply","actions"}.'
                }
            ]
        })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        return {
            reply: 'IA falhou: ' + (data?.error?.message || data?.error || res.statusText)
        };
    }

    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = extractJsonBlock(content);
    if (!parsed) {
        return {
            reply: content.slice(0, 800) || 'Não interpretei a resposta. Tente de novo.'
        };
    }

    const { logs } = await executeActions(
        parsed.actions || [],
        editorConfig,
        saveConfig,
        opts
    );
    const human = parsed.reply || 'OK.';
    const body = logs.length ? human + '\n\n' + logs.join('\n') : human;
    return { reply: body.slice(0, 3500) };
}

async function handleEditorMessage(message, editorConfig, saveConfig, opts = {}) {
    const text = String(message || '').trim();
    if (!text) {
        return { reply: 'Descreva o que quer alterar no repositório.' };
    }
    if (/^(ajuda|help)$/i.test(text)) {
        return {
            reply:
                '1) Conecte o GitHub\n2) Escolha o repositório\n3) Descreva a alteração\nEx: "liste src/bot" ou "leia index.js"'
        };
    }
    return handleWithAI(text, editorConfig, saveConfig, opts);
}

function getSecretValue(editorConfig, name) {
    const s = (editorConfig.secrets || []).find(
        (x) => x.name === String(name).toUpperCase()
    );
    if (!s) return null;
    return decrypt(s.valueEnc);
}

module.exports = { handleEditorMessage, getSecretValue };
