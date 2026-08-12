module.exports = ({ user, userAvatarUrl, editorMeta }) => {
  const meta = editorMeta || { owner: '', repo: '', branch: 'main', hasToken: false, secrets: [] };
  const secretsList = (meta.secrets || []).map(n => `<span class="sec-chip">${n}</span>`).join('') || '<span style="color:#666">Nenhum</span>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Editor — Aeternus</title>
<link rel="stylesheet" href="/style.css">
<style>
:root{--bg:#0b0b12;--card:#14141f;--border:#252536;--text:#eee;--muted:#888;--primary:#7c3aed}
body{background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif;margin:0}
.navbar{height:64px;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;background:rgba(20,20,31,.95)}
.logo{font-weight:800;background:linear-gradient(90deg,#a78bfa,#7c3aed);-webkit-background-clip:text;color:transparent}
.nav-right{margin-left:auto;display:flex;gap:10px}
.wrap{max-width:960px;margin:0 auto;padding:24px 16px 80px}
.badge{display:inline-block;background:linear-gradient(90deg,#7c3aed,#a78bfa);color:#fff;font-size:.72rem;font-weight:700;padding:4px 10px;border-radius:8px;margin-bottom:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:800px){.grid{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px}
.card h2{font-size:1.05rem;margin:0 0 8px}.desc{color:var(--muted);font-size:.85rem;margin-bottom:14px}
label{display:block;font-size:.8rem;color:var(--muted);margin:10px 0 5px}
input,textarea{width:100%;box-sizing:border-box;background:#0b0b12;border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:10px;font:inherit}
input.secret{letter-spacing:.08em}
.btn{background:var(--primary);color:#fff;border:none;padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;margin-top:10px;margin-right:8px}
.btn2{background:transparent;border:1px solid var(--border);color:var(--text);padding:10px 16px;border-radius:10px;font-weight:600;cursor:pointer;margin-top:10px}
.sec-chip{display:inline-block;background:#1a1a28;border:1px solid var(--border);border-radius:8px;padding:4px 8px;margin:2px;font-size:.8rem;color:#c4b5fd}
.chat{display:flex;flex-direction:column;height:420px}
.chat-log{flex:1;overflow:auto;background:#0b0b12;border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px}
.msg{margin-bottom:12px;padding:10px 12px;border-radius:12px;font-size:.9rem;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.msg.user{background:rgba(124,58,237,.18);border:1px solid rgba(124,58,237,.35)}
.msg.bot{background:#12121c;border:1px solid var(--border)}
.msg .who{font-size:.7rem;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
.chat-row{display:flex;gap:8px}
.chat-row textarea{flex:1;min-height:52px;resize:vertical}
.toast{position:fixed;bottom:20px;right:20px;background:#22c55e;color:#fff;padding:12px 16px;border-radius:12px;opacity:0;transition:.3s;z-index:50}.toast.show{opacity:1}.toast.err{background:#ef4444}
.status-line{font-size:.85rem;color:#a78bfa;margin-bottom:8px}
</style>
</head>
<body>
<nav class="navbar">
  <div class="logo">Aeternus Editor</div>
  <div class="nav-right">
    <a href="/dashboard" class="btn2" style="text-decoration:none;display:inline-block">Servidores</a>
    <a href="/logout" class="btn2" style="text-decoration:none;display:inline-block">Deslogar</a>
  </div>
</nav>

<div class="wrap">
  <div class="badge">ACESSO DONO</div>
  <h1 style="margin:0 0 6px;font-size:1.5rem">🛠️ Sistema de Editor</h1>
  <p class="desc">Conecte qualquer repositório GitHub, guarde tokens em modo secreto e envie comandos para criar/editar arquivos.</p>

  <div class="grid" style="margin-bottom:16px">
    <div class="card">
      <h2>🔗 Repositório GitHub</h2>
      <p class="desc">Owner, nome do repo e branch. Token fica só no modo secreto.</p>
      <label>Owner (usuário/org)</label>
      <input id="gh-owner" value="${(meta.owner||'').replace(/"/g,'&quot;')}" placeholder="seu-usuario">
      <label>Repositório</label>
      <input id="gh-repo" value="${(meta.repo||'').replace(/"/g,'&quot;')}" placeholder="Aeternus-">
      <label>Branch</label>
      <input id="gh-branch" value="${(meta.branch||'main').replace(/"/g,'&quot;')}" placeholder="main">
      <button class="btn" id="saveRepo">Salvar conexão</button>
      <button class="btn2" id="testRepo">Testar</button>
      <div class="status-line" id="repoStatus">Token: ${meta.hasToken ? '✅ configurado (oculto)' : '❌ não configurado'}</div>
    </div>

    <div class="card">
      <h2>🔐 Cofre de Segredos</h2>
      <p class="desc">APIs, tokens e chaves. Depois de salvar, o valor **nunca** é mostrado de novo.</p>
      <label>Nome (ex: GITHUB_TOKEN)</label>
      <input id="sec-name" placeholder="GITHUB_TOKEN" autocomplete="off">
      <label>Valor (secreto)</label>
      <input id="sec-value" class="secret" type="password" placeholder="••••••••" autocomplete="new-password">
      <button class="btn" id="saveSecret">Salvar segredo</button>
      <div style="margin-top:12px"><span class="desc">Salvos:</span><div id="sec-list">${secretsList}</div></div>
    </div>
  </div>

  <div class="card">
    <h2>💬 Falar com o Editor</h2>
    <p class="desc">Digite o comando e envie. Exemplos: <code>ajuda</code> · <code>listar src</code> · <code>conectar user/repo main</code></p>
    <div class="chat">
      <div class="chat-log" id="chatLog">
        <div class="msg bot"><div class="who">Aeternus</div>Editor online. Digite <b>ajuda</b> para ver os comandos. Configure o <b>GITHUB_TOKEN</b> no cofre antes de editar arquivos.</div>
      </div>
      <div class="chat-row">
        <textarea id="chatInput" placeholder="Ex: listar src/bot  |  criar src/teste.js + bloco de código"></textarea>
        <button class="btn" id="sendChat" style="align-self:flex-end">Enviar</button>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>
<script>
function toast(m,err){var t=document.getElementById('toast');t.textContent=m;t.className='toast show'+(err?' err':'');setTimeout(function(){t.classList.remove('show')},2800)}
async function post(url,body){
  var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});
  var j=await r.json().catch(function(){return{}});
  return {ok:r.ok,status:r.status,json:j};
}
function addMsg(role,text){
  var log=document.getElementById('chatLog');
  var d=document.createElement('div');
  d.className='msg '+role;
  d.innerHTML='<div class="who">'+(role==='user'?'Você':'Aeternus')+'</div>'+escapeHtml(text).replace(/\n/g,'<br>');
  log.appendChild(d);
  log.scrollTop=log.scrollHeight;
}
function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.getElementById('saveRepo').onclick=async function(){
  var r=await post('/api/editor/repo',{
    owner:document.getElementById('gh-owner').value.trim(),
    repo:document.getElementById('gh-repo').value.trim(),
    branch:document.getElementById('gh-branch').value.trim()||'main'
  });
  toast(r.ok?'Conexão salva':(r.json.error||'Erro'),!r.ok);
};
document.getElementById('testRepo').onclick=async function(){
  var r=await post('/api/editor/test',{});
  if(r.ok) toast('OK: '+r.json.full_name);
  else toast(r.json.error||'Falha no teste',true);
};
document.getElementById('saveSecret').onclick=async function(){
  var name=document.getElementById('sec-name').value.trim();
  var value=document.getElementById('sec-value').value;
  if(!name||!value) return toast('Preencha nome e valor',true);
  var r=await post('/api/editor/secret',{name:name,value:value});
  if(r.ok){
    toast('Segredo salvo');
    document.getElementById('sec-value').value='';
    if(r.json.secrets){
      document.getElementById('sec-list').innerHTML=r.json.secrets.map(function(n){return '<span class="sec-chip">'+n+'</span>'}).join('')||'<span style="color:#666">Nenhum</span>';
    }
    if(name.toUpperCase()==='GITHUB_TOKEN'||name.toUpperCase()==='GH_TOKEN'){
      document.getElementById('repoStatus').textContent='Token: ✅ configurado (oculto)';
    }
  } else toast(r.json.error||'Erro',true);
};

async function sendChat(){
  var input=document.getElementById('chatInput');
  var text=input.value.trim();
  if(!text) return;
  addMsg('user',text);
  input.value='';
  var r=await post('/api/editor/chat',{message:text});
  addMsg('bot', r.json.reply || r.json.error || 'Sem resposta');
}
document.getElementById('sendChat').onclick=sendChat;
document.getElementById('chatInput').addEventListener('keydown',function(e){
  if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendChat(); }
});
</script>
</body>
</html>`;
};
