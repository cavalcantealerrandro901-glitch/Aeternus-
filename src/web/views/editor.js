module.exports = ({ username, botAvatarUrl, meta }) => {
  const m = meta || {};
  const esc = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');

  const flash =
    m.flash === 'ok'
      ? '<div class="ok">GitHub conectado.</div>'
      : m.flash === 'denied'
        ? '<div class="err">Permissão negada no GitHub.</div>'
        : m.flash === 'token'
          ? '<div class="err">Erro no token. Confira Client Secret e Callback URL.</div>'
          : m.flash
            ? '<div class="err">Falha no OAuth GitHub.</div>'
            : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Editor — Aeternus</title>
${botAvatarUrl ? `<link rel="icon" href="${botAvatarUrl}">` : ''}
<style>
body{margin:0;background:#0b0b12;color:#eee;font-family:system-ui,sans-serif}
.nav{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #252536}
.nav a{color:#c4b5fd;text-decoration:none;margin-left:auto}
.wrap{max-width:880px;margin:0 auto;padding:20px 16px 60px}
.card{background:#14141f;border:1px solid #252536;border-radius:14px;padding:18px;margin-bottom:14px}
h1{font-size:1.35rem;margin:0 0 6px}h2{font-size:1rem;margin:0 0 10px}
.muted{color:#888;font-size:.88rem}
label{display:block;font-size:.78rem;color:#888;margin:10px 0 4px}
input,select,textarea{width:100%;box-sizing:border-box;background:#0b0b12;border:1px solid #252536;color:#eee;border-radius:10px;padding:10px 12px;font:inherit}
button,.btn{background:#7c3aed;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:600;cursor:pointer;margin:8px 8px 0 0}
button.ghost{background:transparent;border:1px solid #252536;color:#eee}
a.gh{display:inline-block;background:#238636;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;margin-top:8px}
#log{min-height:1.2em;color:#fbbf24;font-size:.85rem;margin:8px 0;white-space:pre-wrap}
.ok{background:rgba(34,197,94,.15);border:1px solid #22c55e;color:#86efac;padding:10px;border-radius:10px;margin-bottom:12px}
.err{background:rgba(239,68,68,.15);border:1px solid #ef4444;color:#fca5a5;padding:10px;border-radius:10px;margin-bottom:12px}
.chat{height:360px;overflow:auto;background:#0b0b12;border:1px solid #252536;border-radius:12px;padding:10px;margin-bottom:10px}
.msg{margin:0 0 10px;padding:10px;border-radius:10px;font-size:.9rem;white-space:pre-wrap;word-break:break-word}
.msg.u{background:rgba(124,58,237,.2);border:1px solid rgba(124,58,237,.35)}
.msg.b{background:#12121c;border:1px solid #252536}
.row{display:flex;gap:8px}textarea{min-height:56px;flex:1}
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
  <p class="muted">Conecte o GitHub (permissão repo), escolha o repositório e use o chat.</p>
  <div id="log"></div>

  <div class="card">
    <h2>1. GitHub</h2>
    ${
      m.linked
        ? `<p class="muted">Conectado como <b>@${esc(m.login)}</b></p>
           <button type="button" id="btnLoad">Carregar repositórios</button>
           <button type="button" class="ghost" id="btnDisc">Desconectar</button>`
        : m.ghReady
          ? `<a class="gh" href="/auth/github">Conectar com GitHub</a>`
          : `<p class="muted">Configure GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET.<br>Callback: <code>${esc(m.callback)}</code></p>`
    }
  </div>

  <div class="card">
    <h2>2. Repositório</h2>
    <label>Lista</label>
    <select id="sel"><option value="">— carregar —</option></select>
    <label>Owner</label><input id="owner" value="${esc(m.owner)}">
    <label>Repo</label><input id="repo" value="${esc(m.repo)}">
    <label>Branch</label><input id="branch" value="${esc(m.branch || 'main')}">
    <button type="button" id="btnSave">Salvar</button>
    <button type="button" class="ghost" id="btnTest">Testar</button>
  </div>

  <div class="card">
    <h2>3. Chat</h2>
    <div class="chat" id="chat"></div>
    <div class="row">
      <textarea id="inp" placeholder="status · listar · ler index.js"></textarea>
      <button type="button" id="btnSend">Enviar</button>
    </div>
  </div>
</div>
<script>
(function(){
  function log(t){ var el=document.getElementById('log'); if(el) el.textContent=t||''; }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function add(role, text){
    var c=document.getElementById('chat');
    var d=document.createElement('div');
    d.className='msg '+(role==='u'?'u':'b');
    d.innerHTML=esc(text).replace(/\n/g,'<br>');
    c.appendChild(d); c.scrollTop=c.scrollHeight;
  }
  function api(method,url,body){
    var o={method:method,credentials:'include',headers:{Accept:'application/json'}};
    if(method!=='GET'){ o.headers['Content-Type']='application/json'; o.body=JSON.stringify(body||{}); }
    return fetch(url,o).then(function(r){
      return r.text().then(function(t){
        var j={}; try{j=t?JSON.parse(t):{};}catch(e){j={error:t.slice(0,150)};}
        return {ok:r.ok,status:r.status,j:j};
      });
    }).catch(function(e){ return {ok:false,status:0,j:{error:e.message}}; });
  }
  function err(r){
    if(r.status===401) return 'Sessão expirada — login Discord de novo.';
    if(r.status===403) return 'Sem permissão (!daracesso).';
    return (r.j&&(r.j.error||r.j.reply))||('HTTP '+r.status);
  }

  var btnLoad=document.getElementById('btnLoad');
  if(btnLoad) btnLoad.onclick=function(){
    log('Carregando...');
    api('GET','/api/editor/repos').then(function(r){
      if(!r.ok){ log(err(r)); return; }
      var sel=document.getElementById('sel');
      sel.innerHTML='<option value="">— escolha —</option>';
      (r.j.repos||[]).forEach(function(x){
        var o=document.createElement('option');
        o.value=x.full_name;
        o.textContent=(x.private?'[p] ':'')+x.full_name;
        o.dataset.owner=x.owner; o.dataset.name=x.name; o.dataset.branch=x.default_branch||'main';
        sel.appendChild(o);
      });
      log((r.j.count||0)+' repositórios');
    });
  };

  var sel=document.getElementById('sel');
  if(sel) sel.onchange=function(){
    var o=sel.selectedOptions[0]; if(!o||!o.dataset.owner) return;
    document.getElementById('owner').value=o.dataset.owner;
    document.getElementById('repo').value=o.dataset.name;
    document.getElementById('branch').value=o.dataset.branch||'main';
  };

  document.getElementById('btnSave').onclick=function(){
    api('POST','/api/editor/repo',{
      owner:document.getElementById('owner').value.trim(),
      repo:document.getElementById('repo').value.trim(),
      branch:document.getElementById('branch').value.trim()||'main'
    }).then(function(r){ log(r.ok?'Salvo':'Erro: '+err(r)); });
  };

  document.getElementById('btnTest').onclick=function(){
    api('POST','/api/editor/test',{}).then(function(r){
      log(r.ok?('OK '+(r.j.full_name||r.j.login||'')):'Erro: '+err(r));
    });
  };

  var btnDisc=document.getElementById('btnDisc');
  if(btnDisc) btnDisc.onclick=function(){
    api('POST','/api/editor/disconnect',{}).then(function(r){
      if(r.ok) location.href='/editor'; else log(err(r));
    });
  };

  function send(){
    var inp=document.getElementById('inp');
    var t=(inp.value||'').trim(); if(!t) return;
    add('u',t); inp.value='';
    add('b','...');
    api('POST','/api/editor/chat',{message:t}).then(function(r){
      var chat=document.getElementById('chat');
      if(chat.lastChild) chat.removeChild(chat.lastChild);
      add('b', r.ok ? (r.j.reply||'OK') : ('Erro: '+err(r)));
    });
  }
  document.getElementById('btnSend').onclick=send;
  document.getElementById('inp').addEventListener('keydown',function(e){
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); }
  });

  api('GET','/api/editor/me').then(function(r){
    if(r.ok) log('Sessão OK'+(r.j.github?' · @'+r.j.github:' · GitHub off')+(r.j.repo?' · '+r.j.owner+'/'+r.j.repo:''));
    else log(err(r));
  });

  ${m.linked ? 'setTimeout(function(){ if(btnLoad) btnLoad.click(); }, 400);' : ''}
})();
</script>
</body>
</html>`;
};
