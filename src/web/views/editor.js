module.exports = ({ user, userAvatarUrl, botAvatarUrl, editorMeta }) => {
  const meta = editorMeta || {};
  const secretsList =
    (meta.secrets || []).map((n) => `<span class="sec-chip">${n}</span>`).join('') ||
    '<span style="color:#666">Nenhum</span>';
  const fav = botAvatarUrl || '';
  const esc = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');

  let ghBanner = '';
  if (meta.ghStatus === 'ok') {
    ghBanner = '<div class="ok-banner">GitHub conectado com permissão de repositórios (repo).</div>';
  } else if (meta.ghStatus === 'denied') {
    ghBanner = '<div class="err-banner">Você negou a permissão no GitHub. Conecte de novo e aceite o acesso aos repos.</div>';
  } else if (meta.ghStatus === 'state') {
    ghBanner = '<div class="err-banner">Sessão OAuth inválida. Tente Conectar com GitHub outra vez.</div>';
  } else if (meta.ghStatus === 'token_error') {
    ghBanner =
      '<div class="err-banner">Erro ao trocar o código por token. Confira GITHUB_CLIENT_SECRET e se o Callback URL no GitHub é exatamente: <code>' +
      esc(meta.redirectHint) +
      '</code></div>';
  } else if (meta.ghStatus) {
    ghBanner = '<div class="err-banner">Falha no login GitHub. Tente novamente.</div>';
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Editor — Aeternus</title>
${fav ? `<link rel="icon" href="${fav}">` : ''}
<style>
:root{--bg:#0b0b12;--card:#14141f;--border:#252536;--text:#eee;--muted:#888;--primary:#7c3aed}
*{box-sizing:border-box}body{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;margin:0}
.navbar{height:64px;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:12px}
.logo{font-weight:800;color:#a78bfa;display:flex;align-items:center;gap:10px}
.logo img{width:32px;height:32px;border-radius:50%}
.nav-right{margin-left:auto;display:flex;gap:10px}
.wrap{max-width:960px;margin:0 auto;padding:24px 16px 80px}
.badge{display:inline-block;background:#7c3aed;color:#fff;font-size:.72rem;font-weight:700;padding:4px 10px;border-radius:8px;margin-bottom:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:800px){.grid{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px}
.card h2{font-size:1.05rem;margin:0 0 8px}.desc{color:var(--muted);font-size:.85rem;margin-bottom:14px}
label{display:block;font-size:.8rem;color:var(--muted);margin:10px 0 5px}
input,textarea,select{width:100%;background:#0b0b12;border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:10px;font:inherit}
.btn{background:var(--primary);color:#fff;border:none;padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;margin-top:10px;margin-right:8px}
.btn:disabled{opacity:.5;cursor:wait}
.btn2{background:transparent;border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;margin-top:10px;text-decoration:none;display:inline-block}
.btn-gh{background:#238636;color:#fff;border:none;padding:12px 18px;border-radius:10px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;margin-top:8px}
.sec-chip{display:inline-block;background:#1a1a28;border:1px solid var(--border);border-radius:8px;padding:4px 8px;margin:2px;font-size:.8rem;color:#c4b5fd}
.chat{display:flex;flex-direction:column;height:420px}
.chat-log{flex:1;overflow:auto;background:#0b0b12;border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px}
.msg{margin-bottom:12px;padding:10px 12px;border-radius:12px;font-size:.9rem;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.msg.user{background:rgba(124,58,237,.18);border:1px solid rgba(124,58,237,.35)}
.msg.bot{background:#12121c;border:1px solid var(--border)}
.msg .who{font-size:.7rem;color:var(--muted);margin-bottom:4px}
.chat-row{display:flex;gap:8px}.chat-row textarea{flex:1;min-height:64px;resize:vertical}
.toast{position:fixed;bottom:20px;right:20px;background:#22c55e;color:#fff;padding:12px 16px;border-radius:12px;opacity:0;transition:.3s;z-index:50;max-width:90vw}
.toast.show{opacity:1}.toast.err{background:#ef4444}
.status-line{font-size:.85rem;color:#a78bfa;margin:8px 0}
.ok-banner{background:rgba(34,197,94,.15);border:1px solid #22c55e;color:#86efac;padding:10px 14px;border-radius:10px;margin-bottom:14px}
.err-banner{background:rgba(239,68,68,.15);border:1px solid #ef4444;color:#fca5a5;padding:10px 14px;border-radius:10px;margin-bottom:14px;word-break:break-word}
code{background:#1a1a28;padding:2px 6px;border-radius:4px;font-size:.85em}
</style>
</head>
<body>
<nav class="navbar">
  <div class="logo">${fav ? `<img src="${fav}" alt="bot">` : ''}Aeternus Editor</div>
  <div class="nav-right">
    <a href="/dashboard" class="btn2">Servidores</a>
    <a href="/logout" class="btn2">Deslogar</a>
  </div>
</nav>

<div class="wrap">
  ${ghBanner}
  <div class="badge">EDITOR · GITHUB</div>
  <h1 style="margin:0 0 6px;font-size:1.5rem">Sistema de Editor</h1>
  <p class="desc">Login GitHub com permissão <code>repo</code> (ler e editar repositórios).</p>

  <div class="card">
    <h2>1. Conta GitHub</h2>
    ${
      meta.githubLinked
        ? `<p class="status-line">Conectado: <b>@${esc(meta.githubLogin)}</b>${meta.githubScope ? ' · scopes: ' + esc(meta.githubScope) : ''}</p>
           <button type="button" class="btn2" id="btnDisconnect">Desconectar</button>
           <button type="button" class="btn" id="btnLoadRepos">Carregar repositórios</button>`
        : meta.ghClientConfigured
          ? `<p class="desc">Ao conectar, o GitHub pede acesso aos seus repositórios.</p>
             <a class="btn-gh" id="btnConnect" href="/auth/github">Conectar com GitHub</a>`
          : `<p class="desc">Falta configurar no Render: <code>GITHUB_CLIENT_ID</code> e <code>GITHUB_CLIENT_SECRET</code>.</p>
             <p class="desc">Callback URL no GitHub App deve ser:<br><code>${esc(meta.redirectHint)}</code></p>`
    }
  </div>

  <div class="grid">
    <div class="card">
      <h2>2. Repositório</h2>
      <label>Lista da conta</label>
      <select id="repoSelect"><option value="">— carregue a lista —</option></select>
      <label>Owner</label>
      <input id="gh-owner" value="${esc(meta.owner)}" placeholder="usuario">
      <label>Repo</label>
      <input id="gh-repo" value="${esc(meta.repo)}" placeholder="Aeternus-">
      <label>Branch</label>
      <input id="gh-branch" value="${esc(meta.branch || 'main')}" placeholder="main">
      <button type="button" class="btn" id="btnSaveRepo">Salvar repositório</button>
      <button type="button" class="btn2" id="btnTestRepo">Testar acesso</button>
      <div class="status-line" id="repoStatus">GitHub: ${meta.hasToken ? 'token OK' : 'não conectado'}</div>
    </div>

    <div class="card">
      <h2>3. Cofre (API keys)</h2>
      <p class="desc">Ex.: AI_API_KEY. GitHub agora é pelo OAuth.</p>
      <label>Nome</label>
      <input id="sec-name" placeholder="AI_API_KEY" autocomplete="off">
      <label>Valor</label>
      <input id="sec-value" type="password" placeholder="••••••••" autocomplete="new-password">
      <button type="button" class="btn" id="btnSaveSecret">Salvar segredo</button>
      <div style="margin-top:12px"><span class="desc">Salvos:</span><div id="sec-list">${secretsList}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>4. Chat do Editor</h2>
    <div class="chat">
      <div class="chat-log" id="chatLog">
        <div class="msg bot"><div class="who">Editor</div>Conecte o GitHub, escolha o repo e descreva a alteração.</div>
      </div>
      <div class="chat-row">
        <textarea id="chatInput" placeholder="Ex: liste src/bot"></textarea>
        <button type="button" class="btn" id="btnSend">Enviar</button>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>
<script>
(function () {
  var AUTO_LOAD = ${meta.githubLinked ? 'true' : 'false'};

  function toast(m, err) {
    var t = document.getElementById('toast');
    t.textContent = m;
    t.className = 'toast show' + (err ? ' err' : '');
    setTimeout(function () { t.classList.remove('show'); }, 3500);
  }

  async function post(url, body) {
    try {
      var r = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body || {})
      });
      var j = {};
      try { j = await r.json(); } catch (e) {}
      return { ok: r.ok, status: r.status, json: j };
    } catch (e) {
      return { ok: false, status: 0, json: { error: e.message || 'Rede' } };
    }
  }

  async function get(url) {
    try {
      var r = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      var j = {};
      try { j = await r.json(); } catch (e) {}
      return { ok: r.ok, status: r.status, json: j };
    } catch (e) {
      return { ok: false, status: 0, json: { error: e.message || 'Rede' } };
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function errMsg(r) {
    if (r.status === 401) return 'Sessão expirada — faça login no Discord de novo.';
    if (r.status === 403) return 'Sem permissão no Editor.';
    return (r.json && (r.json.error || r.json.reply)) || ('Erro HTTP ' + r.status);
  }

  function addMsg(role, text) {
    var log = document.getElementById('chatLog');
    var d = document.createElement('div');
    d.className = 'msg ' + role;
    d.innerHTML =
      '<div class="who">' +
      (role === 'user' ? 'Você' : 'Editor') +
      '</div>' +
      escapeHtml(text).replace(/\n/g, '<br>');
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  function fillRepos(repos) {
    var sel = document.getElementById('repoSelect');
    sel.innerHTML = '<option value="">— escolha —</option>';
    (repos || []).forEach(function (repo) {
      var o = document.createElement('option');
      o.value = repo.full_name;
      o.textContent = (repo.private ? '🔒 ' : '') + repo.full_name;
      o.setAttribute('data-owner', repo.owner);
      o.setAttribute('data-name', repo.name);
      o.setAttribute('data-branch', repo.default_branch || 'main');
      sel.appendChild(o);
    });
  }

  async function loadRepos() {
    var btn = document.getElementById('btnLoadRepos');
    if (btn) btn.disabled = true;
    var r = await get('/api/editor/repos');
    if (btn) btn.disabled = false;
    if (!r.ok) {
      toast(errMsg(r), true);
      return;
    }
    fillRepos(r.json.repos);
    toast((r.json.repos || []).length + ' repositórios');
  }

  var btnLoad = document.getElementById('btnLoadRepos');
  if (btnLoad) btnLoad.addEventListener('click', function (e) {
    e.preventDefault();
    loadRepos();
  });

  var btnDisc = document.getElementById('btnDisconnect');
  if (btnDisc) btnDisc.addEventListener('click', async function (e) {
    e.preventDefault();
    btnDisc.disabled = true;
    var r = await post('/api/editor/github/disconnect', {});
    btnDisc.disabled = false;
    if (r.ok) location.href = '/editor';
    else toast(errMsg(r), true);
  });

  var sel = document.getElementById('repoSelect');
  if (sel) sel.addEventListener('change', function () {
    var o = sel.selectedOptions[0];
    if (!o || !o.getAttribute('data-owner')) return;
    document.getElementById('gh-owner').value = o.getAttribute('data-owner');
    document.getElementById('gh-repo').value = o.getAttribute('data-name');
    document.getElementById('gh-branch').value = o.getAttribute('data-branch') || 'main';
  });

  document.getElementById('btnSaveRepo').addEventListener('click', async function (e) {
    e.preventDefault();
    var btn = e.currentTarget;
    btn.disabled = true;
    var r = await post('/api/editor/repo', {
      owner: document.getElementById('gh-owner').value.trim(),
      repo: document.getElementById('gh-repo').value.trim(),
      branch: document.getElementById('gh-branch').value.trim() || 'main'
    });
    btn.disabled = false;
    toast(r.ok ? 'Repositório salvo' : errMsg(r), !r.ok);
  });

  document.getElementById('btnTestRepo').addEventListener('click', async function (e) {
    e.preventDefault();
    var btn = e.currentTarget;
    btn.disabled = true;
    var r = await post('/api/editor/test', {});
    btn.disabled = false;
    if (r.ok) toast('OK: ' + (r.json.full_name || r.json.login || 'conectado'));
    else toast(errMsg(r), true);
  });

  document.getElementById('btnSaveSecret').addEventListener('click', async function (e) {
    e.preventDefault();
    var name = document.getElementById('sec-name').value.trim();
    var value = document.getElementById('sec-value').value;
    if (!name || !value) return toast('Preencha nome e valor', true);
    var btn = e.currentTarget;
    btn.disabled = true;
    var r = await post('/api/editor/secret', { name: name, value: value });
    btn.disabled = false;
    if (r.ok) {
      toast('Segredo salvo');
      document.getElementById('sec-value').value = '';
      if (r.json.secrets) {
        document.getElementById('sec-list').innerHTML =
          r.json.secrets
            .map(function (n) {
              return '<span class="sec-chip">' + escapeHtml(n) + '</span>';
            })
            .join('') || '<span style="color:#666">Nenhum</span>';
      }
    } else toast(errMsg(r), true);
  });

  async function doSend() {
    var input = document.getElementById('chatInput');
    var text = input.value.trim();
    if (!text) return;
    addMsg('user', text);
    input.value = '';
    var btn = document.getElementById('btnSend');
    btn.disabled = true;
    addMsg('bot', 'Processando...');
    var r = await post('/api/editor/chat', { message: text });
    btn.disabled = false;
    var log = document.getElementById('chatLog');
    if (log.lastChild) log.removeChild(log.lastChild);
    if (r.ok) addMsg('bot', r.json.reply || 'Sem resposta');
    else addMsg('bot', 'Erro: ' + errMsg(r));
  }

  document.getElementById('btnSend').addEventListener('click', function (e) {
    e.preventDefault();
    doSend();
  });
  document.getElementById('chatInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });

  if (AUTO_LOAD) {
    setTimeout(function () { loadRepos(); }, 400);
  }
})();
</script>
</body>
</html>`;
};
