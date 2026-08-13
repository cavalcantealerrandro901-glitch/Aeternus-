module.exports = ({ user, userAvatarUrl, botAvatarUrl, editorMeta }) => {
  const meta = editorMeta || {};
  const fav = botAvatarUrl || '';
  const esc = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');

  let ghBanner = '';
  if (meta.ghStatus === 'ok') {
    ghBanner =
      '<div class="ok-banner">GitHub conectado. Clique em <b>Carregar repositórios</b>.</div>';
  } else if (meta.ghStatus === 'denied') {
    ghBanner =
      '<div class="err-banner">Permissão negada no GitHub. Conecte de novo e aceite.</div>';
  } else if (meta.ghStatus === 'state') {
    ghBanner =
      '<div class="err-banner">Sessão OAuth inválida. Conecte o GitHub outra vez.</div>';
  } else if (meta.ghStatus === 'token_error') {
    ghBanner =
      '<div class="err-banner">Erro no token. Callback URL deve ser: <code>' +
      esc(meta.redirectHint) +
      '</code></div>';
  } else if (meta.ghStatus) {
    ghBanner = '<div class="err-banner">Falha no login GitHub.</div>';
  }

  const linkedBlock = meta.githubLinked
    ? `<p class="status-line">Conectado: <b>@${esc(meta.githubLogin)}</b></p>
       <button type="button" class="btn2" data-action="disconnect">Desconectar</button>
       <button type="button" class="btn" data-action="load-repos">Carregar repositórios</button>`
    : meta.ghClientConfigured
      ? `<p class="desc">Autorize o acesso aos repositórios (scope repo).</p>
         <a class="btn-gh" href="/auth/github">Conectar com GitHub</a>`
      : `<p class="desc">Configure GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET no Render.</p>
         <p class="desc">Callback: <code>${esc(meta.redirectHint)}</code></p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Editor — Aeternus</title>
${fav ? '<link rel="icon" href="' + fav + '">' : ''}
<style>
:root{--bg:#0b0b12;--card:#14141f;--border:#252536;--text:#eee;--muted:#888;--primary:#7c3aed}
*{box-sizing:border-box}body{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;margin:0}
.navbar{height:64px;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:12px}
.logo{font-weight:800;color:#a78bfa;display:flex;align-items:center;gap:10px}
.logo img{width:32px;height:32px;border-radius:50%}
.nav-right{margin-left:auto;display:flex;gap:10px}
.wrap{max-width:900px;margin:0 auto;padding:24px 16px 80px}
.badge{display:inline-block;background:#7c3aed;color:#fff;font-size:.72rem;font-weight:700;padding:4px 10px;border-radius:8px;margin-bottom:12px}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px}
.card h2{font-size:1.05rem;margin:0 0 8px}.desc{color:var(--muted);font-size:.85rem;margin-bottom:14px}
label{display:block;font-size:.8rem;color:var(--muted);margin:10px 0 5px}
input,textarea,select{width:100%;background:#0b0b12;border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:10px;font:inherit}
.btn{background:var(--primary);color:#fff;border:none;padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;margin-top:10px;margin-right:8px}
.btn:disabled{opacity:.5}
.btn2{background:transparent;border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;margin-top:10px;text-decoration:none;display:inline-block}
.btn-gh{background:#238636;color:#fff;border:none;padding:12px 18px;border-radius:10px;font-weight:700;text-decoration:none;display:inline-block;margin-top:8px}
.chat{display:flex;flex-direction:column;height:420px}
.chat-log{flex:1;overflow:auto;background:#0b0b12;border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px}
.msg{margin-bottom:12px;padding:10px 12px;border-radius:12px;font-size:.9rem;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.msg.user{background:rgba(124,58,237,.18);border:1px solid rgba(124,58,237,.35)}
.msg.bot{background:#12121c;border:1px solid var(--border)}
.msg .who{font-size:.7rem;color:var(--muted);margin-bottom:4px}
.chat-row{display:flex;gap:8px}.chat-row textarea{flex:1;min-height:64px;resize:vertical}
#debug{font-size:.8rem;color:#fbbf24;min-height:1.2em;margin:8px 0;white-space:pre-wrap}
.toast{position:fixed;bottom:20px;right:20px;background:#22c55e;color:#fff;padding:12px 16px;border-radius:12px;opacity:0;transition:.3s;z-index:50;max-width:90vw;pointer-events:none}
.toast.show{opacity:1}.toast.err{background:#ef4444}
.status-line{font-size:.85rem;color:#a78bfa;margin:8px 0}
.ok-banner{background:rgba(34,197,94,.15);border:1px solid #22c55e;color:#86efac;padding:10px 14px;border-radius:10px;margin-bottom:14px}
.err-banner{background:rgba(239,68,68,.15);border:1px solid #ef4444;color:#fca5a5;padding:10px 14px;border-radius:10px;margin-bottom:14px;word-break:break-word}
code{background:#1a1a28;padding:2px 6px;border-radius:4px;font-size:.85em}
</style>
</head>
<body>
<nav class="navbar">
  <div class="logo">${fav ? '<img src="' + fav + '" alt="bot">' : ''}Aeternus Editor</div>
  <div class="nav-right">
    <a href="/dashboard" class="btn2">Servidores</a>
    <a href="/logout" class="btn2">Deslogar</a>
  </div>
</nav>

<div class="wrap">
  ${ghBanner}
  <div class="badge">EDITOR</div>
  <h1 style="margin:0 0 6px;font-size:1.5rem">Sistema de Editor</h1>
  <p class="desc">GitHub OAuth · repo. Teste: status no chat.</p>
  <div id="debug"></div>

  <div class="card">
    <h2>1. Conta GitHub</h2>
    ${linkedBlock}
  </div>

  <div class="card">
    <h2>2. Repositório</h2>
    <label>Lista</label>
    <select id="repoSelect"><option value="">— carregue a lista —</option></select>
    <label>Owner</label>
    <input id="gh-owner" value="${esc(meta.owner)}" placeholder="usuario">
    <label>Repo</label>
    <input id="gh-repo" value="${esc(meta.repo)}" placeholder="Aeternus-">
    <label>Branch</label>
    <input id="gh-branch" value="${esc(meta.branch || 'main')}" placeholder="main">
    <button type="button" class="btn" data-action="save-repo">Salvar repositório</button>
    <button type="button" class="btn2" data-action="test-repo">Testar acesso</button>
    <div class="status-line" id="repoStatus">GitHub: ${meta.hasToken ? 'conectado' : 'não conectado'}</div>
  </div>

  <div class="card">
    <h2>3. Chat</h2>
    <div class="chat">
      <div class="chat-log" id="chatLog">
        <div class="msg bot"><div class="who">Editor</div>Digite: status · listar · ler index.js · ajuda</div>
      </div>
      <div class="chat-row">
        <textarea id="chatInput" placeholder="status"></textarea>
        <button type="button" class="btn" data-action="send">Enviar</button>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
window.addEventListener('DOMContentLoaded', function () {
  var AUTO = ${meta.githubLinked ? 'true' : 'false'};

  function dbg(m) {
    var el = document.getElementById('debug');
    if (el) el.textContent = m || '';
  }

  function toast(m, err) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = m;
    t.className = 'toast show' + (err ? ' err' : '');
    setTimeout(function () { t.classList.remove('show'); }, 4000);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function addMsg(role, text) {
    var log = document.getElementById('chatLog');
    if (!log) return;
    var d = document.createElement('div');
    d.className = 'msg ' + role;
    d.innerHTML = '<div class="who">' + (role === 'user' ? 'Você' : 'Editor') + '</div>' +
      esc(text).replace(/\n/g, '<br>');
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  function api(method, url, body) {
    var opts = {
      method: method,
      credentials: 'include',
      headers: { Accept: 'application/json' }
    };
    if (method !== 'GET') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body || {});
    }
    return fetch(url, opts).then(function (r) {
      return r.text().then(function (txt) {
        var j = {};
        try { j = txt ? JSON.parse(txt) : {}; } catch (e) {
          j = { error: 'Resposta não-JSON (' + r.status + '): ' + txt.slice(0, 120) };
        }
        return { ok: r.ok, status: r.status, json: j };
      });
    }).catch(function (e) {
      return { ok: false, status: 0, json: { error: e.message || 'Falha de rede' } };
    });
  }

  function errOf(r) {
    if (r.status === 401) return 'Sessão expirada — faça login Discord de novo.';
    if (r.status === 403) return 'Sem permissão no Editor (!daracesso).';
    return (r.json && (r.json.error || r.json.reply)) || ('HTTP ' + r.status);
  }

  function fillRepos(repos) {
    var sel = document.getElementById('repoSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— escolha —</option>';
    (repos || []).forEach(function (repo) {
      var o = document.createElement('option');
      o.value = repo.full_name || (repo.owner + '/' + repo.name);
      o.textContent = (repo.private ? '[p] ' : '') + (repo.full_name || o.value);
      o.setAttribute('data-owner', repo.owner || '');
      o.setAttribute('data-name', repo.name || '');
      o.setAttribute('data-branch', repo.default_branch || 'main');
      sel.appendChild(o);
    });
  }

  function loadRepos() {
    dbg('Carregando repositórios...');
    return api('GET', '/api/editor/repos').then(function (r) {
      if (!r.ok) {
        dbg('Erro repos: ' + errOf(r));
        toast(errOf(r), true);
        return;
      }
      var list = r.json.repos || [];
      fillRepos(list);
      dbg(list.length + ' repositório(s)');
      toast(list.length + ' repositórios');
      var st = document.getElementById('repoStatus');
      if (st) st.textContent = 'GitHub: ' + (r.json.login || 'ok') + ' · ' + list.length + ' repos';
    });
  }

  function saveRepo() {
    var owner = (document.getElementById('gh-owner') || {}).value || '';
    var repo = (document.getElementById('gh-repo') || {}).value || '';
    var branch = (document.getElementById('gh-branch') || {}).value || 'main';
    dbg('Salvando ' + owner + '/' + repo + '...');
    return api('POST', '/api/editor/repo', {
      owner: owner.trim(),
      repo: repo.trim(),
      branch: branch.trim() || 'main'
    }).then(function (r) {
      if (!r.ok) { toast(errOf(r), true); dbg(errOf(r)); return; }
      toast('Repositório salvo');
      dbg('Repo salvo: ' + r.json.owner + '/' + r.json.repo);
    });
  }

  function testRepo() {
    dbg('Testando...');
    return api('POST', '/api/editor/test', {}).then(function (r) {
      if (!r.ok) { toast(errOf(r), true); dbg(errOf(r)); return; }
      var msg = r.json.full_name || r.json.login || 'OK';
      toast('OK: ' + msg);
      dbg('Teste OK: ' + msg);
    });
  }

  function disconnect() {
    dbg('Desconectando...');
    return api('POST', '/api/editor/github/disconnect', {}).then(function (r) {
      if (!r.ok) { toast(errOf(r), true); dbg(errOf(r)); return; }
      toast('Desconectado');
      window.location.href = '/editor';
    });
  }

  function sendChat() {
    var input = document.getElementById('chatInput');
    if (!input) return;
    var text = (input.value || '').trim();
    if (!text) {
      toast('Digite uma mensagem', true);
      return;
    }
    addMsg('user', text);
    input.value = '';
    addMsg('bot', '...');
    dbg('Enviando chat...');
    return api('POST', '/api/editor/chat', { message: text }).then(function (r) {
      var log = document.getElementById('chatLog');
      if (log && log.lastChild) log.removeChild(log.lastChild);
      if (r.ok) {
        addMsg('bot', r.json.reply || 'Sem resposta');
        dbg('Chat OK');
      } else {
        addMsg('bot', 'Erro: ' + errOf(r));
        dbg('Chat erro: ' + errOf(r));
      }
    });
  }

  // Delegação de cliques — funciona mesmo se botões forem recriados
  document.body.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.preventDefault();
    var a = btn.getAttribute('data-action');
    btn.disabled = true;
    var p = Promise.resolve();
    if (a === 'load-repos') p = loadRepos();
    else if (a === 'disconnect') p = disconnect();
    else if (a === 'save-repo') p = saveRepo();
    else if (a === 'test-repo') p = testRepo();
    else if (a === 'send') p = sendChat();
    Promise.resolve(p).finally(function () {
      try { btn.disabled = false; } catch (x) {}
    });
  });

  var sel = document.getElementById('repoSelect');
  if (sel) {
    sel.addEventListener('change', function () {
      var o = sel.selectedOptions[0];
      if (!o) return;
      var owner = o.getAttribute('data-owner');
      var name = o.getAttribute('data-name');
      var branch = o.getAttribute('data-branch') || 'main';
      if (owner) document.getElementById('gh-owner').value = owner;
      if (name) document.getElementById('gh-repo').value = name;
      document.getElementById('gh-branch').value = branch;
    });
  }

  var chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }

  // status inicial
  api('GET', '/api/editor/status').then(function (r) {
    if (r.ok) {
      dbg('Sessão OK · GH: ' + (r.json.githubLinked ? ('@' + (r.json.githubLogin || 'sim')) : 'não') +
        (r.json.hasSessionToken ? ' · token sessão' : ''));
    } else {
      dbg('Sessão: ' + errOf(r));
    }
  });

  if (AUTO) {
    setTimeout(function () { loadRepos(); }, 500);
  }
});
</script>
</body>
</html>`;
};
