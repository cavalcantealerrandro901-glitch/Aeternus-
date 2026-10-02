/**
 * Aeternus Core — IA pública no Discord; moderação/GitHub só admin
 * Ativação: marcar o bot | @aeternus | @aeternos | reply | DM
 */
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const OWNER_ID = () => String(process.env.OWNER_ID || '').trim();
function env(n) { return String(process.env[n] || '').trim(); }
function isOwner(userId) { const oid = OWNER_ID(); return oid && String(userId) === oid; }

/** Dono ou admin do servidor (Administrator / ManageGuild) */
function isAdmin(member, userId) {
  if (isOwner(userId)) return true;
  if (!member) return false;
  try {
    const perms = member.permissions;
    if (!perms) return false;
    return (
      perms.has(PermissionFlagsBits.Administrator) ||
      perms.has(PermissionFlagsBits.ManageGuild)
    );
  } catch (_) {
    return false;
  }
}

function allowedReposConfig() {
  const raw = env('AETERNUS_REPOS') || env('GITHUB_REPOS');
  if (!raw) return null;
  return raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).map((s) => {
    if (s.includes('/')) {
      const [owner, name] = s.split('/');
      return { owner, name, full: `${owner}/${name}` };
    }
    return { owner: GH_OWNER(), name: s, full: `${GH_OWNER()}/${s}` };
  });
}

function GH_OWNER() { return env('GITHUB_OWNER') || 'cavalcantealerrandro901-glitch'; }

function parseRepo(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  if (s.includes('/')) {
    const [owner, name] = s.split('/');
    return { owner, name };
  }
  return { owner: GH_OWNER(), name: s };
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

function detectActivation(content, client, message = null) {
  const raw = String(content || '');
  const n = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  if (!n && !message?.mentions?.users?.size) return { activated: false, command: '' };

  if (client?.user?.id) {
    const mentioned = message?.mentions?.users?.has(client.user.id) || new RegExp('<@!?' + client.user.id + '>').test(raw);
    if (mentioned) {
      const cmd = raw.replace(new RegExp('<@!?' + client.user.id + '>', 'g'), '').replace(/\s+/g, ' ').trim();
      return { activated: true, command: cmd, viaBotMention: true };
    }
  }

  const nameRe = /(?:^|\s)(?:@\s*)?(?:aeternus|aeternos)\b\s*[,:]?\s*(.*)$/i;
  const strict = n.match(nameRe);
  if (strict) return { activated: true, command: (strict[1] || '').trim() };
  const at = raw.match(/@\s*(?:aeternus|aeternos)\b\s*[,:]?\s*(.*)$/i);
  if (at) return { activated: true, command: (at[1] || '').trim() };
  return { activated: false, command: '' };
}

function systemPrompt(extra = '', { admin = false } = {}) {
  const base = [
    'Você é Aeternus, a IA do servidor no Discord.',
    'Responda em português do Brasil, de forma direta e útil.',
    'Personalidade: afiada, sem enrolação (estilo Grok).'
  ];
  if (admin) {
    base.push('O usuário é ADMIN: pode pedir gestão de canais, cargos, convites e (se configurado) GitHub.');
  } else {
    base.push('O usuário é MEMBRO comum: só conversa e tirar dúvidas. NÃO ofereça nem invente ações de moderação, ban, kick, criar canal/cargo ou GitHub.');
  }
  if (extra) base.push(extra);
  return base.join('\n');
}

function activeProviders() { return env('GROQ_API_KEY') ? ['groq'] : ['none']; }
const GROQ_MODEL_FALLBACKS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

async function chatAI(userMessage, contextBlock = '', { admin = false } = {}) {
  const key = env('GROQ_API_KEY');
  if (!key) return { text: 'Configure `GROQ_API_KEY` no Render.', provider: 'none' };
  const preferred = env('GROQ_MODEL');
  const models = preferred ? [preferred, ...GROQ_MODEL_FALLBACKS.filter((m) => m !== preferred)] : GROQ_MODEL_FALLBACKS;
  const messages = [{ role: 'system', content: systemPrompt(contextBlock, { admin }) }, { role: 'user', content: String(userMessage || '').slice(0, 6000) }];
  const errors = [];
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.55, max_tokens: 1200 })
      });
      if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`${res.status} ${t.slice(0, 160)}`); }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text || !String(text).trim()) throw new Error('empty');
      return { text: String(text).trim(), provider: 'groq', model };
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }
  return { text: 'IA indisponível: ' + errors.join(' | '), provider: 'none' };
}

async function ghFetch(path, opts = {}) {
  const h = ghHeaders();
  if (!h) throw new Error('GITHUB_TOKEN ausente');
  const res = await fetch(`https://api.github.com${path}`, { ...opts, headers: { ...h, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `GitHub ${res.status}`);
  return data;
}

async function listRepos() {
  const cfg = allowedReposConfig();
  if (cfg && cfg.length) {
    const out = [];
    for (const r of cfg) {
      try {
        const data = await ghFetch(`/repos/${r.owner}/${r.name}`);
        out.push({ full: data.full_name, name: data.name, private: data.private, url: data.html_url, desc: data.description });
      } catch (e) {
        out.push({ full: r.full, name: r.name, error: e.message });
      }
    }
    return out;
  }
  const data = await ghFetch('/user/repos?per_page=50&sort=updated');
  return (Array.isArray(data) ? data : []).map((r) => ({
    full: r.full_name, name: r.name, private: r.private, url: r.html_url, desc: r.description
  }));
}

async function getFile(repoInput, path) {
  const repo = parseRepo(repoInput);
  if (!repo) throw new Error('Repo inválido');
  const data = await ghFetch(`/repos/${repo.owner}/${repo.name}/contents/${path}`);
  const content = Buffer.from(data.content || '', 'base64').toString('utf8');
  return { content, sha: data.sha, path: data.path, repo: `${repo.owner}/${repo.name}` };
}

async function putFile(repoInput, path, content, message) {
  const repo = parseRepo(repoInput);
  if (!repo) throw new Error('Repo inválido');
  let sha;
  try {
    const existing = await ghFetch(`/repos/${repo.owner}/${repo.name}/contents/${path}`);
    sha = existing.sha;
  } catch (_) {}
  const body = {
    message: message || `Aeternus: ${path}`,
    content: Buffer.from(String(content), 'utf8').toString('base64'),
    branch: env('GITHUB_BRANCH') || 'main'
  };
  if (sha) body.sha = sha;
  const data = await ghFetch(`/repos/${repo.owner}/${repo.name}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { ok: true, url: data.content?.html_url || data.commit?.html_url, repo: `${repo.owner}/${repo.name}` };
}

async function createRepo(name, description, isPrivate = true) {
  const data = await ghFetch('/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: description || '', private: !!isPrivate, auto_init: true })
  });
  return { full: data.full_name, name: data.name, url: data.html_url };
}

async function listTree(repoInput, path = '') {
  const repo = parseRepo(repoInput);
  if (!repo) throw new Error('Repo inválido');
  const ref = env('GITHUB_BRANCH') || 'main';
  const data = await ghFetch(`/repos/${repo.owner}/${repo.name}/git/trees/${ref}?recursive=1`);
  let tree = Array.isArray(data.tree) ? data.tree : [];
  if (path) tree = tree.filter((t) => t.path.startsWith(path.replace(/^\/+/, '')));
  return tree.slice(0, 100).map((t) => `${t.type === 'tree' ? '📁' : '📄'} ${t.path}`);
}

async function tryGithubIntent(command) {
  const t = String(command || '').trim();
  const low = t.toLowerCase();
  if (!ghHeaders()) {
    if (/\b(github|reposit[oó]rio|repo|arquivo|commit)\b/i.test(t)) return { handled: true, text: 'Defina `GITHUB_TOKEN` no Render.' };
    return { handled: false };
  }
  if (/\b(lista|listar|meus)\b.*\b(repos?|reposit)/i.test(low) || /^repos?$/i.test(low) || /\breposit[oó]rios\b/i.test(low)) {
    const repos = await listRepos();
    const lines = repos.map((r) => r.error ? `• **${r.full || r.name}** — ⚠️ ${r.error}` : `• **${r.full || r.name}**${r.private ? ' 🔒' : ''} — ${r.desc || r.url}`);
    return { handled: true, text: `**Repositórios** (${repos.length}):\n${lines.join('\n') || '(vazio)'}` };
  }
  const treeM = t.match(/(?:arquivos|lista|tree|estrutura)\s+(?:do\s+)?(?:repo\s+)?([\w.-]+(?:\/[\w.-]+)?)(?:\s+([\w./-]+))?/i);
  if (treeM) {
    const list = await listTree(treeM[1], treeM[2] || '');
    return { handled: true, text: `Arquivos em \`${treeM[1]}\`:\n\`\`\`\n${list.join('\n').slice(0, 1800)}\n\`\`\`` };
  }
  const readM = t.match(/(?:leia|ler|read|mostra|mostrar|abre|abrir)\s+(?:o\s+)?(?:arquivo\s+)?([\w.-]+(?:\/[\w.-]+)?)\s+([\w./-]+)/i);
  if (readM) {
    const file = await getFile(readM[1], readM[2]);
    return { handled: true, text: `📄 \`${file.repo || readM[1]}/${readM[2]}\`:\n\`\`\`\n${String(file.content || '').slice(0, 1500)}\n\`\`\`` };
  }
  const createRepoM = t.match(/(?:crie|criar|create)\s+(?:um\s+)?(?:repo|reposit[oó]rio)\s+([\w.-]+)(?:\s+(.+))?/i);
  if (createRepoM) {
    const created = await createRepo(createRepoM[1], createRepoM[2] || 'Criado pelo Aeternus', true);
    return { handled: true, text: `✅ Repo criado: **${created.full || created.name}**\n${created.url}` };
  }
  const writeM = t.match(/(?:escreva|escrever|salve|salvar|crie arquivo|criar arquivo|update|atualize)\s+(?:em\s+)?([\w.-]+(?:\/[\w.-]+)?)\s+([\w./-]+)\s*[:\n]+([\s\S]+)/i);
  if (writeM) {
    let content = writeM[3].trim();
    const fence = content.match(/^```[\w]*\n?([\s\S]*?)```$/);
    if (fence) content = fence[1];
    const result = await putFile(writeM[1], writeM[2], content, `Aeternus: ${writeM[2]}`);
    return { handled: true, text: `✅ Arquivo salvo: \`${result.repo}/${writeM[2]}\`\n${result.url || ''}` };
  }
  return { handled: false };
}

function resolveGuild(client, message, hint) {
  const h = String(hint || '').trim();
  if (h) {
    const byId = client.guilds.cache.get(h);
    if (byId) return byId;
    const byName = client.guilds.cache.find((g) => g.name.toLowerCase() === h.toLowerCase() || g.name.toLowerCase().includes(h.toLowerCase()));
    if (byName) return byName;
  }
  return message.guild || null;
}

async function tryDiscordIntent(command, message, client) {
  const t = String(command || '').trim();
  const low = t.toLowerCase();

  if (/\b(lista|listar)\b.*\bservidores?\b/i.test(low) || /^servidores?$/i.test(low)) {
    const lines = [...client.guilds.cache.values()].map((g) => `• **${g.name}** (\`${g.id}\`) — ${g.memberCount} membros`);
    return { handled: true, text: `**Servidores** (${lines.length}):\n${lines.join('\n') || '(nenhum)'}` };
  }

  const inviteM = t.match(/(?:link|convite|invite)\s+(?:do\s+)?(?:servidor\s+)?(.+)/i) || ( /\b(convite|invite)\b/i.test(low) ? [null, ''] : null);
  if (inviteM) {
    const guild = resolveGuild(client, message, inviteM[1]);
    if (!guild) return { handled: true, text: 'Servidor não encontrado. Use o nome ou ID.' };
    const me = guild.members.me;
    if (!me?.permissions?.has(PermissionFlagsBits.CreateInstantInvite)) return { handled: true, text: `Sem permissão **Criar Convite** em **${guild.name}**.` };
    let channel = guild.systemChannel || guild.channels.cache.find((c) => c.isTextBased?.() && c.viewable && c.permissionsFor(me)?.has(PermissionFlagsBits.CreateInstantInvite));
    if (!channel) return { handled: true, text: 'Nenhum canal adequado para convite.' };
    const inv = await channel.createInvite({ maxAge: 0, maxUses: 0, reason: 'Aeternus admin' });
    return { handled: true, text: `🔗 Convite de **${guild.name}**: ${inv.url}` };
  }

  if (/\b(lista|listar)\b.*\bcanais?\b/i.test(low)) {
    const guild = resolveGuild(client, message, t.match(/servidor\s+(.+)/i)?.[1]);
    if (!guild) return { handled: true, text: 'Use dentro de um servidor ou diga o nome.' };
    const lines = guild.channels.cache.filter((c) => c.isTextBased?.()).map((c) => `• #${c.name} (\`${c.id}\`)`).first(30);
    return { handled: true, text: `**Canais de texto** em **${guild.name}**:\n${[...guild.channels.cache.filter((c) => c.isTextBased?.()).values()].slice(0, 30).map((c) => `• #${c.name} (\`${c.id}\`)`).join('\n')}` };
  }

  if (/\b(lista|listar)\b.*\bcargos?\b/i.test(low)) {
    const guild = resolveGuild(client, message, null);
    if (!guild) return { handled: true, text: 'Use dentro de um servidor.' };
    const lines = [...guild.roles.cache.values()].filter((r) => r.id !== guild.id).sort((a, b) => b.position - a.position).slice(0, 40).map((r) => `• **${r.name}** (\`${r.id}\`)`);
    return { handled: true, text: `**Cargos** em **${guild.name}**:\n${lines.join('\n')}` };
  }

  const createCh = t.match(/(?:crie|criar|create)\s+(?:um\s+)?(?:canal\s+)?(?:de\s+texto\s+)?(?:chamado\s+|nome\s+)?["']?([\w\-\sáàãâéêíóôõúç]+)["']?/i);
  if (createCh && /\b(canal|channel)\b/i.test(low)) {
    const guild = resolveGuild(client, message, null);
    if (!guild) return { handled: true, text: 'Use dentro de um servidor.' };
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageChannels)) return { handled: true, text: 'Sem permissão **Gerenciar Canais**.' };
    const name = createCh[1].trim().toLowerCase().replace(/\s+/g, '-').slice(0, 90);
    const ch = await guild.channels.create({ name, type: ChannelType.GuildText, reason: 'Aeternus admin' });
    return { handled: true, text: `✅ Canal criado: ${ch}` };
  }

  const createRole = t.match(/(?:crie|criar|create)\s+(?:um\s+)?cargo\s+["']?([^"'\n]+)["']?/i);
  if (createRole) {
    const guild = resolveGuild(client, message, null);
    if (!guild) return { handled: true, text: 'Use dentro de um servidor.' };
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageRoles)) return { handled: true, text: 'Sem permissão **Gerenciar Cargos**.' };
    const name = createRole[1].trim().slice(0, 100);
    const role = await guild.roles.create({ name, reason: 'Aeternus admin' });
    return { handled: true, text: `✅ Cargo criado: **${role.name}** (\`${role.id}\`)` };
  }

  const giveM = t.match(/(?:d[eê]|dar|adicione|adicionar)\s+(?:o\s+)?cargo\s+["']?([^"'\n]+?)["']?\s+(?:para|ao?|pro?|a)\s+<@!?(\d+)>/i) || t.match(/(?:d[eê]|dar)\s+<@!?(\d+)>\s+(?:o\s+)?cargo\s+["']?([^"'\n]+)["']?/i);
  if (giveM) {
    const guild = resolveGuild(client, message, null);
    if (!guild) return { handled: true, text: 'Use dentro de um servidor.' };
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageRoles)) return { handled: true, text: 'Sem permissão **Gerenciar Cargos**.' };
    let roleHint, userId;
    if (/^\d+$/.test(giveM[1])) { userId = giveM[1]; roleHint = giveM[2]; } else { roleHint = giveM[1]; userId = giveM[2]; }
    const role = guild.roles.cache.get(roleHint) || guild.roles.cache.find((r) => r.name.toLowerCase() === String(roleHint).toLowerCase());
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!role) return { handled: true, text: `Cargo \`${roleHint}\` não encontrado.` };
    if (!member) return { handled: true, text: 'Membro não encontrado.' };
    await member.roles.add(role, 'Aeternus admin');
    return { handled: true, text: `✅ Cargo **${role.name}** dado a **${member.user.tag}**.` };
  }

  if (/\b(info|informa[cç][aã]o)\b.*\bservidor\b/i.test(low)) {
    const guild = resolveGuild(client, message, t.match(/servidor\s+(.+)/i)?.[1]);
    if (!guild) return { handled: true, text: 'Servidor não encontrado.' };
    return { handled: true, text: `**${guild.name}**\nID: \`${guild.id}\`\nMembros: ${guild.memberCount}\nCanais: ${guild.channels.cache.size}\nCargos: ${guild.roles.cache.size}` };
  }

  return { handled: false };
}

async function replyChunks(message, text) {
  const t = String(text || '').trim();
  if (!t) return;
  const MAX = 1900;
  if (t.length <= MAX) { await message.reply({ content: t }).catch(() => message.channel.send(t).catch(() => {})); return; }
  for (let i = 0; i < t.length; i += MAX) {
    const chunk = t.slice(i, i + MAX);
    if (i === 0) await message.reply({ content: chunk }).catch(() => message.channel.send(chunk).catch(() => {}));
    else await message.channel.send(chunk).catch(() => {});
  }
}

async function handleOwnerMessage(message, client) {
  const content = String(message.content || '');
  const isDm = !message.guild;
  let activated = false;
  let command = content;
  const admin = isAdmin(message.member, message.author.id);

  if (isDm) {
    activated = true;
    const det = detectActivation(content, client, message);
    if (det.activated && det.command) command = det.command;
  } else {
    const det = detectActivation(content, client, message);
    activated = det.activated;
    command = det.command || '';
    if (!activated && message.reference?.messageId) {
      try {
        const ref = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (ref?.author?.id === client.user?.id) {
          activated = true;
          command = content.trim();
        }
      } catch (_) {}
    }
  }

  if (!activated) return false;

  if (!command || !String(command).trim()) {
    const botName = client.user?.username || 'Aeternos';
    const lines = [
      'Olá! Sou a **Aeternus**.',
      '',
      '**Como me chamar:**',
      '• Me marque: `@' + botName + ' sua pergunta`',
      '• Ou escreva `@aeternus` / `@aeternos`',
      '• Ou responda uma mensagem minha',
      '• No PV, qualquer mensagem'
    ];
    if (admin) {
      lines.push('', '**Admin:** criar canal/cargo, convites, listar servidores, GitHub (se configurado).');
    } else {
      lines.push('', 'Pode conversar livremente. Moderação e gestão de servidor são só para admins.');
    }
    await message.reply(lines.join('\n')).catch(() => {});
    return true;
  }

  if (message.channel?.sendTyping) await message.channel.sendTyping().catch(() => {});

  try {
    if (admin) {
      const disc = await tryDiscordIntent(command, message, client);
      if (disc.handled) {
        await replyChunks(message, disc.text);
        return true;
      }
      const gh = await tryGithubIntent(command);
      if (gh.handled) {
        await replyChunks(message, gh.text);
        return true;
      }
    } else if (
      /\b(ban|kick|mute|expuls|criar\s+canal|criar\s+cargo|apagar\s+canal|deletar\s+canal|gerenciar|convite|github|reposit[oó]rio|commit)\b/i.test(
        command
      )
    ) {
      await message
        .reply('Isso é só para **admins** do servidor. Posso ajudar com outras dúvidas.')
        .catch(() => {});
      return true;
    }

    let ctx = '';
    if (admin) {
      try {
        const guilds = [...client.guilds.cache.values()]
          .slice(0, 12)
          .map((g) => `- ${g.name} (${g.id})`)
          .join('\n');
        ctx += `Servidores:\n${guilds}\n\n`;
        ctx += 'Ações admin: criar canal/cargo · link do servidor · listar servidores/canais/cargos\n';
      } catch (_) {}
      if (ghHeaders()) {
        try {
          const repos = await listRepos();
          ctx +=
            `Repos (${repos.length}):\n` +
            repos.slice(0, 15).map((r) => `- ${r.full || r.name}`).join('\n') +
            '\n';
        } catch (_) {}
      }
    } else {
      ctx += 'Usuário comum: só conversa. Não invente ações de moderação.\n';
      if (message.guild) ctx += `Servidor atual: ${message.guild.name}\n`;
    }

    const result = await chatAI(command, ctx, { admin });
    await replyChunks(message, result.text || '(sem resposta)');
    return true;
  } catch (e) {
    await message.reply(`❌ Erro: ${e.message}`).catch(() => {});
    return true;
  }
}

function setup(client) {
  client.aeternusCore = {
    isOwner,
    isAdmin,
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
    `[aeternusCore] IA pública · admin=OWNER/ManageGuild · owner=${OWNER_ID() || '?'} · groq=${env('GROQ_API_KEY') ? 'ok' : 'MISSING'}`
  );
}

module.exports = {
  setup,
  isOwner,
  isAdmin,
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
