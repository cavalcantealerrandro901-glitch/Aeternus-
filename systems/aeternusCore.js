/**
 * Aeternus Core — assistente de IA privado (só OWNER_ID)
 * Ativação: @aeternus | menção do bot | DM do dono
 * Multi-repo: todos os repositórios do dono (ou lista AETERNUS_REPOS)
 */

const OWNER_ID = () => String(process.env.OWNER_ID || '').trim();

function env(n) {
  return String(process.env[n] || '').trim();
}

function isOwner(userId) {
  const oid = OWNER_ID();
  return oid && String(userId) === oid;
}

/** Lista de repos permitidos (opcional). Vazio = todos do GITHUB_OWNER */
function allowedReposConfig() {
  const raw = env('AETERNUS_REPOS') || env('GITHUB_REPOS');
  if (!raw) return null; // null = todos
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (s.includes('/')) {
        const [owner, name] = s.split('/');
        return { owner: owner.trim(), name: name.trim(), full: `${owner.trim()}/${name.trim()}` };
      }
      return { owner: GH_OWNER(), name: s, full: `${GH_OWNER()}/${s}` };
    });
}

function GH_OWNER() {
  return env('GITHUB_OWNER') || 'cavalcantealerrandro901-glitch';
}

/** Resolve "repo" ou "owner/repo" → { owner, name } */
function resolveRepoRef(repoArg) {
  const s = String(repoArg || '').trim();
  if (!s) throw new Error('Nome do repositório obrigatório');
  if (s.includes('/')) {
    const [owner, name] = s.split('/');
    return { owner: owner.trim(), name: name.trim() };
  }
  return { owner: GH_OWNER(), name: s };
}

function assertRepoAllowed(owner, name) {
  const cfg = allowedReposConfig();
  if (!cfg) return; // todos permitidos
  const full = `${owner}/${name}`;
  const ok = cfg.some((r) => r.full.toLowerCase() === full.toLowerCase() || r.name.toLowerCase() === name.toLowerCase());
  if (!ok) {
    throw new Error(
      `Repo \`${full}\` não está na lista AETERNUS_REPOS. Permitidos: ${cfg.map((r) => r.full).join(', ')}`
    );
  }
}

function detectActivation(content, client) {
  const raw = String(content || '');
  const n = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!n) return { activated: false, command: '' };

  const strict = n.match(/(?:^|\s)(?:@\s*|arroba\s+|at\s+)aeternus\b\s*[,:]?\s*(.*)$/i);
  if (strict) {
    return { activated: true, command: (strict[1] || '').trim() || raw };
  }

  const at = raw.match(/@\s*aeternus\b\s*[,:]?\s*(.*)$/i);
  if (at) {
    return { activated: true, command: (at[1] || '').trim() || raw };
  }

  if (client?.user?.id) {
    const re = new RegExp('<@!?' + client.user.id + '>\\s*', 'g');
    if (re.test(raw)) {
      const cmd = raw.replace(new RegExp('<@!?' + client.user.id + '>\\s*', 'g'), '').trim();
      return { activated: true, command: cmd || raw, viaBotMention: true };
    }
  }

  return { activated: false, command: '' };
}

function systemPrompt(extra = '') {
  return [
    'Você é Aeternus, assistente pessoal privado do dono no Discord.',
    'Responda em português do Brasil, de forma direta e útil.',
    'Você tem acesso a VÁRIOS repositórios GitHub do dono — não apenas um.',
    'Sempre indique qual repositório está sendo usado quando falar de código/arquivos.',
    'Seja concisa em Discord (máx ~1800 caracteres por resposta quando possível).',
    extra ? '\n' + extra : ''
  ].filter(Boolean).join('\n');
}

async function callOpenAICompatible(baseUrl, apiKey, model, messages, extraHeaders = {}) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.55,
      max_tokens: 1200
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${res.status} ${t.slice(0, 140)}`);
  }
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content || '').trim();
}

async function callGemini(apiKey, model, messages) {
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const user = messages.filter((m) => m.role !== 'system').map((m) => `${m.role}: ${m.content}`).join('\n');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { temperature: 0.55, maxOutputTokens: 1200 }
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`gemini ${res.status} ${t.slice(0, 140)}`);
  }
  const data = await res.json();
  return String(data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '').trim();
}

function activeProviders() {
  const list = [];
  if (env('GROQ_API_KEY')) list.push('groq');
  if (env('OPENAI_API_KEY')) list.push('openai');
  if (env('GEMINI_API_KEY') || env('GOOGLE_API_KEY')) list.push('gemini');
  if (env('OPENROUTER_API_KEY')) list.push('openrouter');
  return list.length ? list : ['none'];
}

async function chatAI(userMessage, contextBlock = '') {
  const messages = [
    { role: 'system', content: systemPrompt(contextBlock) },
    { role: 'user', content: String(userMessage || '').slice(0, 6000) }
  ];
  const errors = [];

  if (env('GROQ_API_KEY')) {
    try {
      const text = await callOpenAICompatible(
        'https://api.groq.com/openai/v1',
        env('GROQ_API_KEY'),
        env('GROQ_MODEL') || 'llama-3.3-70b-versatile',
        messages
      );
      if (text) return { text, provider: 'groq' };
    } catch (e) {
      errors.push(`groq: ${e.message}`);
    }
  }

  if (env('OPENAI_API_KEY')) {
    try {
      const text = await callOpenAICompatible(
        'https://api.openai.com/v1',
        env('OPENAI_API_KEY'),
        env('OPENAI_MODEL') || 'gpt-4o-mini',
        messages
      );
      if (text) return { text, provider: 'openai' };
    } catch (e) {
      errors.push(`openai: ${e.message}`);
    }
  }

  const gemKey = env('GEMINI_API_KEY') || env('GOOGLE_API_KEY');
  if (gemKey) {
    try {
      const text = await callGemini(gemKey, env('GEMINI_MODEL') || 'gemini-2.0-flash', messages);
      if (text) return { text, provider: 'gemini' };
    } catch (e) {
      errors.push(`gemini: ${e.message}`);
    }
  }

  if (env('OPENROUTER_API_KEY')) {
    try {
      const text = await callOpenAICompatible(
        'https://openrouter.ai/api/v1',
        env('OPENROUTER_API_KEY'),
        env('OPENROUTER_MODEL') || 'openai/gpt-4o-mini',
        messages,
        {
          'HTTP-Referer': env('OPENROUTER_REFERER') || 'https://aeternus.local',
          'X-Title': 'Aeternus'
        }
      );
      if (text) return { text, provider: 'openrouter' };
    } catch (e) {
      errors.push(`openrouter: ${e.message}`);
    }
  }

  return {
    text:
      'Nenhum provedor de IA disponível. Configure GROQ_API_KEY, OPENAI_API_KEY ou GEMINI_API_KEY no Render.',
    provider: 'none',
    error: errors.join(' | ')
  };
}

function ghHeaders() {
  const token = env('GITHUB_TOKEN') || env('GH_TOKEN');
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Aeternus-Bot',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function ghFetch(path, opts = {}) {
  const headers = ghHeaders();
  if (!headers) throw new Error('GITHUB_TOKEN não configurado');
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers || {}), 'Content-Type': 'application/json' }
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data?.message || String(text).slice(0, 120);
    throw new Error(`GitHub ${res.status}: ${msg}`);
  }
  return data;
}

/** Lista TODOS os repos acessíveis (vários), filtrando por AETERNUS_REPOS se definido */
async function listRepos() {
  const cfg = allowedReposConfig();

  // Se lista explícita com owner/repo, busca cada um
  if (cfg && cfg.length) {
    const out = [];
    for (const r of cfg) {
      try {
        const data = await ghFetch(`/repos/${r.owner}/${r.name}`);
        out.push({
          name: data.name,
          full: data.full_name,
          private: data.private,
          desc: data.description || '',
          url: data.html_url,
          defaultBranch: data.default_branch || 'main'
        });
      } catch (e) {
        out.push({ name: r.name, full: r.full, error: e.message });
      }
    }
    return out;
  }

  // Todos os repos do usuário autenticado (pode ser mais de 50 — pagina)
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const data = await ghFetch(`/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator`);
    if (!Array.isArray(data) || !data.length) break;
    for (const r of data) {
      all.push({
        name: r.name,
        full: r.full_name,
        private: r.private,
        desc: r.description || '',
        url: r.html_url,
        defaultBranch: r.default_branch || 'main'
      });
    }
    if (data.length < 100) break;
  }

  // Fallback: repos públicos do GITHUB_OWNER
  if (!all.length) {
    const owner = GH_OWNER();
    const data = await ghFetch(`/users/${owner}/repos?per_page=100&sort=updated`);
    for (const r of data || []) {
      all.push({
        name: r.name,
        full: r.full_name,
        private: r.private,
        desc: r.description || '',
        url: r.html_url,
        defaultBranch: r.default_branch || 'main'
      });
    }
  }

  return all;
}

async function getFile(repoArg, filePath, ref) {
  const { owner, name } = resolveRepoRef(repoArg);
  assertRepoAllowed(owner, name);
  const branch = ref || 'main';
  const data = await ghFetch(
    `/repos/${owner}/${name}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}?ref=${branch}`
  );
  if (data?.content && data?.encoding === 'base64') {
    return {
      repo: `${owner}/${name}`,
      path: data.path,
      sha: data.sha,
      content: Buffer.from(data.content, 'base64').toString('utf8'),
      size: data.size
    };
  }
  return data;
}

async function putFile(repoArg, filePath, content, message, branch = 'main') {
  const { owner, name } = resolveRepoRef(repoArg);
  assertRepoAllowed(owner, name);
  let sha;
  try {
    const existing = await getFile(`${owner}/${name}`, filePath, branch);
    sha = existing?.sha;
  } catch (_) {}

  const body = {
    message: message || `Aeternus: update ${filePath}`,
    content: Buffer.from(String(content), 'utf8').toString('base64'),
    branch
  };
  if (sha) body.sha = sha;

  const data = await ghFetch(
    `/repos/${owner}/${name}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
  return {
    repo: `${owner}/${name}`,
    path: filePath,
    commit: data?.commit?.sha,
    url: data?.content?.html_url || data?.commit?.html_url
  };
}

async function createRepo(name, description = '', isPrivate = true) {
  const data = await ghFetch('/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: true
    })
  });
  return { name: data.name, full: data.full_name, url: data.html_url, private: data.private };
}

async function listTree(repoArg, pathFilter = '') {
  const { owner, name } = resolveRepoRef(repoArg);
  assertRepoAllowed(owner, name);
  let data;
  try {
    data = await ghFetch(`/repos/${owner}/${name}/git/trees/main?recursive=1`);
  } catch {
    data = await ghFetch(`/repos/${owner}/${name}/git/trees/master?recursive=1`);
  }
  let tree = data?.tree || [];
  if (pathFilter) {
    const p = pathFilter.replace(/^\/|\/$/g, '');
    tree = tree.filter((t) => t.path === p || t.path.startsWith(p + '/'));
  }
  return tree.slice(0, 100).map((t) => `${t.type === 'tree' ? '📁' : '📄'} ${t.path}`);
}

async function tryGithubIntent(command) {
  const t = String(command || '').trim();
  const low = t.toLowerCase();

  if (!ghHeaders()) {
    if (/\b(github|reposit[oó]rio|repo|arquivo|commit)\b/i.test(t)) {
      return {
        handled: true,
        text: 'GitHub não configurado. Defina `GITHUB_TOKEN` (classic com scope **repo**) no Render.'
      };
    }
    return { handled: false };
  }

  if (
    /\b(lista|listar|meus)\b.*\b(repos?|reposit)/i.test(low) ||
    /^repos?$/i.test(low) ||
    /\breposit[oó]rios\b/i.test(low)
  ) {
    const repos = await listRepos();
    const lines = repos.map((r) => {
      if (r.error) return `• **${r.full || r.name}** — ⚠️ ${r.error}`;
      return `• **${r.full || r.name}**${r.private ? ' 🔒' : ''} — ${r.desc || r.url}`;
    });
    const cfg = allowedReposConfig();
    const note = cfg
      ? `\n_(lista filtrada por AETERNUS_REPOS: ${cfg.length} repos)_`
      : `\n_(todos os repos acessíveis pelo token — ${repos.length})_`;
    return {
      handled: true,
      text: `**Repositórios do sistema** (${repos.length}):\n${lines.join('\n') || '(vazio)'}${note}`
    };
  }

  // arquivos / tree — aceita owner/repo ou só repo
  const treeM = t.match(
    /(?:arquivos|lista|tree|estrutura)\s+(?:do\s+)?(?:repo\s+)?([\w.-]+(?:\/[\w.-]+)?)(?:\s+([\w./-]+))?/i
  );
  if (treeM) {
    const list = await listTree(treeM[1], treeM[2] || '');
    return {
      handled: true,
      text: `Arquivos em \`${treeM[1]}\`:\n\`\`\`\n${list.join('\n').slice(0, 1800)}\n\`\`\``
    };
  }

  const readM = t.match(
    /(?:leia|ler|read|mostra|mostrar|abre|abrir)\s+(?:o\s+)?(?:arquivo\s+)?([\w.-]+(?:\/[\w.-]+)?)\s+([\w./-]+)/i
  );
  if (readM) {
    const file = await getFile(readM[1], readM[2]);
    const body = String(file.content || '').slice(0, 1500);
    return {
      handled: true,
      text: `📄 \`${file.repo || readM[1]}/${readM[2]}\` (sha ${String(file.sha || '').slice(0, 7)}):\n\`\`\`\n${body}\n\`\`\``
    };
  }

  const createRepoM = t.match(/(?:crie|criar|create)\s+(?:um\s+)?(?:repo|reposit[oó]rio)\s+([\w.-]+)(?:\s+(.+))?/i);
  if (createRepoM) {
    const created = await createRepo(createRepoM[1], createRepoM[2] || 'Criado pelo Aeternus', true);
    return {
      handled: true,
      text: `✅ Repo criado: **${created.full || created.name}**\n${created.url}`
    };
  }

  const writeM = t.match(
    /(?:escreva|escrever|salve|salvar|crie arquivo|criar arquivo|update|atualize)\s+(?:em\s+)?([\w.-]+(?:\/[\w.-]+)?)\s+([\w./-]+)\s*[:\n]+([\s\S]+)/i
  );
  if (writeM) {
    let content = writeM[3].trim();
    const fence = content.match(/^```[\w]*\n?([\s\S]*?)```$/);
    if (fence) content = fence[1];
    const result = await putFile(writeM[1], writeM[2], content, `Aeternus: ${writeM[2]}`);
    return {
      handled: true,
      text: `✅ Arquivo salvo: \`${result.repo}/${writeM[2]}\`\nCommit: \`${result.commit || '?'}\`\n${result.url || ''}`
    };
  }

  return { handled: false };
}

async function replyChunks(message, text) {
  const t = String(text || '').trim();
  if (!t) return;
  const MAX = 1900;
  if (t.length <= MAX) {
    await message.reply({ content: t }).catch(() => message.channel.send(t).catch(() => {}));
    return;
  }
  for (let i = 0; i < t.length; i += MAX) {
    const chunk = t.slice(i, i + MAX);
    if (i === 0) {
      await message.reply({ content: chunk }).catch(() => message.channel.send(chunk).catch(() => {}));
    } else {
      await message.channel.send(chunk).catch(() => {});
    }
  }
}

async function handleOwnerMessage(message, client) {
  if (!isOwner(message.author.id)) return false;

  const content = String(message.content || '');
  const isDm = !message.guild;

  let activated = false;
  let command = content;

  if (isDm) {
    activated = true;
    const det = detectActivation(content, client);
    if (det.activated && det.command) command = det.command;
  } else {
    const det = detectActivation(content, client);
    activated = det.activated;
    command = det.command || content;
  }

  if (!activated) return false;
  if (!command || !String(command).trim()) {
    await message
      .reply(
        'Olá. Sou a **Aeternus** (modo privado, multi-repo).\n' +
          'Exemplos: `listar repos` · `arquivos Aeternus-` · `leia Aeternus- index.js`'
      )
      .catch(() => {});
    return true;
  }

  if (message.channel?.sendTyping) {
    await message.channel.sendTyping().catch(() => {});
  }

  try {
    const gh = await tryGithubIntent(command);
    if (gh.handled) {
      await replyChunks(message, gh.text);
      return true;
    }

    let ctx = '';
    if (ghHeaders()) {
      try {
        const repos = await listRepos();
        ctx =
          `Sistema multi-repositório (${repos.length} repos):\n` +
          repos
            .slice(0, 25)
            .map((r) => `- ${r.full || r.name}${r.private ? ' (privado)' : ''}`)
            .join('\n') +
          '\n\nComandos: listar repos | arquivos REPO | leia REPO path | escreva em REPO path: conteudo | criar repo NOME';
      } catch (_) {}
    }

    const result = await chatAI(command, ctx);
    await replyChunks(message, result.text || '(sem resposta)');
    return true;
  } catch (e) {
    await message.reply(`❌ Erro: ${e.message}`).catch(() => {});
    return true;
  }
}

function setup(client) {
  const cfg = allowedReposConfig();
  client.aeternusCore = {
    isOwner,
    detectActivation,
    handleOwnerMessage,
    activeProviders,
    listRepos,
    getFile,
    putFile,
    createRepo,
    allowedReposConfig
  };
  console.log(
    `[aeternusCore] multi-repo · owner=${OWNER_ID() || '?'} · providers=${activeProviders().join(',')} · repos=${cfg ? cfg.map((r) => r.full).join(',') : 'ALL'}`
  );
}

module.exports = {
  setup,
  isOwner,
  detectActivation,
  handleOwnerMessage,
  activeProviders,
  listRepos,
  getFile,
  putFile,
  createRepo,
  chatAI,
  allowedReposConfig
};
