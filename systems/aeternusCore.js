/**
 * Aeternus Core — assistente de IA privado (só OWNER_ID)
 * Ativação: marcar o bot | @aeternus | @aeternos | reply | DM do dono
 */
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const OWNER_ID = () => String(process.env.OWNER_ID || '').trim();
function env(n) { return String(process.env[n] || '').trim(); }
function isOwner(userId) { const oid = OWNER_ID(); return oid && String(userId) === oid; }

function allowedReposConfig() {
  const raw = env('AETERNUS_REPOS') || env('GITHUB_REPOS');
  if (!raw) return null;
  return raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).map((s) => {
    if (s.includes('/')) { const [owner, name] = s.split('/'); return { owner: owner.trim(), name: name.trim(), full: `${owner.trim()}/${name.trim()}` }; }
    return { owner: GH_OWNER(), name: s, full: `${GH_OWNER()}/${s}` };
  });
}
function GH_OWNER() { return env('GITHUB_OWNER') || 'cavalcantealerrandro901-glitch'; }
function resolveRepoRef(repoArg) {
  const s = String(repoArg || '').trim();
  if (!s) throw new Error('Nome do repositório obrigatório');
  if (s.includes('/')) { const [owner, name] = s.split('/'); return { owner: owner.trim(), name: name.trim() }; }
  return { owner: GH_OWNER(), name: s };
}
function assertRepoAllowed(owner, name) {
  const cfg = allowedReposConfig();
  if (!cfg) return;
  const full = `${owner}/${name}`;
  const ok = cfg.some((r) => r.full.toLowerCase() === full.toLowerCase() || r.name.toLowerCase() === name.toLowerCase());
  if (!ok) throw new Error(`Repo \`${full}\` não está em AETERNUS_REPOS`);
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

function systemPrompt(extra = '') {
  return ['Você é Aeternus, assistente pessoal privado do dono no Discord.', 'Responda em português do Brasil, de forma direta e útil.', 'Você pode gerenciar Discord (canais, cargos, convites) e repositórios GitHub.', extra ? '\n' + extra : ''].filter(Boolean).join('\n');
}

function activeProviders() { return env('GROQ_API_KEY') ? ['groq'] : ['none']; }
const GROQ_MODEL_FALLBACKS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

async function chatAI(userMessage, contextBlock = '') {
  const key = env('GROQ_API_KEY');
  if (!key) return { text: 'Configure `GROQ_API_KEY` no Render.', provider: 'none' };
  const preferred = env('GROQ_MODEL');
  const models = preferred ? [preferred, ...GROQ_MODEL_FALLBACKS.filter((m) => m !== preferred)] : GROQ_MODEL_FALLBACKS;
  const messages = [{ role: 'system', content: systemPrompt(contextBlock) }, { role: 'user', content: String(userMessage || '').slice(0, 6000) }];
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
      const text = String(data?.choices?.[0]?.message?.content || '').trim();
      if (!text) throw new Error('resposta vazia');
      return { text, provider: 'groq', model };
    } catch (e) { errors.push(`${model}: ${e.message}`); }
  }
  return { text: `Erro Groq:\n${errors.join('\n')}`, provider: 'groq', error: errors.join(' | ') };
}

function ghHeaders() {
  const token = env('GITHUB_TOKEN') || env('GH_TOKEN');
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Aeternus-Bot', 'X-GitHub-Api-Version': '2022-11-28' };
}

async function ghFetch(path, opts = {}) {
  const headers = ghHeaders();
  if (!headers) throw new Error('GITHUB_TOKEN não configurado');
  const res = await fetch(`https://api.github.com${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}), 'Content-Type': 'application/json' } });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${data?.message || String(text).slice(0, 120)}`);
  return data;
}

async function listRepos() {
  const cfg = allowedReposConfig();
  if (cfg && cfg.length) {
    const out = [];
    for (const r of cfg) {
      try {
        const data = await ghFetch(`/repos/${r.owner}/${r.name}`);
        out.push({ name: data.name, full: data.full_name, private: data.private, desc: data.description || '', url: data.html_url, defaultBranch: data.default_branch || 'main' });
      } catch (e) { out.push({ name: r.name, full: r.full, error: e.message }); }
    }
    return out;
  }
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const data = await ghFetch(`/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator`);
    if (!Array.isArray(data) || !data.length) break;
    for (const r of data) all.push({ name: r.name, full: r.full_name, private: r.private, desc: r.description || '', url: r.html_url, defaultBranch: r.default_branch || 'main' });
    if (data.length < 100) break;
  }
  return all;
}

async function getFile(repoArg, filePath, ref) {
  const { owner, name } = resolveRepoRef(repoArg);
  assertRepoAllowed(owner, name);
  const branch = ref || 'main';
  const data = await ghFetch(`/repos/${owner}/${name}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}?ref=${branch}`);
  if (data?.content && data?.encoding === 'base64') {
    return { repo: `${owner}/${name}`, path: data.path, sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf8'), size: data.size };
  }
  return data;
}

async function putFile(repoArg, filePath, content, message, branch = 'main') {
  const { owner, name } = resolveRepoRef(repoArg);
  assertRepoAllowed(owner, name);
  let sha;
  try { const existing = await getFile(`${owner}/${name}`, filePath, branch); sha = existing?.sha; } catch (_) {}
  const body = { message: message || `Aeternus: update ${filePath}`, content: Buffer.from(String(content), 'utf8').toString('base64'), branch };
  if (sha) body.sha = sha;
  const data = await ghFetch(`/repos/${owner}/${name}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`, { method: 'PUT', body: JSON.stringify(body) });
  return { repo: `${owner}/${name}`, path: filePath, commit: data?.commit?.sha, url: data?.content?.html_url || data?.commit?.html_url };
}

async function createRepo(name, description = '', isPrivate = true) {
  const data = await ghFetch('/user/repos', { method: 'POST', body: JSON.stringify({ name, description, private: isPrivate, auto_init: true }) });
  return { name: data.name, full: data.full_name, url: data.html_url, private: data.private };
}

async function listTree(repoArg, pathFilter = '') {
  const { owner, name } = resolveRepoRef(repoArg);
  assertRepoAllowed(owner, name);
  let data;
  try { data = await ghFetch(`/repos/${owner}/${name}/git/trees/main?recursive=1`); } catch { data = await ghFetch(`/repos/${owner}/${name}/git/trees/master?recursive=1`); }
  let tree = data?.tree || [];
  if (pathFilter) { const p = pathFilter.replace(/^\/|\/$/g, ''); tree = tree.filter((t) => t.path === p || t.path.startsWith(p + '/')); }
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
  if (h && /^\d{15,22}$/.test(h)) { const g = client.guilds.cache.get(h); if (g) return g; }
  if (h) {
    const low = h.toLowerCase();
    const byName = client.guilds.cache.find((g) => g.name.toLowerCase() === low || g.name.toLowerCase().includes(low));
    if (byName) return byName;
  }
  if (message?.guild) return message.guild;
  if (client.guilds.cache.size === 1) return client.guilds.cache.first();
  return null;
}

function parseColor(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(s)) return parseInt(s.replace('#', ''), 16);
  const named = { vermelho: 0xed4245, verde: 0x57f287, azul: 0x5865f2, roxo: 0x9b59b6, amarelo: 0xfee75c, laranja: 0xe67e22, rosa: 0xeb459e, cinza: 0x95a5a6, preto: 0x23272a, branco: 0xffffff };
  return named[s.toLowerCase()] ?? null;
}

async function tryDiscordIntent(command, message, client) {
  const t = String(command || '').trim();
  const low = t.toLowerCase();

  if (/\b(lista|listar|meus)\b.*\b(servidores?|guilds?)\b/i.test(low) || /^servidores?$/i.test(low)) {
    const lines = [...client.guilds.cache.values()].sort((a, b) => a.name.localeCompare(b.name)).map((g) => `• **${g.name}** \`${g.id}\` · ${g.memberCount} membros`);
    return { handled: true, text: `**Servidores** (${lines.length}):\n${lines.join('\n') || '(nenhum)'}` };
  }

  const inviteM = t.match(/(?:link|convite|invite)\s+(?:do\s+|da\s+|de\s+)?(?:servidor\s+)?(.+)/i);
  if (inviteM || /\b(cria|criar|gere|gerar)\s+(?:um\s+)?(?:link|convite|invite)\b/i.test(low)) {
    const hint = inviteM?.[1]?.replace(/\b(por favor|pfv|pls)\b/gi, '').trim() || message.guild?.name || '';
    const guild = resolveGuild(client, message, hint);
    if (!guild) {
      const names = [...client.guilds.cache.values()].map((g) => g.name).slice(0, 15).join(', ');
      return { handled: true, text: `Não achei esse servidor. Servidores: ${names || '(nenhum)'}` };
    }
    const me = guild.members.me;
    if (!me?.permissions?.has(PermissionFlagsBits.CreateInstantInvite)) return { handled: true, text: `Sem permissão **Criar Convite** em **${guild.name}**.` };
    let channel = guild.systemChannel || guild.channels.cache.find((c) => c.isTextBased?.() && c.viewable && c.permissionsFor(me)?.has(PermissionFlagsBits.CreateInstantInvite));
    if (!channel) return { handled: true, text: `Sem canal para criar convite em **${guild.name}**.` };
    const invite = await channel.createInvite({ maxAge: 0, maxUses: 0, unique: true, reason: 'Aeternus — dono' });
    return { handled: true, text: `🔗 **${guild.name}**\n${invite.url}\nCanal: #${channel.name}` };
  }

  if (/\b(lista|listar)\b.*\bcanais?\b/i.test(low) || /^canais?$/i.test(low)) {
    const guild = resolveGuild(client, message, t.match(/canais?\s+(?:do\s+|de\s+)?(.+)/i)?.[1]);
    if (!guild) return { handled: true, text: 'Diga o servidor ou use no servidor.' };
    const lines = guild.channels.cache.filter((c) => c.type !== ChannelType.GuildCategory).sort((a, b) => a.rawPosition - b.rawPosition).map((c) => `${c.type === ChannelType.GuildVoice ? '🔊' : '#️⃣'} **${c.name}** \`${c.id}\``).slice(0, 40);
    return { handled: true, text: `**Canais em ${guild.name}**:\n${lines.join('\n')}` };
  }

  if (/\b(lista|listar)\b.*\bcargos?\b/i.test(low) || /^cargos?$/i.test(low)) {
    const guild = resolveGuild(client, message, t.match(/cargos?\s+(?:do\s+|de\s+)?(.+)/i)?.[1]);
    if (!guild) return { handled: true, text: 'Diga o servidor ou use no servidor.' };
    const lines = guild.roles.cache.filter((r) => r.id !== guild.id).sort((a, b) => b.position - a.position).map((r) => `• **${r.name}** \`${r.id}\``).slice(0, 40);
    return { handled: true, text: `**Cargos em ${guild.name}**:\n${lines.join('\n')}` };
  }

  const catM = t.match(/(?:crie|criar|create)\s+(?:uma\s+)?categoria\s+["']?([^"'\n]+)["']?(?:\s+(?:no\s+|em\s+)(.+))?/i);
  if (catM) {
    const guild = resolveGuild(client, message, catM[2]);
    if (!guild) return { handled: true, text: 'Servidor não encontrado.' };
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageChannels)) return { handled: true, text: 'Sem permissão **Gerenciar Canais**.' };
    const ch = await guild.channels.create({ name: catM[1].trim().slice(0, 100), type: ChannelType.GuildCategory, reason: 'Aeternus — dono' });
    return { handled: true, text: `✅ Categoria **${ch.name}** criada em **${guild.name}**` };
  }

  const voiceM = t.match(/(?:crie|criar|create)\s+(?:um\s+)?canal\s+(?:de\s+)?voz\s+["']?([^"'\n]+)["']?(?:\s+(?:no\s+|em\s+)(.+))?/i);
  if (voiceM) {
    const guild = resolveGuild(client, message, voiceM[2]);
    if (!guild) return { handled: true, text: 'Servidor não encontrado.' };
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageChannels)) return { handled: true, text: 'Sem permissão **Gerenciar Canais**.' };
    const ch = await guild.channels.create({ name: voiceM[1].trim().slice(0, 100), type: ChannelType.GuildVoice, reason: 'Aeternus — dono' });
    return { handled: true, text: `✅ Canal de voz **${ch.name}** criado em **${guild.name}**` };
  }

  const textChM = t.match(/(?:crie|criar|create)\s+(?:um\s+)?canal(?:\s+de\s+texto)?\s+["']?([^"'\n]+)["']?(?:\s+(?:no\s+|em\s+|na\s+categoria\s+)(.+))?/i);
  if (textChM && !/canal\s+de\s+voz/i.test(t)) {
    let parentHint = textChM[2]?.trim();
    let guild = resolveGuild(client, message, null);
    if (parentHint) {
      const maybeGuild = resolveGuild(client, message, parentHint);
      if (maybeGuild && maybeGuild.id !== message.guild?.id) { guild = maybeGuild; parentHint = null; }
    }
    if (!guild) return { handled: true, text: 'Servidor não encontrado.' };
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageChannels)) return { handled: true, text: 'Sem permissão **Gerenciar Canais**.' };
    let parent = null;
    if (parentHint) parent = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && (c.name.toLowerCase() === parentHint.toLowerCase() || c.name.toLowerCase().includes(parentHint.toLowerCase())));
    const ch = await guild.channels.create({ name: textChM[1].trim().replace(/\s+/g, '-').toLowerCase().slice(0, 100), type: ChannelType.GuildText, parent: parent?.id, reason: 'Aeternus — dono' });
    return { handled: true, text: `✅ Canal ${ch} criado em **${guild.name}**` + (parent ? ` (categoria **${parent.name}**)` : '') };
  }

  const delChM = t.match(/(?:apague|apagar|delete|deletar|remova|remover)\s+(?:o\s+)?canal\s+["']?([^"'\n]+)["']?/i);
  if (delChM) {
    const guild = resolveGuild(client, message, null);
    if (!guild) return { handled: true, text: 'Use dentro de um servidor.' };
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageChannels)) return { handled: true, text: 'Sem permissão **Gerenciar Canais**.' };
    const hint = delChM[1].trim();
    const ch = guild.channels.cache.get(hint) || guild.channels.cache.find((c) => c.name.toLowerCase() === hint.toLowerCase().replace(/^#/, ''));
    if (!ch) return { handled: true, text: `Canal \`${hint}\` não encontrado.` };
    const n = ch.name; await ch.delete('Aeternus — dono');
    return { handled: true, text: `🗑️ Canal **${n}** apagado.` };
  }

  const roleM = t.match(/(?:crie|criar|create)\s+(?:um\s+)?cargo\s+["']?([^"'\n]+?)["']?(?:\s+cor\s+(\S+))?(?:\s+(?:no\s+|em\s+)(.+))?$/i);
  if (roleM) {
    let namePart = roleM[1].trim(); let colorRaw = roleM[2];
    if (!colorRaw) { const parts = namePart.split(/\s+/); if (parts.length >= 2 && parseColor(parts[parts.length - 1]) != null) { colorRaw = parts.pop(); namePart = parts.join(' '); } }
    const guild = resolveGuild(client, message, roleM[3]);
    if (!guild) return { handled: true, text: 'Servidor não encontrado.' };
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageRoles)) return { handled: true, text: 'Sem permissão **Gerenciar Cargos**.' };
    const color = parseColor(colorRaw);
    const role = await guild.roles.create({ name: namePart.slice(0, 100), colors: color != null ? { primaryColor: color } : undefined, reason: 'Aeternus — dono' });
    return { handled: true, text: `✅ Cargo **${role.name}** criado em **${guild.name}**` };
  }

  const delRoleM = t.match(/(?:apague|apagar|delete|deletar|remova|remover)\s+(?:o\s+)?cargo\s+["']?([^"'\n]+)["']?/i);
  if (delRoleM) {
    const guild = resolveGuild(client, message, null);
    if (!guild) return { handled: true, text: 'Use dentro de um servidor.' };
    if (!guild.members.me?.permissions?.has(PermissionFlagsBits.ManageRoles)) return { handled: true, text: 'Sem permissão **Gerenciar Cargos**.' };
    const hint = delRoleM[1].trim();
    const role = guild.roles.cache.get(hint) || guild.roles.cache.find((r) => r.name.toLowerCase() === hint.toLowerCase());
    if (!role || role.id === guild.id) return { handled: true, text: `Cargo \`${hint}\` não encontrado.` };
    if (role.managed) return { handled: true, text: `Cargo **${role.name}** é gerenciado — não posso apagar.` };
    const n = role.name; await role.delete('Aeternus — dono');
    return { handled: true, text: `🗑️ Cargo **${n}** apagado.` };
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
    await member.roles.add(role, 'Aeternus — dono');
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
  if (!isOwner(message.author.id)) return false;
  const content = String(message.content || '');
  const isDm = !message.guild;
  let activated = false;
  let command = content;

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
        if (ref?.author?.id === client.user?.id) { activated = true; command = content.trim(); }
      } catch (_) {}
    }
  }

  if (!activated) return false;
  if (!command || !String(command).trim()) {
    await message.reply(
      'Olá. Sou a **Aeternus** (só você).\n\n' +
        '**Como me chamar:**\n' +
        '• Me **marque**: `@' + (client.user?.username || 'Aeternos') + ' sua pergunta`\n' +
        '• Ou escreva `@aeternus` / `@aeternos`\n' +
        '• Ou **responda** uma mensagem minha\n' +
        '• No PV, qualquer mensagem\n\n' +
        '**Exemplos:**\n' +
        '`@' + (client.user?.username || 'Aeternos') + ' criar canal avisos`\n' +
        '`@aeternus criar cargo VIP`\n' +
        '`@aeternus link do servidor Aeternus Society`\n' +
        '`@aeternus listar servidores`'
    ).catch(() => {});
    return true;
  }

  if (message.channel?.sendTyping) await message.channel.sendTyping().catch(() => {});

  try {
    const disc = await tryDiscordIntent(command, message, client);
    if (disc.handled) { await replyChunks(message, disc.text); return true; }
    const gh = await tryGithubIntent(command);
    if (gh.handled) { await replyChunks(message, gh.text); return true; }

    let ctx = '';
    try {
      const guilds = [...client.guilds.cache.values()].slice(0, 12).map((g) => `- ${g.name} (${g.id})`).join('\n');
      ctx += `Servidores:\n${guilds}\n\n`;
      ctx += 'Ações: criar canal/cargo · link do servidor · listar servidores/canais/cargos\n';
    } catch (_) {}
    if (ghHeaders()) {
      try {
        const repos = await listRepos();
        ctx += `Repos (${repos.length}):\n` + repos.slice(0, 15).map((r) => `- ${r.full || r.name}`).join('\n') + '\n';
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
  client.aeternusCore = { isOwner, detectActivation, handleOwnerMessage, activeProviders, listRepos, getFile, putFile, createRepo, allowedReposConfig };
  console.log(`[aeternusCore] menção+IA · owner=${OWNER_ID() || '?'} · groq=${env('GROQ_API_KEY') ? 'ok' : 'MISSING'}`);
}

module.exports = { setup, isOwner, detectActivation, handleOwnerMessage, activeProviders, listRepos, getFile, putFile, createRepo, chatAI, allowedReposConfig };
