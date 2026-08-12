const github = require('./githubEditor');
const { encrypt, decrypt, maskSecret } = require('./cryptoSecrets');

/**
 * Interpreta mensagens do dono e executa ações no repositório / segredos.
 * Formatos suportados (PT):
 *  - conectar owner/repo [branch]
 *  - listar [pasta]
 *  - ler caminho/arquivo.js
 *  - criar caminho/arquivo.js\n```\nconteúdo\n```
 *  - editar caminho/arquivo.js\n```\nconteúdo\n```
 *  - apagar caminho/arquivo.js
 *  - segredo NOME=valor
 *  - segredos
 *  - status
 *  - ajuda
 */
async function handleEditorMessage(message, editorConfig, saveConfig) {
    const text = String(message || '').trim();
    if (!text) return { reply: 'Envie uma instrução. Digite **ajuda** para ver os comandos.' };

    const lower = text.toLowerCase();

    if (lower === 'ajuda' || lower === 'help') {
        return {
            reply:
                '**Comandos do Editor Aeternus**\n\n' +
                '`conectar dono/repo [branch]` — define o repositório\n' +
                '`status` — mostra conexão atual\n' +
                '`listar [pasta]` — lista arquivos\n' +
                '`ler caminho/arquivo` — lê conteúdo\n' +
                '`criar caminho/arquivo` + bloco ```código```\n' +
                '`editar caminho/arquivo` + bloco ```código```\n' +
                '`apagar caminho/arquivo` — remove arquivo\n' +
                '`segredo NOME=valor` — salva segredo criptografado\n' +
                '`segredos` — lista nomes dos segredos (valores ocultos)\n' +
                '`apagar segredo NOME` — remove um segredo'
        };
    }

    if (lower === 'status') {
        const g = editorConfig.github || {};
        const hasToken = !!g.tokenEnc;
        return {
            reply:
                `**Status**\n` +
                `Repo: **${g.owner || '—'}**/**${g.repo || '—'}**\n` +
                `Branch: **${g.branch || 'main'}**\n` +
                `Token: ${hasToken ? '✅ configurado (oculto)' : '❌ ausente'}\n` +
                `Segredos: **${(editorConfig.secrets || []).length}**'
        };
    }

    // conectar owner/repo [branch]
    const connectMatch = text.match(/^conectar\s+([\w.-]+)\/([\w.-]+)(?:\s+([\w./-]+))?/i);
    if (connectMatch) {
        editorConfig.github = editorConfig.github || {};
        editorConfig.github.owner = connectMatch[1];
        editorConfig.github.repo = connectMatch[2];
        if (connectMatch[3]) editorConfig.github.branch = connectMatch[3];
        else if (!editorConfig.github.branch) editorConfig.github.branch = 'main';
        await saveConfig(editorConfig);
        try {
            const info = await github.testConnection(editorConfig);
            return {
                reply: `✅ Conectado a **${info.full_name}** (branch padrão: ${info.default_branch}${info.private ? ', privado' : ''}).`
            };
        } catch (err) {
            return {
                reply: `Repo salvo (**${connectMatch[1]}/${connectMatch[2]}**), mas falhou ao testar: ${err.message}\nVerifique o token GitHub nos segredos.`
            };
        }
    }

    // segredo NOME=valor
    const secretMatch = text.match(/^segredo\s+([A-Za-z0-9_]+)\s*=\s*(.+)$/is);
    if (secretMatch) {
        const name = secretMatch[1].toUpperCase();
        const value = secretMatch[2].trim();
        editorConfig.secrets = editorConfig.secrets || [];
        const idx = editorConfig.secrets.findIndex(s => s.name === name);
        const entry = { name, valueEnc: encrypt(value), updatedAt: Date.now() };
        if (idx >= 0) editorConfig.secrets[idx] = entry;
        else editorConfig.secrets.push(entry);

        // atalho: se for GITHUB_TOKEN, grava também no github.tokenEnc
        if (name === 'GITHUB_TOKEN' || name === 'GH_TOKEN') {
            editorConfig.github = editorConfig.github || {};
            editorConfig.github.tokenEnc = encrypt(value);
        }

        await saveConfig(editorConfig);
        return { reply: `🔐 Segredo **${name}** salvo (modo secreto — valor nunca é exibido de novo).` };
    }

    if (lower === 'segredos' || lower === 'listar segredos') {
        const list = editorConfig.secrets || [];
        if (!list.length) return { reply: 'Nenhum segredo salvo.' };
        return {
            reply: '**Segredos (valores ocultos):**\n' + list.map(s => `• **${s.name}**`).join('\n')
        };
    }

    const delSecret = text.match(/^apagar\s+segredo\s+([A-Za-z0-9_]+)$/i);
    if (delSecret) {
        const name = delSecret[1].toUpperCase();
        editorConfig.secrets = (editorConfig.secrets || []).filter(s => s.name !== name);
        if (name === 'GITHUB_TOKEN' || name === 'GH_TOKEN') {
            if (editorConfig.github) delete editorConfig.github.tokenEnc;
        }
        await saveConfig(editorConfig);
        return { reply: `🗑️ Segredo **${name}** removido.` };
    }

    // listar [path]
    const listMatch = text.match(/^listar(?:\s+(.+))?$/i);
    if (listMatch) {
        try {
            const files = await github.listFiles(editorConfig, listMatch[1] || '');
            const lines = files.slice(0, 80).map(f => {
                const icon = f.type === 'dir' ? '📁' : '📄';
                return `${icon} \\`${f.path}\\``;
            });
            return {
                reply: lines.length
                    ? `**Arquivos:**\n${lines.join('\n')}${files.length > 80 ? '\n…' : ''}`
                    : 'Pasta vazia.'
            };
        } catch (err) {
            return { reply: `❌ ${err.message}` };
        }
    }

    // ler path
    const readMatch = text.match(/^ler\s+(.+)$/i);
    if (readMatch) {
        try {
            const file = await github.getFile(editorConfig, readMatch[1].trim());
            const body = file.decoded || '';
            const truncated = body.length > 6000 ? body.slice(0, 6000) + '\n… (cortado)' : body;
            return { reply: `**${file.path}**\n\\\`\
${truncated}\n\
` };
        } catch (err) {
            return { reply: `❌ ${err.message}` };
        }
    }

    // criar/editar path + code block
    const writeMatch = text.match(/^(criar|editar|escrever)\s+([^\n]+)\s*[\n\r]+```(?:[a-zA-Z0-9]*)?[\n\r]([\s\S]*?)```/i);
    if (writeMatch) {
        const action = writeMatch[1].toLowerCase();
        const filePath = writeMatch[2].trim();
        const content = writeMatch[3];
        try {
            await github.putFile(
                editorConfig,
                filePath,
                content,
                `Aeternus Editor: ${action} ${filePath}`
            );
            return { reply: `✅ Arquivo **${filePath}** ${action === 'criar' ? 'criado' : 'atualizado'} no GitHub.` };
        } catch (err) {
            return { reply: `❌ ${err.message}` };
        }
    }

    // apagar path
    const delMatch = text.match(/^(?:apagar|deletar|remover)\s+(?!segredo)(.+)$/i);
    if (delMatch) {
        try {
            await github.deleteFile(editorConfig, delMatch[1].trim());
            return { reply: `🗑️ Arquivo **${delMatch[1].trim()}** removido.` };
        } catch (err) {
            return { reply: `❌ ${err.message}` };
        }
    }

    return {
        reply:
            'Não entendi o comando.\nDigite **ajuda** para ver o que posso fazer.\n\n' +
            'Exemplos:\n' +
            '`conectar seu-user/Aeternus- main`\n' +
            '`segredo GITHUB_TOKEN=ghp_...`\n' +
            '`listar src/bot`\n' +
            '`criar src/teste.js` + bloco de código'
    };
}

function getSecretValue(editorConfig, name) {
    const s = (editorConfig.secrets || []).find(x => x.name === String(name).toUpperCase());
    if (!s) return null;
    return decrypt(s.valueEnc);
}

module.exports = { handleEditorMessage, getSecretValue };
