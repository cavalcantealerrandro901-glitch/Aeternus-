const gh = require('./githubApi');
const { resolveApiConfig } = require('./ai');

function extractJson(text) {
    if (!text) return null;
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fence ? fence[1].trim() : text.trim();
    const a = raw.indexOf('{');
    const b = raw.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    try {
        return JSON.parse(raw.slice(a, b + 1));
    } catch {
        return null;
    }
}

function extractCodeBlock(text) {
    const m = text.match(/```(?:[\w.-]*)?\n([\s\S]*?)```/);
    return m ? m[1] : null;
}

async function runLocal(text, ctx) {
    const t = String(text || '').trim();
    if (!t) return 'Digite algo. Ex: ajuda';
    const lower = t.toLowerCase();
    const { token, owner, repo, branch } = ctx || {};

    if (/^(ajuda|help|\?)$/i.test(lower)) {
        return [
            'Comandos locais (sempre funcionam):',
            '• ajuda | status',
            '• testar — testa GitHub',
            '• listar [pasta]',
            '• ler caminho/arquivo.js',
            '• escrever caminho/arquivo.js + código em ```blocos```',
            '• apagar caminho/arquivo.js',
            '• repo dono/nome [branch]',
            '',
            'Com AI_API_KEY: descreva a alteração em português.'
        ].join('\n');
    }

    if (/^(status|info)$/i.test(lower)) {
        const api = await resolveApiConfig().catch(() => ({ apiKey: null }));
        return [
            `GitHub: ${token ? 'conectado' : 'não conectado'}`,
            token ? `Login: @${ctx.login || '?'}` : '',
            `Repo: ${owner && repo ? owner + '/' + repo : 'nenhum'}`,
            `Branch: ${branch || 'main'}`,
            `IA: ${api?.apiKey ? 'sim' : 'não'}`
        ]
            .filter(Boolean)
            .join('\n');
    }

    if (/^(testar|teste|test)$/i.test(lower)) {
        if (!token) return 'Conecte o GitHub (botão verde).';
        if (owner && repo) {
            const r = await gh.getRepo(token, owner, repo);
            return `OK: ${r.full_name} · branch padrão ${r.default_branch}`;
        }
        const u = await gh.me(token);
        return `OK: @${u.login} · escolha e salve um repositório.`;
    }

    const listM = lower.match(/^(listar|lista|list|ls)\s*(.*)$/);
    if (listM) {
        if (!token) return 'Conecte o GitHub.';
        if (!owner || !repo) return 'Salve owner/repo primeiro.';
        const files = await gh.listContents(token, owner, repo, listM[2].trim(), branch);
        return (
            'Arquivos:\n' +
            files
                .slice(0, 80)
                .map((f) => (f.type === 'dir' ? '📁 ' : '📄 ') + (f.path || f.name))
                .join('\n')
        );
    }

    const readM = t.match(/^(ler|leia|read|cat)\s+(.+)$/i);
    if (readM) {
        if (!token) return 'Conecte o GitHub.';
        if (!owner || !repo) return 'Salve owner/repo primeiro.';
        const path = readM[2].trim().replace(/^[`'"]|[`'"]$/g, '');
        const file = await gh.readFile(token, owner, repo, path, branch);
        const body = file.decoded || '';
        const cut = body.length > 6000 ? body.slice(0, 6000) + '\n…' : body;
        return `${file.path} (${body.length} chars):\n\`\`\`\n${cut}\n\`\`\``;
    }

    const writeM = t.match(/^(escrever|write|salvar|gravar)\s+(\S+)\s*([\s\S]*)$/i);
    if (writeM) {
        if (!token) return 'Conecte o GitHub.';
        if (!owner || !repo) return 'Salve owner/repo primeiro.';
        const path = writeM[2].trim();
        let content = writeM[3] || '';
        const block = extractCodeBlock(content);
        if (block != null) content = block;
        else content = content.replace(/^\n+/, '');
        if (!content.trim()) {
            return 'Envie o código depois do caminho, preferencialmente em ```bloco```.';
        }
        await gh.writeFile(token, owner, repo, path, content, branch, `Aeternus: update ${path}`);
        return `Arquivo gravado: ${path} (${content.length} chars) em ${owner}/${repo}`;
    }

    const delM = t.match(/^(apagar|delete|rm|remover)\s+(\S+)$/i);
    if (delM) {
        if (!token) return 'Conecte o GitHub.';
        if (!owner || !repo) return 'Salve owner/repo primeiro.';
        const path = delM[2].trim();
        await gh.deleteFile(token, owner, repo, path, branch, `Aeternus: delete ${path}`);
        return `Removido: ${path}`;
    }

    const repoM = t.match(/^(repo|reposit[oó]rio)\s+([\w.-]+)\/([\w.-]+)(?:\s+([\w./-]+))?$/i);
    if (repoM) {
        return {
            reply: `Repo ativo: ${repoM[2]}/${repoM[3]} (${repoM[4] || 'main'})`,
            setRepo: { owner: repoM[2], repo: repoM[3], branch: repoM[4] || 'main' }
        };
    }

    return null;
}

async function runAI(text, ctx) {
    let api;
    try {
        api = await resolveApiConfig();
    } catch {
        api = {};
    }
    if (!api?.apiKey) {
        return (
            'Sem AI_API_KEY no Render.\n' +
            'Use comandos: ajuda | status | listar | ler arquivo | escrever arquivo + ```código```'
        );
    }

    const system =
        'Você é o editor de código do bot Aeternus. Responda SEMPRE em JSON puro:\n' +
        '{"reply":"texto curto","actions":[{"type":"write|read|list|delete|test|reply","path":"...","content":"...","message":"..."}]}\n' +
        'type write precisa de path e content completo do arquivo.\n' +
        `GitHub: ${ctx.token ? 'sim' : 'não'}. Repo: ${ctx.owner || '—'}/${ctx.repo || '—'} branch ${ctx.branch || 'main'}.`;

    const res = await fetch(`${api.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${api.apiKey}`
        },
        body: JSON.stringify({
            model: api.model,
            temperature: 0.15,
            max_tokens: 4000,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: String(text).slice(0, 8000) }
            ]
        })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        return `IA (${res.status}): ${data?.error?.message || data?.error || res.statusText}`;
    }

    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = extractJson(content);
    if (!parsed) {
        return content.slice(0, 1500) || 'IA sem resposta útil. Tente: escrever path + ```código```';
    }

    const logs = [];
    for (const action of parsed.actions || []) {
        const type = String(action.type || '').toLowerCase();
        try {
            if (!ctx.token && ['list', 'read', 'write', 'delete', 'test'].includes(type)) {
                logs.push(`${type}: conecte o GitHub`);
                continue;
            }
            if (['list', 'read', 'write', 'delete'].includes(type) && (!ctx.owner || !ctx.repo)) {
                logs.push(`${type}: salve um repositório`);
                continue;
            }

            if (type === 'test') {
                if (ctx.owner && ctx.repo) {
                    const r = await gh.getRepo(ctx.token, ctx.owner, ctx.repo);
                    logs.push(`OK ${r.full_name}`);
                } else {
                    const u = await gh.me(ctx.token);
                    logs.push(`OK @${u.login}`);
                }
            } else if (type === 'list') {
                const files = await gh.listContents(
                    ctx.token,
                    ctx.owner,
                    ctx.repo,
                    action.path || '',
                    ctx.branch
                );
                logs.push(
                    files
                        .slice(0, 50)
                        .map((f) => (f.type === 'dir' ? '📁 ' : '📄 ') + (f.path || f.name))
                        .join('\n')
                );
            } else if (type === 'read') {
                const f = await gh.readFile(
                    ctx.token,
                    ctx.owner,
                    ctx.repo,
                    action.path,
                    ctx.branch
                );
                const body = f.decoded || '';
                logs.push(body.slice(0, 4000) + (body.length > 4000 ? '\n…' : ''));
            } else if (type === 'write') {
                await gh.writeFile(
                    ctx.token,
                    ctx.owner,
                    ctx.repo,
                    action.path,
                    action.content ?? '',
                    ctx.branch,
                    action.message || `Aeternus: ${action.path}`
                );
                logs.push(`Gravado ${action.path}`);
            } else if (type === 'delete') {
                await gh.deleteFile(
                    ctx.token,
                    ctx.owner,
                    ctx.repo,
                    action.path,
                    ctx.branch,
                    action.message
                );
                logs.push(`Removido ${action.path}`);
            } else if (type === 'reply' && action.text) {
                logs.push(String(action.text));
            }
        } catch (e) {
            logs.push(`${type}: ${e.message}`);
        }
    }

    const human = parsed.reply || 'OK';
    return (logs.length ? human + '\n\n' + logs.join('\n') : human).slice(0, 4000);
}

async function handleEditorMessage(text, ctx) {
    const msg = String(text || '').trim();
    if (!msg) return { reply: 'Mensagem vazia. Digite ajuda.' };

    try {
        const local = await runLocal(msg, ctx || {});
        if (local != null) {
            if (typeof local === 'object' && local.reply) return local;
            return { reply: String(local) };
        }
        const reply = await runAI(msg, ctx || {});
        return { reply: String(reply || 'Sem resposta.') };
    } catch (err) {
        console.error('handleEditorMessage:', err);
        return { reply: 'Erro: ' + (err.message || String(err)) };
    }
}

module.exports = { handleEditorMessage };
