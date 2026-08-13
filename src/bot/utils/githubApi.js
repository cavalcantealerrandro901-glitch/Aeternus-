async function gh(path, token, options = {}) {
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
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { message: text.slice(0, 200) };
    }
    if (!res.ok) {
        const err = new Error(data.message || res.statusText || 'Erro GitHub');
        err.status = res.status;
        throw err;
    }
    return data;
}

async function me(token) {
    return gh('/user', token);
}

async function listRepos(token) {
    const out = [];
    for (let page = 1; page <= 3; page++) {
        const batch = await gh(
            `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
            token
        );
        if (!Array.isArray(batch) || !batch.length) break;
        for (const r of batch) {
            out.push({
                full_name: r.full_name,
                owner: r.owner?.login,
                name: r.name,
                private: !!r.private,
                default_branch: r.default_branch || 'main'
            });
        }
        if (batch.length < 100) break;
    }
    return out;
}

async function listContents(token, owner, repo, dir, branch) {
    const p = dir ? `/${String(dir).replace(/^\/+/, '')}` : '';
    const data = await gh(
        `/repos/${owner}/${repo}/contents${p}?ref=${encodeURIComponent(branch || 'main')}`,
        token
    );
    return Array.isArray(data) ? data : [data];
}

async function readFile(token, owner, repo, filePath, branch) {
    const data = await gh(
        `/repos/${owner}/${repo}/contents/${String(filePath).replace(/^\/+/, '')}?ref=${encodeURIComponent(branch || 'main')}`,
        token
    );
    let decoded = '';
    if (data.encoding === 'base64' && data.content) {
        decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
    }
    return { path: data.path, sha: data.sha, decoded, size: data.size };
}

async function writeFile(token, owner, repo, filePath, content, branch, message) {
    const path = String(filePath).replace(/^\/+/, '');
    let sha;
    try {
        const cur = await readFile(token, owner, repo, path, branch);
        sha = cur.sha;
    } catch (e) {
        if (e.status !== 404) throw e;
    }
    const body = {
        message: message || `Aeternus: update ${path}`,
        content: Buffer.from(content, 'utf8').toString('base64'),
        branch: branch || 'main'
    };
    if (sha) body.sha = sha;
    return gh(`/repos/${owner}/${repo}/contents/${path}`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

async function deleteFile(token, owner, repo, filePath, branch, message) {
    const path = String(filePath).replace(/^\/+/, '');
    const cur = await readFile(token, owner, repo, path, branch);
    return gh(`/repos/${owner}/${repo}/contents/${path}`, token, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: message || `Aeternus: delete ${path}`,
            sha: cur.sha,
            branch: branch || 'main'
        })
    });
}

async function getRepo(token, owner, repo) {
    return gh(`/repos/${owner}/${repo}`, token);
}

module.exports = {
    me,
    listRepos,
    listContents,
    readFile,
    writeFile,
    deleteFile,
    getRepo
};
