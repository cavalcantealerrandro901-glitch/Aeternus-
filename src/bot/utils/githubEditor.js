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
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
        const msg = data.message || res.statusText || 'Erro GitHub';
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

function getToken(editorConfig) {
    if (!editorConfig?.github?.tokenEnc) return null;
    return decrypt(editorConfig.github.tokenEnc);
}

async function listFiles(editorConfig, dirPath = '') {
    const token = getToken(editorConfig);
    if (!token) throw new Error('Token GitHub não configurado.');
    const { owner, repo, branch } = editorConfig.github;
    if (!owner || !repo) throw new Error('Repositório não configurado.');

    const ref = branch || 'main';
    const path = dirPath ? `/${dirPath.replace(/^\/+/, '')}` : '';
    const data = await ghFetch(
        `/repos/${owner}/${repo}/contents${path}?ref=${encodeURIComponent(ref)}`,
        token
    );
    return Array.isArray(data) ? data : [data];
}

async function getFile(editorConfig, filePath) {
    const token = getToken(editorConfig);
    if (!token) throw new Error('Token GitHub não configurado.');
    const { owner, repo, branch } = editorConfig.github;
    const ref = branch || 'main';
    const data = await ghFetch(
        `/repos/${owner}/${repo}/contents/${filePath.replace(/^\/+/, '')}?ref=${encodeURIComponent(ref)}`,
        token
    );
    if (data.encoding === 'base64' && data.content) {
        data.decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
    }
    return data;
}

async function putFile(editorConfig, filePath, content, message) {
    const token = getToken(editorConfig);
    if (!token) throw new Error('Token GitHub não configurado.');
    const { owner, repo, branch } = editorConfig.github;
    if (!owner || !repo) throw new Error('Repositório não configurado.');

    const path = filePath.replace(/^\/+/, '');
    let sha;
    try {
        const existing = await getFile(editorConfig, path);
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

async function deleteFile(editorConfig, filePath, message) {
    const token = getToken(editorConfig);
    if (!token) throw new Error('Token GitHub não configurado.');
    const { owner, repo, branch } = editorConfig.github;
    const path = filePath.replace(/^\/+/, '');
    const existing = await getFile(editorConfig, path);

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

async function testConnection(editorConfig) {
    const token = getToken(editorConfig);
    if (!token) throw new Error('Token GitHub não configurado.');
    const { owner, repo } = editorConfig.github || {};
    if (!owner || !repo) throw new Error('Informe owner e repo.');
    const data = await ghFetch(`/repos/${owner}/${repo}`, token);
    return { full_name: data.full_name, default_branch: data.default_branch, private: data.private };
}

module.exports = {
    listFiles,
    getFile,
    putFile,
    deleteFile,
    testConnection,
    getToken
};
