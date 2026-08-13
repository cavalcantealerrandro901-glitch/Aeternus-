const { decrypt } = require('./cryptoSecrets');

async function ghFetch(path, token, options = {}) {
    const res = await fetch(`https://api.github.com${path}`, {
        ...options,
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Aeternus-Editor',
            ...(options.headers || {})
        }
    });
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { raw: text };
    }
    if (!res.ok) {
        const msg = data.message || res.statusText || 'Erro GitHub';
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

/** Token do usuário (OAuth) ou token global do config */
function resolveToken(editorConfig, userGithubToken) {
    if (userGithubToken) return userGithubToken;
    if (editorConfig?.github?.tokenEnc) return decrypt(editorConfig.github.tokenEnc);
    return null;
}

function getRepoMeta(editorConfig, userMeta) {
    const owner = userMeta?.owner || editorConfig?.github?.owner;
    const repo = userMeta?.repo || editorConfig?.github?.repo;
    const branch = userMeta?.branch || editorConfig?.github?.branch || 'main';
    return { owner, repo, branch };
}

async function listUserRepos(token) {
    const data = await ghFetch('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', token);
    return (Array.isArray(data) ? data : []).map((r) => ({
        full_name: r.full_name,
        owner: r.owner?.login,
        name: r.name,
        private: r.private,
        default_branch: r.default_branch,
        html_url: r.html_url
    }));
}

async function getAuthenticatedUser(token) {
    return ghFetch('/user', token);
}

async function listFiles(editorConfig, dirPath = '', userCtx = {}) {
    const token = resolveToken(editorConfig, userCtx.token);
    if (!token) throw new Error('GitHub não conectado. Faça login com o GitHub.');
    const { owner, repo, branch } = getRepoMeta(editorConfig, userCtx);
    if (!owner || !repo) throw new Error('Selecione um repositório.');

    const path = dirPath ? `/${dirPath.replace(/^\/+/, '')}` : '';
    const data = await ghFetch(
        `/repos/${owner}/${repo}/contents${path}?ref=${encodeURIComponent(branch)}`,
        token
    );
    return Array.isArray(data) ? data : [data];
}

async function getFile(editorConfig, filePath, userCtx = {}) {
    const token = resolveToken(editorConfig, userCtx.token);
    if (!token) throw new Error('GitHub não conectado.');
    const { owner, repo, branch } = getRepoMeta(editorConfig, userCtx);
    const data = await ghFetch(
        `/repos/${owner}/${repo}/contents/${filePath.replace(/^\/+/, '')}?ref=${encodeURIComponent(branch)}`,
        token
    );
    if (data.encoding === 'base64' && data.content) {
        data.decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
    }
    return data;
}

async function putFile(editorConfig, filePath, content, message, userCtx = {}) {
    const token = resolveToken(editorConfig, userCtx.token);
    if (!token) throw new Error('GitHub não conectado.');
    const { owner, repo, branch } = getRepoMeta(editorConfig, userCtx);
    if (!owner || !repo) throw new Error('Selecione um repositório.');

    const path = filePath.replace(/^\/+/, '');
    let sha;
    try {
        const existing = await getFile(editorConfig, path, userCtx);
        sha = existing.sha;
    } catch (e) {
        if (e.status !== 404) throw e;
    }

    const body = {
        message: message || `Aeternus Editor: atualizar ${path}`,
        content: Buffer.from(content, 'utf8').toString('base64'),
        branch: branch || 'main'
    };
    if (sha) body.sha = sha;

    return ghFetch(`/repos/${owner}/${repo}/contents/${path}`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

async function deleteFile(editorConfig, filePath, message, userCtx = {}) {
    const token = resolveToken(editorConfig, userCtx.token);
    if (!token) throw new Error('GitHub não conectado.');
    const { owner, repo, branch } = getRepoMeta(editorConfig, userCtx);
    const path = filePath.replace(/^\/+/, '');
    const existing = await getFile(editorConfig, path, userCtx);

    return ghFetch(`/repos/${owner}/${repo}/contents/${path}`, token, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: message || `Aeternus Editor: remover ${path}`,
            sha: existing.sha,
            branch: branch || 'main'
        })
    });
}

async function testConnection(editorConfig, userCtx = {}) {
    const token = resolveToken(editorConfig, userCtx.token);
    if (!token) throw new Error('GitHub não conectado.');
    const { owner, repo } = getRepoMeta(editorConfig, userCtx);
    if (!owner || !repo) {
        const me = await getAuthenticatedUser(token);
        return { login: me.login, id: me.id, note: 'Conectado. Selecione um repositório.' };
    }
    const data = await ghFetch(`/repos/${owner}/${repo}`, token);
    return {
        full_name: data.full_name,
        default_branch: data.default_branch,
        private: data.private
    };
}

module.exports = {
    listFiles,
    getFile,
    putFile,
    deleteFile,
    testConnection,
    listUserRepos,
    getAuthenticatedUser,
    resolveToken,
    getRepoMeta
};
