const github = require('./githubEditor');
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

function needGithub(opts, cfg) {
    const uctx = userCtxFrom(cfg, opts);
    if (!uctx.token) {
        return 'GitHub não conectado. Clique em "Conectar com GitHub" e autorize o acesso aos repositórios.';
    }
    if (!uctx.owner || !uctx.repo) {
        return 'Nenhum repositório selecionado. Carregue a lista, escolha o repo e clique em Salvar.';
    }
    return null;
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
                logs.push(`Repo: ${cfg.github.owner}/${cfg.github.repo} (${cfg.github.branch || 'main'})`);
            } else if (type === 'list') {
                const miss = needGithub(opts, cfg);
                if (miss) {
                    logs.push(miss);
                    continue;
                }
                const files = await github.listFiles(cfg, action.path || '', uctx());
                const lines = files
                    .slice(0, 50)
                    .map((f) => (f.type === 'dir' ? '📁 ' : '📄 ') + (f.path || f.name));
                logs.push('Lista:\n' + (lines.join('\n') || '(vazio)'));
            } else if (type === 'read') {
                const miss = needGithub(opts, cfg);
                if (miss) {
                    logs.push(miss);
                    continue;
                }
                const file = await github.getFile(cfg, action.path, uctx());
                const body = file.decoded || '';
                const cut = body.length > 4500 ? body.slice(0, 4500) + '\n…' : body;
                logs.push(`Lido ${file.path}:\n\`\`\`\n${cut}\n\`\`\``);
            } else if (type === 'write' || type === 'create' || type === 'edit') {
                const miss = needGithub(opts, cfg);
                if (miss) {
                    logs.push(miss);
                    continue;
                }
                const path = action.path;
                if (!path) {
                    logs.push('write sem path');
                    continue;
                }
                await github.putFile(
                    cfg,
                    path,
                    action.content ?? '',
                    action.message || `Aeternus Editor: ${path}`,
                    uctx()
                );
                logs.push(`Arquivo ${path} gravado no GitHub`);
            } else if (type === 'delete') {
                const miss = needGithub(opts, cfg);
                if (miss) {
                    logs.push(miss);
                    continue;
                }
                await github.deleteFile(cfg, action.path, action.message, uctx());
                logs.push(`Removido ${action.path}`);
            } else if (type === 'test_repo') {
                if (!opts.userToken && !cfg?.github?._runtimeToken) {
                    logs.push('GitHub não conectado.');
                    continue;
                }
                const info = await github.testConnection(cfg, uctx());
                logs.push(
                    info.full_name
                        ? `OK: ${info.full_name} (branch ${info.default_branch || '?'})`
                        : `GitHub OK: @${info.login || '?'}`
                );
            } else if (type === 'reply') {
                if (action.text) logs.push(String(action.text));
            } else if (type === 'set_secret') {
                logs.push('Cofre removido. Coloque chaves só no Render (AI_API_KEY, etc.).');
            } else if (type === 'deploy') {
                logs.push('Deploy: Render atualiza no push do GitHub.');
            } else {
                logs.push(`Ação desconhecida: ${type}`);
            }
        } catch (err) {
            logs.push(`${type}: ${err.message}`);
        }
    }

    return { logs, cfg };
}

/** Comandos locais — funcionam SEM chave de IA */
async function handleLocal(text, editorConfig, saveConfig, opts) {
    const t = text.trim();
    const lower = t.toLowerCase();

    if (/^(ajuda|help|\?)$/i.test(lower)) {
        return {
            reply:
                'Comandos rápidos (sem IA):\n' +
                '• status — conexão e repo\n' +
                '• testar — testa acesso ao GitHub\n' +
                '• listar [pasta] — lista arquivos\n' +
                '• ler caminho/arquivo.js — lê arquivo\n\n' +
                'Com IA (AI_API_KEY no Render): descreva em português o que quer criar/editar.'
        };
    }

    if (/^(status|info)$/i.test(lower)) {
        const uctx = userCtxFrom(editorConfig, opts);
        return {
            reply:
                `GitHub token: ${uctx.token ? 'sim' : 'não'}\n` +
                `Repo: ${uctx.owner || '—'}/${uctx.repo || '—'}\n` +
                `Branch: ${uctx.branch || 'main'}\n` +
                `IA: ${(await resolveApiConfig()).apiKey ? 'configurada' : 'sem AI_API_KEY no Render'}`
        };
    }

    if (/^(testar|teste|test)$/i.test(lower)) {
        const { logs } = await executeActions([{ type: 'test_repo' }], editorConfig, saveConfig, opts);
        return { reply: logs.join('\n') };
    }

    const listMatch = lower.match(/^(listar|lista|list|ls)\s*(.*)$/i);
    if (listMatch) {
        const path = (listMatch[2] || '').trim();
        const { logs } = await executeActions(
            [{ type: 'list', path }],
            editorConfig,
            saveConfig,
            opts
        );
        return { reply: logs.join('\n') };
    }

    const readMatch = t.match(/^(ler|leia|read|cat)\s+(.+)$/i);
    if (readMatch) {
        const path = readMatch[2].trim().replace(/^[`'"]|[`'"]$/g, '');
        const { logs } = await executeActions(
            [{ type: 'read', path }],
            editorConfig,
            saveConfig,
            opts
        );
        return { reply: logs.join('\n').slice(0, 3500) };
    }

    const repoMatch = t.match(/^(repo|reposit[oó]rio)\s+([\w.-]+)\/([\w.-]+)(?:\s+([\w./-]+))?$/i);
    if (repoMatch) {
        const { logs } = await executeActions(
            [
                {
                    type: 'set_repo',
                    owner: repoMatch[2],
                    repo: repoMatch[3],
                    branch: repoMatch[4] || 'main'
                }
            ],
            editorConfig,
            saveConfig,
            opts
        );
        return { reply: logs.join('\n') };
    }

    return null;
}

async function handleWithAI(message, editorConfig, saveConfig, opts = {}) {
    const cfgApi = await resolveApiConfig();
    if (!cfgApi.apiKey) {
        return {
            reply:
                'Sem AI_API_KEY no Render — IA desligada.\n' +
                'Ainda funciona: status | testar | listar | ler caminho/arquivo.js\n' +
                'Para editar com linguagem natural, adicione AI_API_KEY ou GROQ_API_KEY no Render.'
        };
    }

    const g = editorConfig.github || {};
    const linked = !!(opts.userToken || g._runtimeToken);
    const uctx = userCtxFrom(editorConfig, opts);

    const system =
        'Você é o Editor do bot Aeternus no GitHub.\n' +
        'Responda APENAS um JSON válido: {"reply":"texto curto","actions":[...]}\n' +
        'Ações: list, read, write, delete, test_repo, set_repo, reply.\n' +
        'write precisa de path + content (arquivo completo).\n' +
        'Não invente tokens. Não use set_secret.\n' +
        `GitHub OAuth: ${linked ? 'sim' : 'não'}. Repo: ${uctx.owner || '—'}/${uctx.repo || '—'} branch ${uctx.branch || 'main'}.`;

    try {
        const res = await fetch(`${cfgApi.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${cfgApi.apiKey}`
            },
            body: JSON.stringify({
                model: cfgApi.model,
                temperature: 0.2,
                max_tokens: 3500,
                messages: [
                    { role: 'system', content: system },
                    {
                        role: 'user',
                        content: 'Pedido do usuário:\n' + message + '\n\nSó JSON {"reply","actions"}.'
                    }
                ]
            })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data?.error?.message || data?.error || res.statusText;
            return { reply: `IA falhou (${res.status}): ${msg}` };
        }

        const content = data?.choices?.[0]?.message?.content || '';
        const parsed = extractJsonBlock(content);
        if (!parsed) {
            return {
                reply:
                    'IA respondeu sem JSON válido. Use: listar | ler arquivo | testar\n\n' +
                    content.slice(0, 600)
            };
        }

        const { logs } = await executeActions(
            parsed.actions || [],
            editorConfig,
            saveConfig,
            opts
        );
        const human = parsed.reply || 'OK.';
        return { reply: (logs.length ? human + '\n\n' + logs.join('\n') : human).slice(0, 3500) };
    } catch (err) {
        return { reply: 'Erro na IA: ' + (err.message || String(err)) };
    }
}

async function handleEditorMessage(message, editorConfig, saveConfig, opts = {}) {
    const text = String(message || '').trim();
    if (!text) {
        return { reply: 'Digite um comando. Ex: status | listar | ler index.js | ajuda' };
    }

    try {
        const local = await handleLocal(text, editorConfig, saveConfig, opts);
        if (local) return local;
        return handleWithAI(text, editorConfig, saveConfig, opts);
    } catch (err) {
        console.error('handleEditorMessage:', err);
        return { reply: 'Erro no editor: ' + err.message };
    }
}

module.exports = { handleEditorMessage };
