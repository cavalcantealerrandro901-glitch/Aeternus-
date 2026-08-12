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

async function executeActions(actions, editorConfig, saveConfig) {
    const logs = [];
    let cfg = editorConfig;

    for (const action of actions || []) {
        const type = String(action.type || '').toLowerCase();
        try {
            if (type === 'set_repo') {
                cfg.github = cfg.github || {};
                if (action.owner) cfg.github.owner = String(action.owner).trim();
                if (action.repo) cfg.github.repo = String(action.repo).trim();
                if (action.branch) cfg.github.branch = String(action.branch).trim();
                await saveConfig(cfg);
                logs.push(`🔗 Repo: ${cfg.github.owner}/${cfg.github.repo} (${cfg.github.branch || 'main'})`);
            } else if (type === 'set_secret') {
                const name = String(action.name || '').trim().toUpperCase();
                const value = String(action.value || '');
                if (!name || !value) {
                    logs.push('⚠️ set_secret sem nome/valor');
                    continue;
                }
                cfg.secrets = cfg.secrets || [];
                const idx = cfg.secrets.findIndex(s => s.name === name);
                const entry = { name, valueEnc: encrypt(value), updatedAt: Date.now() };
                if (idx >= 0) cfg.secrets[idx] = entry;
                else cfg.secrets.push(entry);
                if (name === 'GITHUB_TOKEN' || name === 'GH_TOKEN') {
                    cfg.github = cfg.github || {};
                    cfg.github.tokenEnc = encrypt(value);
                }
                await saveConfig(cfg);
                logs.push(`🔐 Segredo **${name}** salvo (oculto)`);
            } else if (type === 'list') {
                const files = await github.listFiles(cfg, action.path || '');
                const lines = files.slice(0, 40).map(f =>
                    (f.type === 'dir' ? '📁 ' : '📄 ') + f.path
                );
                logs.push('📂 Lista:\n' + (lines.join('\n') || '(vazio)'));
            } else if (type === 'read') {
                const file = await github.getFile(cfg, action.path);
                const body = file.decoded || '';
                const cut = body.length > 5000 ? body.slice(0, 5000) + '\n…' : body;
                logs.push(`📖 **${file.path}**\n\`\`\`\n${cut}\n\`\`\``);
            } else if (type === 'write' || type === 'create' || type === 'edit') {
                const path = action.path;
                const content = action.content ?? '';
                if (!path) {
                    logs.push('⚠️ write sem path');
                    continue;
                }
                await github.putFile(
                    cfg,
                    path,
                    content,
                    action.message || `Aeternus AI Editor: ${path}`
                );
                logs.push(`✅ Arquivo **${path}** gravado no GitHub`);
            } else if (type === 'delete') {
                await github.deleteFile(cfg, action.path, action.message);
                logs.push(`🗑️ Removido **${action.path}**`);
            } else if (type === 'test_repo') {
                const info = await github.testConnection(cfg);
                logs.push(`✅ Conexão OK: **${info.full_name}** (branch ${info.default_branch})`);
            } else if (type === 'reply') {
                if (action.text) logs.push(String(action.text));
            } else if (type === 'deploy') {
                logs.push('ℹ️ Deploy automático não está ativo. O Render atualiza sozinho ao dar push no GitHub.');
            } else {
                logs.push(`⚠️ Ação desconhecida: ${type}`);
            }
        } catch (err) {
            logs.push(`❌ ${type}: ${err.message}`);
        }
    }

    return { logs, cfg };
}

async function handleWithAI(message, editorConfig, saveConfig) {
    const { apiKey } = await resolveApiConfig();
    if (!apiKey) {
        return {
            reply:
                '⚠️ IA do Editor não configurada. Defina `AI_API_KEY` ou `XAI_API_KEY` no Render / cofre.\n' +
                'Enquanto isso você ainda pode usar a interface (repo + segredos) acima.'
        };
    }

    const g = editorConfig.github || {};
    const secretsNames = (editorConfig.secrets || []).map(s => s.name).join(', ') || 'nenhum';

    const system =
        'Você é o Editor IA do bot Aeternus. O usuário descreve em português o que quer no código/repositório.\n' +
        'Responda SEMPRE com um único JSON (pode envolver em ```json) no formato:\n' +
        '{"reply":"mensagem humana curta","actions":[...]}\n' +
        'Ações permitidas:\n' +
        '- {"type":"set_repo","owner":"","repo":"","branch":"main"}\n' +
        '- {"type":"set_secret","name":"GITHUB_TOKEN","value":"..."}  (só se o usuário colar o token)\n' +
        '- {"type":"test_repo"}\n' +
        '- {"type":"list","path":"src"}\n' +
        '- {"type":"read","path":"arquivo.js"}\n' +
        '- {"type":"write","path":"arquivo.js","content":"código completo","message":"commit msg"}\n' +
        '- {"type":"delete","path":"arquivo.js"}\n' +
        'Regras profissionais:\n' +
        '1. Antes de editar, se precisar do conteúdo atual, use read primeiro (pode haver várias actions em sequência).\n' +
        '2. Em write, envie o arquivo COMPLETO e correto, limpo, production-ready.\n' +
        '3. Não invente tokens. Não apague arquivos sem o usuário pedir.\n' +
        '4. Se a tarefa for só conversa, actions pode ser [].\n' +
        '5. Prefira mudanças mínimas e corretas.\n' +
        '6. Não use ação de deploy.\n' +
        `Repo atual: ${g.owner || '—'}/${g.repo || '—'} branch ${g.branch || 'main'}. Token GitHub: ${g.tokenEnc ? 'sim' : 'não'}. Segredos: ${secretsNames}.`;

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
                    content:
                        'Pedido do usuário:\n' +
                        message +
                        '\n\nResponda só com JSON {"reply","actions"}.'
                }
            ]
        })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        return {
            reply:
                '❌ IA falhou: ' +
                (data?.error?.message || data?.error || res.statusText)
        };
    }

    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = extractJsonBlock(content);

    if (!parsed) {
        return {
            reply:
                content.slice(0, 1800) ||
                'Não consegui interpretar a resposta da IA. Tente descrever de outro modo.'
        };
    }

    const { logs } = await executeActions(parsed.actions || [], editorConfig, saveConfig);
    const human = parsed.reply || 'Concluído.';
    const body = logs.length ? human + '\n\n' + logs.join('\n') : human;
    return { reply: body.slice(0, 3500) };
}

async function handleEditorMessage(message, editorConfig, saveConfig) {
    const text = String(message || '').trim();
    if (!text) {
        return {
            reply:
                'Descreva o que você quer. Ex: *"Crie um comando de ranking de Almas com embed bonito"* ou *"Corrija o erro no daily.js"*.'
        };
    }

    const lower = text.toLowerCase();
    if (lower === 'ajuda' || lower === 'help') {
        return {
            reply:
                '**Editor IA livre**\n\n' +
                'Não precisa de comandos. Escreva o que quer, por exemplo:\n' +
                '• "Liste os arquivos em src/bot/commands"\n' +
                '• "Leia o index.js e explique"\n' +
                '• "Crie o comando !ping com embed"\n' +
                '• "Conecte o repo user/Aeternus- na branch main"\n\n' +
                'Configure `AI_API_KEY` + `GITHUB_TOKEN` no cofre ou no Render.\n' +
                'O deploy no Render continua automático pelo Git (push).'
        };
    }

    return handleWithAI(text, editorConfig, saveConfig);
}

function getSecretValue(editorConfig, name) {
    const s = (editorConfig.secrets || []).find(
        x => x.name === String(name).toUpperCase()
    );
    if (!s) return null;
    return decrypt(s.valueEnc);
}

module.exports = { handleEditorMessage, getSecretValue };
