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

async function runLocal(text, ctx) {
    const t = text.trim();
    const lower = t.toLowerCase();
    const { token, owner, repo, branch } = ctx;

    if (/^(ajuda|help|\?)$/i.test(lower)) {
        return (
            'Comandos:\n' +
            '• status — conexão\n' +
            '• testar — testa GitHub\n' +
            '• listar [pasta]\n' +
            '• ler caminho/arquivo.js\n' +
            '• repo dono/nome [branch]\n' +
            'Com AI_API_KEY: descreva a alteração em português.'
        );
    }

    if (/^(status|info)$/i.test(lower)) {
        const api = await resolveApiConfig();
        return (
            `Token: ${token ? 'sim' : 'não'}\n` +
            `Repo: ${owner || '—'}/${repo || '—'}\n` +
            `Branch: ${branch || 'main'}\n` +
            `IA: ${api.apiKey ? 'sim' : 'não (AI_API_KEY)'}`
        );
    }

    if (/^(testar|teste|test)$/i.test(lower)) {
        if (!token) return 'Conecte o GitHub primeiro.';
        if (owner && repo) {
            const r = await gh.getRepo(token, owner, repo);
            return `OK: ${r.full_name} (${r.default_branch})`;
        }
        const u = await gh.me(token);
        return `OK: @${u.login} — escolha um repositório.`;
    }

    const listM = lower.match(/^(listar|lista|list|ls)\s*(.*)$/);
    if (listM) {
        if (!token) return 'Conecte o GitHub.';
        if (!owner || !repo) return 'Salve um repositório antes.';
        const files = await gh.listContents(token, owner, repo, listM[2].trim(), branch);
        return (
            'Arquivos:\n' +
            files
                .slice(0, 60)
                .map((f) => (f.type === 'dir' ? '📁 ' : '📄 ') + (f.path || f.name))
                .join('\n')
        );
    }

    const readM = t.match(/^(ler|leia|read|cat)\s+(.+)$/i);
    if (readM) {
        if (!token) return 'Conecte o GitHub.';
        if (!owner || !repo) return 'Salve um repositório antes.';
        const path = readM[2].trim().replace(/^[`'"]|[`'"]$/g, '');
        const file = await gh.readFile(token, owner, repo, path, branch);
        const body = file.decoded || '';
        const cut = body.length > 4000 ? body.slice(0, 4000) + '\n…' : body;
        return `${file.path}:\n\`\`\`\n${cut}\n\`\`\``;
    }

    const repoM = t.match(/^(repo|reposit[oó]rio)\s+([\w.-]+)\/([\w.-]+)(?:\s+([\w./-]+))?$/i);
    if (repoM) {
        return {
            reply: `Repo definido: ${repoM[2]}/${repoM[3]} (${repoM[4] || 'main'})`,
            setRepo: { owner: repoM[2], repo: repoM[3], branch: repoM[4] || 'main' }
        };
    }

    return null;
}

async function runAI(text, ctx) {
    const api = await resolveApiConfig();
    if (!api.apiKey) {
        return (
            'Sem AI_API_KEY no Render.\n' +
            'Use: status | testar | listar | ler arquivo.js'
        );
    }

    const system =
        'Editor GitHub do Aeternus. Responda só JSON: {"reply":"...","actions":[...]}\n' +
        'Ações: list path, read path, write path+content, delete path, test, reply text.\n' +
        `Token: ${ctx.token ? 'sim' : 'não'}. Repo: ${ctx.owner || '—'}/${ctx.repo || '—'} branch ${ctx.branch || 'main'}.`;

    const res = await fetch(`${api.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${api.apiKey}`
        },
        body: JSON.stringify({
            model: api.model,
            temperature: 0.2,
            max_tokens: 3500,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: text + '\n\nSó JSON.' }
            ]
        })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        return `IA erro (${res.status}): ${data?.error?.message || data?.error || res.statusText}`;
    }

    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = extractJson(content);
    if (!parsed) return content.slice(0, 800) || 'IA sem JSON válido.';

    const logs = [];
    for (const action of parsed.actions || []) {
        const type = String(action.type || '').toLowerCase();
        try {
            if (type === 'test') {
                if (!ctx.token) logs.push('Sem token');
                else if (ctx.owner && ctx.repo) {
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
                        .slice(0, 40)
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
                logs.push(
                    (f.decoded || '').slice(0, 3000) +
                        ((f.decoded || '').length > 3000 ? '\n…' : '')
                );
            } else if (type === 'write') {
                await gh.writeFile(
                    ctx.token,
                    ctx.owner,
                    ctx.repo,
                    action.path,
                    action.content ?? '',
                    ctx.branch,
                    action.message
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
    return (logs.length ? human + '\n\n' + logs.join('\n') : human).slice(0, 3500);
}

async function handleEditorMessage(text, ctx) {
    const msg = String(text || '').trim();
    if (!msg) return { reply: 'Digite um comando. Ex: status' };

    try {
        const local = await runLocal(msg, ctx);
        if (local) {
            if (typeof local === 'object' && local.reply) return local;
            return { reply: local };
        }
        const reply = await runAI(msg, ctx);
        return { reply };
    } catch (err) {
        return { reply: 'Erro: ' + err.message };
    }
}

module.exports = { handleEditorMessage };
