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

  const ghBanner =
    meta.ghStatus === 'ok'
      ? '<div class="ok-banner">GitHub conectado.</div>'
      : meta.ghStatus === 'denied'
        ? '<div class="err-banner">Permissão GitHub negada.</div>'
        : meta.ghStatus
          ? '<div class="err-banner">Falha no login GitHub.</div>'
          : '';

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
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px}
.card h2{font-size:1.05rem;margin:0 0 8px}.desc{color:var(--muted);font-size:.85rem;margin-bottom:14px}
label{display:block;font-size:.8rem;color:var(--muted);margin:10px 0 5px}
input,textarea,select{width:100%;background:#0b0b12;border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:10px;font:inherit}
.btn{background:var(--primary);color:#fff;border:none;padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;margin-top:10px;margin-right:8px}
.btn:disabled{opacity:.5}.btn2{background:transparent;border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;margin-top:10px;text-decoration:none;display:inline-block}
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
.err-banner{background:rgba(239,68,68,.15);border:1px solid #ef4444;color:#fca5a5;padding:10px 14px;border-radius:10px;margin-bottom:14px}
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
  <div class="badge">EDITOR · GITHUB OAUTH</div>
  <h1 style="margin:0 0 6px;font-size:1.5rem">Sistema de Editor</h1>
  <p class="desc">Usuários autorizados conectam a <b>própria conta GitHub</b> e liberam acesso aos repositórios (scope <code>repo</code>).</p>

  <div class="card" style="margin-bottom:16px">
    <h2>1. Conta GitHub</h2>
    ${
      meta.githubLinked
        ? `<p class="status-line">Conectado como <b>@${esc(meta.githubLogin)}</b></p>
           <button type="button" class="btn2" id="disconnectGh">Desconectar GitHub</button>
           <button type="button" class="btn" id="loadRepos">Carregar meus repositórios</button>`
        : meta.ghClientConfigured
          ? `<p class="desc">Faça login no GitHub e autorize o acesso aos repositórios.</p>
             <a class="btn-gh" href="/auth/github">Conectar com GitHub</a>`
          : `<p class="desc">Configure no Render: <code>GITHUB_CLIENT_ID</code>, <code>GITHUB_CLIENT_SECRET</code> e <code>GITHUB_REDIRECT_URI</code>.</p>`
    }
  </div>

  <div class="grid" style="margin-bottom:16px">
    <div class="card">
      <h2>2. Repositório</h2>
      <p class="desc">Escolha na lista ou digite owner/repo.</p>
      <label>Repositórios da conta</label>
      <select id="repoSelect"><option value="">— carregue a lista —</option></select>
      <label>Owner</label>
      <input id="gh-owner" value="${esc(meta.owner)}" placeholder="usuario">
      <label>Repositório</label>
      <input id="gh-repo" value="${esc(meta.repo)}" placeholder="Aeternus-">
      <label>Branch</label>
      <input id="gh-branch" value="${esc(meta.branch || 'main')}" placeholder="main">
      <button type="button" class="btn" id="saveRepo">Salvar repositório</button>
      <button type="button" class="btn2" id="testRepo">Testar</button>
      <div class="status-line" id="repoStatus">Token: ${meta.hasToken ? 'OK' : 'não conectado'}</div>
    </div>

    <div class="card">
      <h2>3. Cofre (APIs)</h2>
      <p class="desc">Ex.: AI_API_KEY. O GitHub agora vem do OAuth.</p>
      <label>Nome</label>
      <input id="sec-name" placeholder="AI_API_KEY" autocomplete="off">
      <label>Valor</label>
      <input id="sec-value" type="password" placeholder="••••••••" autocomplete="new-password">
      <button type="button" class="btn" id="saveSecret">Salvar segredo</button>
      <div style="margin-top:12px"><span class="desc">Salvos:</span><div id="sec-list">${secretsList}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>4. Chat do Editor</h2>
    <p class="desc">Descreva a alteração. Ex.: "liste src/bot" · "leia index.js"</p>
    <div class="chat">
      <div class="chat-log" id="chatLog">
        <div class="msg bot"><div class="who">Editor</div>Conecte o GitHub, escolha o repo e descreva o que precisa.</div>
      </div>
      <div class="chat-row">
        <textarea id="chatInput" placeholder="Descreva a alteração..."></textarea>
        <button type="button" class="btn" id="sendChat">Enviar</button>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>
<script>
(function(){
  function toast(m,err){var t=document.getElementById('toast');t.textContent=m;t.className='toast show'+(err?' err':'');setTimeout(function(){t.classList.remove('show')},3500)}
  async function post(url,body){
    try{
      var r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body||{})});
      var j={};try{j=await r.json()}catch(e){}
      return{ok:r.ok,status:r.status,json:j};
    }catch(e){return{ok:false,status:0,json:{error:e.message}}}
  }
  async function get(url){
    try{
      var r=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json'}});
      var j={};try{j=await r.json()}catch(e){}
      return{ok:r.ok,status:r.status,json:j};
    }catch(e){return{ok:false,status:0,json:{error:e.message}}}
  }
  function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function addMsg(role,text){
    var log=document.getElementById('chatLog');
    var d=document.createElement('div');
    d.className='msg '+role;
    d.innerHTML='<div class="who">'+(role==='user'?'Você':'Editor')+'</div>'+escapeHtml(text).replace(/\n/g,'<br>');
    log.appendChild(d);log.scrollTop=log.scrollHeight;
  }
  function errMsg(r){
    if(r.status===401)return 'Sessão expirada. Login de novo.';
    if(r.status===403)return 'Sem permissão no Editor.';
    return(r.json&&(r.json.error||r.json.reply))||('HTTP '+r.status);
  }

  var loadRepos=document.getElementById('loadRepos');
  if(loadRepos) loadRepos.addEventListener('click', async function(){
    loadRepos.disabled=true;
    var r=await get('/api/editor/repos');
    loadRepos.disabled=false;
    if(!r.ok) return toast(errMsg(r),true);
    var sel=document.getElementById('repoSelect');
    sel.innerHTML='<option value="">— escolha —</option>';
    (r.json.repos||[]).forEach(function(repo){
      var o=document.createElement('option');
      o.value=repo.owner+'/'+repo.name;
      o.textContent=(repo.private?'🔒 ':'')+repo.full_name;
      o.dataset.owner=repo.owner;
      o.dataset.name=repo.name;
      o.dataset.branch=repo.default_branch||'main';
      sel.appendChild(o);
    });
    toast((r.json.repos||[]).length+' repositórios');
  });

  var repoSelect=document.getElementById('repoSelect');
  if(repoSelect) repoSelect.addEventListener('change', function(){
    var o=repoSelect.selectedOptions[0];
    if(!o||!o.dataset.owner) return;
    document.getElementById('gh-owner').value=o.dataset.owner;
    document.getElementById('gh-repo').value=o.dataset.name;
    document.getElementById('gh-branch').value=o.dataset.branch||'main';
  });

  var disconnectGh=document.getElementById('disconnectGh');
  if(disconnectGh) disconnectGh.addEventListener('click', async function(){
    var r=await post('/api/editor/github/disconnect',{});
    if(r.ok) location.href='/editor';
    else toast(errMsg(r),true);
  });

  document.getElementById('saveRepo').addEventListener('click', async function(){
    var r=await post('/api/editor/repo',{
      owner:document.getElementById('gh-owner').value.trim(),
      repo:document.getElementById('gh-repo').value.trim(),
      branch:document.getElementById('gh-branch').value.trim()||'main'
    });
    toast(r.ok?'Repositório salvo':errMsg(r),!r.ok);
  });

  document.getElementById('testRepo').addEventListener('click', async function(){
    var r=await post('/api/editor/test',{});
    if(r.ok) toast('OK: '+(r.json.full_name||r.json.login||'conectado'));
    else toast(errMsg(r),true);
  });

  document.getElementById('saveSecret').addEventListener('click', async function(){
    var name=document.getElementById('sec-name').value.trim();
    var value=document.getElementById('sec-value').value;
    if(!name||!value) return toast('Preencha nome e valor',true);
    var r=await post('/api/editor/secret',{name:name,value:value});
    if(r.ok){
      toast('Segredo salvo');
      document.getElementById('sec-value').value='';
      if(r.json.secrets){
        document.getElementById('sec-list').innerHTML=r.json.secrets.map(function(n){
          return '<span class="sec-chip">'+escapeHtml(n)+'</span>';
        }).join('')||'<span style="color:#666">Nenhum</span>';
      }
    } else toast(errMsg(r),true);
  });

  async function doSend(){
    var input=document.getElementById('chatInput');
    var text=input.value.trim();
    if(!text) return;
    addMsg('user',text); input.value='';
    document.getElementById('sendChat').disabled=true;
    addMsg('bot','Processando...');
    var r=await post('/api/editor/chat',{message:text});
    document.getElementById('sendChat').disabled=false;
    var log=document.getElementById('chatLog');
    if(log.lastChild) log.removeChild(log.lastChild);
    if(r.ok) addMsg('bot', r.json.reply||'Sem resposta');
    else addMsg('bot','Erro: '+errMsg(r));
  }
  document.getElementById('sendChat').addEventListener('click', doSend);
  document.getElementById('chatInput').addEventListener('keydown', function(e){
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doSend()}
  });
})();
</script>
</body>
</html>`;
};
