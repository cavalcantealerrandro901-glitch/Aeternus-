module.exports = ({ username, botAvatarUrl, meta }) => {
  const m = meta || {};
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');

  const flashMap = {
    ok: '<div class="ok">GitHub conectado com sucesso.</div>',
    denied: '<div class="err">Você negou a permissão no GitHub.</div>',
    token:
      '<div class="err">Erro no token. Confira GITHUB_CLIENT_SECRET e a Callback URL no OAuth App.</div>',
    state: '<div class="err">Estado OAuth inválido/expirado. Clique de novo em Conectar.</div>',
    code: '<div class="err">Código OAuth ausente. Tente Conectar de novo.</div>',
    fail: '<div class="err">Falha no login GitHub. Veja os logs do Render.</div>'
  };
  const flash = flashMap[m.flash] || '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Editor — Aeternus</title>
${botAvatarUrl ? `<link rel="icon" href="${botAvatarUrl}">` : ''}
<style>
*{box-sizing:border-box}
body{margin:0;background:#0b0b12;color:#eee;font-family:system-ui,sans-serif}
.nav{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #252536}
.nav a{color:#c4b5fd;text-decoration:none;margin-left:auto}
.wrap{max-width:900px;margin:0 auto;padding:20px 16px 80px}
.card{background:#14141f;border:1px solid #252536;border-radius:14px;padding:18px;margin-bottom:14px}
h1{font-size:1.3rem;margin:0 0 6px}h2{font-size:1rem;margin:0 0 10px}
.muted{color:#888;font-size:.88rem;line-height:1.4}
label{display:block;font-size:.78rem;color:#888;margin:10px 0 4px}
input,select,textarea{width:100%;background:#0b0b12;border:1px solid #252536;color:#eee;border-radius:10px;padding:10px 12px;font:inherit}
button{background:#7c3aed;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:600;cursor:pointer;margin:8px 8px 0 0}
button:disabled{opacity:.5;cursor:wait}
button.ghost{background:transparent;border:1px solid #252536;color:#eee}
a.gh{display:inline-block;background:#238636;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;margin-top:8px}
#log{min-height:1.2em;color:#fbbf24;font-size:.85rem;margin:8px 0;white-space:pre-wrap}
.ok{background:rgba(34,197,94,.15);border:1px solid #22c55e;color:#86efac;padding:10px;border-radius:10px;margin-bottom:12px}
.err{background:rgba(239,68,68,.15);border:1px solid #ef4444;color:#fca5a5;padding:10px;border-radius:10px;margin-bottom:12px}
.chat{height:380px;overflow:auto;background:#0b0b12;border:1px solid #252536;border-radius:12px;padding:10px;margin-bottom:10px}
.msg{margin:0 0 10px;padding:10px;border-radius:10px;font-size:.9rem;white-space:pre-wrap;word-break:break-word}
.msg.u{background:rgba(124,58,237,.2);border:1px solid rgba(124,58,237,.35)}
.msg.b{background:#12121c;border:1px solid #252536}
.row{display:flex;gap:8px;align-items:flex-end}
textarea{min-height:72px;flex:1;resize:vertical}
</style>
</head>
<body>
<div class="nav">
  <strong style="color:#a78bfa">Aeternus Editor</strong>
  <span class="muted">@${esc(username)}</span>
  <a href="/dashboard">Servidores</a>
</div>
<div class="wrap">
  ${flash}
  <h1>Editor de código</h1>
  <p class="muted">Conecte o GitHub, escolha o repo e use o chat para ler/escrever arquivos. O chat responde mesmo sem IA (comandos locais).</p>
  <div id="log"></div>

  <div class="card">
    <h2>1. GitHub</h2>
    ${
      m.linked
        ? `<p class="muted">Conectado: <b>@${esc(m.login)}</b></p>
           <button type="button" id="btnLoad">Carregar repositórios</button>
           <button type="button" class="ghost" id="btnDisc">Desconectar</button>`
        : m.ghReady
          ? `<a class="gh" id="btnGh" href="/auth/github">Conectar com GitHub</a>
             <p class="muted" style="margin-top:10px">Callback exigido no OAuth App:<br><code>${esc(m.callback)}</code></p>`
          : `<p class="muted">Configure no Render: GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET.<br>Callback: <code>${esc(m.callback)}</code></p>`
    }
  </div>

  <div class="card">
    <h2>2. Repositório</h2>
    <label>Lista</label>
    <select id="sel"><option value="">— carregar —</option></select>
    <label>Owner</label><input id="owner" value="${esc(m.owner)}" autocomplete="off">
    <label>Repo</label><input id="repo" value="${esc(m.repo)}" autocomplete="off">
    <label>Branch</label><input id="branch" value="${esc(m.branch || 'main')}" autocomplete="off">
    <button type="button" id="btnSave">Salvar</button>
    <button type="button" class="ghost" id="btnTest">Testar</button>
  </div>

  <div class="card">
    <h2>3. Chat</h2>
    <p class="muted">Exemplos: <code>status</code> · <code>listar</code> · <code>ler index.js</code> · <code>escrever src/x.js</code> + bloco de código</p>
    <div class="chat" id="chat"></div>
    <div class="row">
      <textarea id="inp" placeholder="Digite aqui e aperte Enviar"></textarea>
      <button type="button" id="btnSend">Enviar</button>
    </div>
  </div>
</div>
<script>
(function () {
  function $(id) { return document.getElementById(id); }
  function log(t) { var el = $('log'); if (el) el.textContent = t || ''; }
  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function addMsg(role, text) {
    var c = $('chat');
    if (!c) return;
    var d = document.createElement('div');
    d.className = 'msg ' + (role === 'u' ? 'u' : 'b');
    d.innerHTML = escHtml(text).replace(/\n/g, '<br>');
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
    return d;
  }

  function api(method, url, body) {
    var opts = {
      method: method,
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    };
    if (method !== 'GET' && method !== 'HEAD') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body || {});
    }
    return fetch(url, opts)
      .then(function (r) {
        return r.text().then(function (t) {
          var j = {};
          try { j = t ? JSON.parse(t) : {}; } catch (e) { j = { error: t.slice(0, 200) }; }
          return { ok: r.ok, status: r.status, j: j, raw: t };
        });
      })
      .catch(function (e) {
        return { ok: false, status: 0, j: { error: e.message || 'rede' }, raw: '' };
      });
  }

  function errText(r) {
    if (r.status === 401) return 'Sessão Discord expirada — faça login de novo no painel.';
    if (r.status === 403) return 'Sem permissão. No Discord: !daracesso @você';
    if (r.j && (r.j.error || r.j.reply)) return r.j.error || r.j.reply;
    if (r.status === 0) return 'Falha de rede / CORS.';
    return 'HTTP ' + r.status;
  }

  if ($('btnLoad')) {
    $('btnLoad').onclick = function () {
      var btn = $('btnLoad');
      btn.disabled = true;
      log('Carregando repositórios...');
      api('GET', '/api/editor/repos').then(function (r) {
        btn.disabled = false;
        if (!r.ok) { log(errText(r)); return; }
        var sel = $('sel');
        sel.innerHTML = '<option value="">— escolha —</option>';
        (r.j.repos || []).forEach(function (x) {
          var o = document.createElement('option');
          o.value = x.full_name;
          o.textContent = (x.private ? '[privado] ' : '') + x.full_name;
          o.setAttribute('data-owner', x.owner || '');
          o.setAttribute('data-name', x.name || '');
          o.setAttribute('data-branch', x.default_branch || 'main');
          sel.appendChild(o);
        });
        log((r.j.count || 0) + ' repositórios');
      });
    };
  }

  if ($('sel')) {
    $('sel').onchange = function () {
      var o = $('sel').selectedOptions[0];
      if (!o) return;
      var owner = o.getAttribute('data-owner');
      var name = o.getAttribute('data-name');
      if (!owner) return;
      $('owner').value = owner;
      $('repo').value = name;
      $('branch').value = o.getAttribute('data-branch') || 'main';
    };
  }

  if ($('btnSave')) {
    $('btnSave').onclick = function () {
      api('POST', '/api/editor/repo', {
        owner: ($('owner').value || '').trim(),
        repo: ($('repo').value || '').trim(),
        branch: ($('branch').value || 'main').trim() || 'main'
      }).then(function (r) {
        log(r.ok ? 'Repositório salvo.' : 'Erro: ' + errText(r));
      });
    };
  }

  if ($('btnTest')) {
    $('btnTest').onclick = function () {
      api('POST', '/api/editor/test', {}).then(function (r) {
        log(r.ok ? ('OK ' + (r.j.full_name || r.j.login || '')) : ('Erro: ' + errText(r)));
      });
    };
  }

  if ($('btnDisc')) {
    $('btnDisc').onclick = function () {
      api('POST', '/api/editor/disconnect', {}).then(function (r) {
        if (r.ok) location.href = '/editor';
        else log(errText(r));
      });
    };
  }

  var sending = false;
  function sendChat() {
    if (sending) return;
    var inp = $('inp');
    if (!inp) return;
    var text = (inp.value || '').trim();
    if (!text) return;

    sending = true;
    var btn = $('btnSend');
    if (btn) btn.disabled = true;

    addMsg('u', text);
    inp.value = '';
    var pending = addMsg('b', '…');

    api('POST', '/api/editor/chat', { message: text }).then(function (r) {
      sending = false;
      if (btn) btn.disabled = false;
      if (pending && pending.parentNode) pending.parentNode.removeChild(pending);
      var reply = (r.j && r.j.reply) ? r.j.reply : errText(r);
      addMsg('b', reply);
    });
  }

  if ($('btnSend')) $('btnSend').onclick = sendChat;
  if ($('inp')) {
    $('inp').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }

  api('GET', '/api/editor/me').then(function (r) {
    if (!r.ok) { log(errText(r)); return; }
    var parts = ['Sessão OK'];
    if (r.j.github) parts.push('GH @' + r.j.github);
    else parts.push('GitHub off');
    if (r.j.repo) parts.push(r.j.owner + '/' + r.j.repo);
    log(parts.join(' · '));
  });

  ${m.linked ? "setTimeout(function(){ var b=$('btnLoad'); if(b) b.click(); }, 300);" : ''}
})();
</script>
</body>
</html>`;
};
