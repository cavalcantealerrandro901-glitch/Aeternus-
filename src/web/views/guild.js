module.exports = (guild, user, userAvatarUrl, config, channels, categories = [], roles = []) => {
  const fs = require('fs');
  const path = require('path');
  // Fallback inline if external missing
  const logs = config.logs || {};
  const welcome = config.welcome || {};
  const automod = config.automod || {};
  const tickets = config.tickets || {};
  const economyRaw = config.economy || {};

  function getLogConfig(type) {
    if (logs[type] && typeof logs[type] === 'object') return { enabled: !!logs[type].enabled, channel: logs[type].channel || '' };
    return { enabled: false, channel: '' };
  }
  const logTypes = ['ban','kick','timeout','message','messageEdit','member'];
  const logLabels = {
    ban:['Banimentos','Ban/desban'], kick:['Expulsoes','Kicks'], timeout:['Timeout','Castigos'],
    message:['Msgs apagadas','Delete'], messageEdit:['Msgs editadas','Edit'], member:['Membros','Join/leave']
  };

  const channelOptions = (sel) => (channels||[]).map(c => `<option value="${c.id}" ${sel===c.id?'selected':''}>#${c.name}</option>`).join('');
  const categoryOptions = (sel) => (categories||[]).map(c => `<option value="${c.id}" ${sel===c.id?'selected':''}>${c.name}</option>`).join('');
  const roleOptions = (sel) => (roles||[]).map(r => `<option value="${r.id}" ${sel===r.id?'selected':''}>@${r.name}</option>`).join('');
  const guildIcon = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;

  const eEnabled = economyRaw.enabled !== false;
  const tEnabled = !!tickets.enabled;
  const tOptions = Array.isArray(tickets.options) && tickets.options.length ? tickets.options : [{id:'1',label:'Abrir Ticket',emoji:'🎫',description:''}];
  const tOptionsJson = JSON.stringify(tOptions).replace(/</g, '\\u003c');
  const tDisplayMode = tickets.displayMode || 'buttons';

  const w = welcome;
  const am = automod;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${guild.name} — Aeternus</title><link rel="stylesheet" href="/style.css">
<style>
:root{--bg:#0b0b12;--card:#14141f;--border:#252536;--text:#eee;--muted:#888;--primary:#7c3aed;--primary-h:#6d28d9;--ok:#22c55e;--err:#ef4444}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif}
.navbar{height:64px;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 16px;background:rgba(20,20,31,.9);backdrop-filter:blur(8px);position:sticky;top:0;z-index:100}
.logo{font-weight:800;letter-spacing:.04em;background:linear-gradient(90deg,#a78bfa,#7c3aed);-webkit-background-clip:text;color:transparent}
.layout{display:flex;min-height:calc(100vh - 64px)}
.sidebar{width:270px;background:var(--card);border-right:1px solid var(--border);padding:16px;position:fixed;top:64px;left:0;bottom:0;transform:translateX(-100%);transition:.3s;z-index:90;overflow:auto}
.sidebar.open{transform:none}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:80;opacity:0;visibility:hidden;transition:.3s}.overlay.show{opacity:1;visibility:visible}
.main{flex:1;padding:28px 20px;width:100%}
.menu-toggle{width:40px;height:40px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:1.2rem;cursor:pointer;margin-right:12px}
.menu-item{display:flex;gap:10px;width:100%;padding:12px;border:none;background:none;color:var(--muted);border-radius:10px;cursor:pointer;font-size:.95rem;margin-bottom:4px;text-align:left}
.menu-item.active,.menu-item:hover{background:rgba(124,58,237,.15);color:#c4b5fd}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:16px}
.card h2{font-size:1.2rem;margin-bottom:6px}.desc{color:var(--muted);font-size:.9rem;margin-bottom:18px}
.item{background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px}.item.on{border-color:rgba(124,58,237,.45)}
.row{display:flex;justify-content:space-between;align-items:center;gap:12px}
label.lbl{display:block;font-size:.85rem;color:var(--muted);margin:10px 0 6px}
input,select,textarea{width:100%;background:var(--card);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:10px;font:inherit;margin-bottom:8px}
textarea{min-height:70px;resize:vertical}
.toggle{position:relative;width:50px;height:28px;flex-shrink:0} .toggle input{opacity:0;width:0;height:0}
.slider{position:absolute;inset:0;background:#333;border-radius:28px;cursor:pointer;transition:.25s}
.slider:before{content:"";position:absolute;width:22px;height:22px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.25s}
.toggle input:checked+.slider{background:#3b82f6}.toggle input:checked+.slider:before{transform:translateX(22px)}
.box{display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}.box.show{display:block}
.btn{background:var(--primary);color:#fff;border:none;padding:12px 18px;border-radius:10px;font-weight:600;cursor:pointer;margin-right:8px;margin-top:8px}
.btn2{background:transparent;border:1px solid var(--border);color:var(--text);padding:12px 18px;border-radius:10px;font-weight:600;cursor:pointer;margin-top:8px}
.section{display:none}.section.active{display:block}
.toast{position:fixed;bottom:24px;right:24px;background:var(--ok);color:#fff;padding:12px 18px;border-radius:12px;opacity:0;transform:translateY(12px);transition:.3s;z-index:200}.toast.show{opacity:1;transform:none}.toast.err{background:var(--err)}
.chk{display:flex;align-items:center;gap:8px;margin:8px 0;font-size:.9rem}
.srv{display:flex;gap:10px;align-items:center;padding:10px;border-radius:12px;background:var(--bg);border:1px solid var(--border);margin-bottom:10px}
.srv img,.fb{width:36px;height:36px;border-radius:10px}.fb{background:var(--border);display:flex;align-items:center;justify-content:center;font-weight:700}
.switch{display:flex;justify-content:space-between;padding:10px 12px;border:1px solid var(--border);border-radius:10px;color:var(--muted);text-decoration:none;margin-bottom:16px}
@media(min-width:900px){.sidebar{position:relative;top:0;transform:none}.overlay,.menu-toggle{display:none}}
</style></head><body>
<nav class="navbar"><button class="menu-toggle" id="openSidebar">☰</button><div class="logo">AETERNUS</div></nav>
<div class="layout"><div class="overlay" id="overlay"></div>
<aside class="sidebar" id="sidebar">
<div class="srv">${guildIcon?`<img src="${guildIcon}">`:`<div class="fb">${guild.name[0]}</div>`}<strong>${guild.name}</strong></div>
<a class="switch" href="/dashboard"><span>Mudar de servidor</span><span>▾</span></a>
<button class="menu-item active" data-s="geral">⚙️ Geral</button>
<button class="menu-item" data-s="welcome">👋 Boas-vindas</button>
<button class="menu-item" data-s="moderacao">🛡️ Moderação</button>
<button class="menu-item" data-s="tickets">🎫 Tickets</button>
<button class="menu-item" data-s="economia">💀 Economia</button>
<button class="menu-item" data-s="logs">📋 Logs</button>
</aside>
<main class="main">
<div style="margin-bottom:20px;font-weight:700;font-size:1.25rem">${guild.name}</div>

<div class="section active" id="s-geral"><div class="card"><h2>Prefixo</h2><p class="desc">Prefixo dos comandos de texto.</p>
<label class="lbl">Prefixo</label><input id="prefix" value="${config.prefix||'!'}" maxlength="5" style="max-width:140px">
<button class="btn" id="savePrefix">Salvar</button></div></div>

<div class="section" id="s-welcome"><div class="card"><h2>Boas-vindas</h2><p class="desc">Mensagem automática ao entrar.</p>
<div class="item ${w.enabled?'on':''}" id="item-welcome"><div class="row"><div><strong>Ativar</strong></div>
<label class="toggle"><input type="checkbox" id="toggle-welcome" ${w.enabled?'checked':''}><span class="slider"></span></label></div>
<div class="box ${w.enabled?'show':''}" id="box-welcome">
<label class="lbl">Canal</label><select id="w-channel"><option value="">Selecione</option>${channelOptions(w.channel||'')}</select>
<label class="lbl">Mensagem</label><textarea id="w-msg">${(w.message||'Bem-vindo {user} ao {server}!').replace(/</g,'&lt;')}</textarea>
<label class="chk"><input type="checkbox" id="w-embed" ${w.useEmbed?'checked':''}> Embed</label>
<label class="lbl">Título</label><input id="w-title" value="${(w.title||'Bem-vindo!').replace(/"/g,'&quot;')}">
<label class="lbl">Cor</label><input id="w-color" value="${w.color||'#7c3aed'}">
</div></div>
<button class="btn" id="saveWelcome">Salvar</button>
<button class="btn2" id="testWelcome">Testar</button></div></div>

<div class="section" id="s-moderacao"><div class="card"><h2>AutoMod</h2><p class="desc">Filtros automáticos.</p>
<div class="item ${am.enabled?'on':''}"><div class="row"><strong>Sistema AutoMod</strong>
<label class="toggle"><input type="checkbox" id="toggle-automod" ${am.enabled?'checked':''}><span class="slider"></span></label></div></div>
<div id="am-rules" style="display:${am.enabled?'block':'none'}">
${['badWords','invites','links','spam','massMention'].map(k=>{
  const cfg=am[k]||{};
  const titles={badWords:'Palavras',invites:'Convites',links:'Links',spam:'Spam',massMention:'Menções'};
  return `<div class="item ${cfg.enabled?'on':''}"><div class="row"><strong>${titles[k]}</strong>
<label class="toggle"><input type="checkbox" id="am-${k}" ${cfg.enabled?'checked':''}><span class="slider"></span></label></div>
<label class="lbl">Ação</label><select id="am-action-${k}"><option value="delete" ${cfg.action==='delete'?'selected':''}>Apagar</option><option value="warn" ${cfg.action==='warn'?'selected':''}>Aviso</option><option value="timeout" ${!cfg.action||cfg.action==='timeout'?'selected':''}>Timeout</option><option value="kick" ${cfg.action==='kick'?'selected':''}>Kick</option><option value="ban" ${cfg.action==='ban'?'selected':''}>Ban</option></select>
<label class="lbl">Motivo</label><input id="am-reason-${k}" value="${(cfg.reason||'').replace(/"/g,'&quot;')}">
${k==='badWords'?`<label class="lbl">Palavras (vírgula)</label><textarea id="am-words">${(Array.isArray(cfg.words)?cfg.words.join(', '):'').replace(/</g,'&lt;')}</textarea>`:''}
</div>`;}).join('')}
</div>
<button class="btn" id="saveAutomod">Salvar Moderação</button></div></div>

<div class="section" id="s-tickets"><div class="card"><h2>Tickets</h2><p class="desc">Painel de suporte com botões ou select.</p>
<div class="item ${tEnabled?'on':''}"><div class="row"><strong>Ativar tickets</strong>
<label class="toggle"><input type="checkbox" id="toggle-tickets" ${tEnabled?'checked':''}><span class="slider"></span></label></div>
<div class="box ${tEnabled?'show':''}" id="box-tickets">
<label class="lbl">Canal do painel</label><select id="t-panel"><option value="">Selecione</option>${channelOptions(tickets.panelChannel||'')}</select>
<label class="lbl">Categoria</label><select id="t-cat"><option value="">Nenhuma</option>${categoryOptions(tickets.category||'')}</select>
<label class="lbl">Cargo suporte</label><select id="t-role"><option value="">Nenhum</option>${roleOptions(tickets.supportRole||'')}</select>
<label class="lbl">Título</label><input id="t-title" value="${(tickets.embedTitle||'Central de Suporte').replace(/"/g,'&quot;')}">
<label class="lbl">Descrição</label><textarea id="t-desc">${(tickets.embedDescription||'Abra um ticket abaixo.').replace(/</g,'&lt;')}</textarea>
<label class="lbl">Opções</label><div id="t-opts"></div>
<button class="btn2" type="button" id="t-add">+ Opção</button>
<label class="lbl">Exibir como</label><select id="t-mode"><option value="buttons" ${tDisplayMode==='buttons'?'selected':''}>Botões</option><option value="select" ${tDisplayMode==='select'?'selected':''}>Select</option></select>
</div></div>
<button class="btn" id="saveTickets">Salvar</button>
<button class="btn2" id="sendTickets">Salvar e enviar painel</button></div></div>

<div class="section" id="s-economia"><div class="card"><h2>Economia & Jogos</h2><p class="desc">Almas, daily, work e jogos.</p>
<div class="item ${eEnabled?'on':''}"><div class="row"><strong>Economia ativa</strong>
<label class="toggle"><input type="checkbox" id="toggle-eco" ${eEnabled?'checked':''}><span class="slider"></span></label></div>
<div class="box ${eEnabled?'show':''}" id="box-eco">
<label class="lbl">Moeda</label><input id="eco-currency" value="${String(economyRaw.currency||'Almas').replace(/"/g,'&quot;')}">
<label class="lbl">Símbolo</label><input id="eco-symbol" value="${String(economyRaw.symbol||'💀').replace(/"/g,'&quot;')}">
<label class="lbl">Saldo inicial</label><input type="number" id="eco-start" value="${economyRaw.startingBalance??100}">
<label class="lbl">Daily min/max</label><div style="display:flex;gap:8px"><input type="number" id="eco-dmin" value="${economyRaw.dailyMin??150}"><input type="number" id="eco-dmax" value="${economyRaw.dailyMax??400}"></div>
<label class="lbl">Work min/max</label><div style="display:flex;gap:8px"><input type="number" id="eco-wmin" value="${economyRaw.workMin??50}"><input type="number" id="eco-wmax" value="${economyRaw.workMax??250}"></div>
<label class="lbl">Work cooldown (min)</label><input type="number" id="eco-wcd" value="${Math.round((economyRaw.workCooldownMs||3600000)/60000)}">
<label class="chk"><input type="checkbox" id="g-cf" ${economyRaw.games?.coinflip!==false?'checked':''}> Coinflip</label>
<label class="chk"><input type="checkbox" id="g-slots" ${economyRaw.games?.slots!==false?'checked':''}>Slots</label>
<label class="chk"><input type="checkbox" id="g-dice" ${economyRaw.games?.dice!==false?'checked':''}> Dice</label>
<label class="chk"><input type="checkbox" id="g-rou" ${economyRaw.games?.roulette!==false?'checked':''}> Roleta</label>
</div></div>
<button class="btn" id="saveEco">Salvar Economia</button></div></div>

<div class="section" id="s-logs"><div class="card"><h2>Logs</h2><p class="desc">Canal por evento.</p>
${logTypes.map(t=>{const c=getLogConfig(t);const [a,b]=logLabels[t];return `<div class="item ${c.enabled?'on':''}"><div class="row"><div><strong>${a}</strong><div style="font-size:.8rem;color:var(--muted)">${b}</div></div>
<label class="toggle"><input type="checkbox" id="log-${t}" ${c.enabled?'checked':''}><span class="slider"></span></label></div>
<div class="box ${c.enabled?'show':''}" id="logbox-${t}"><label class="lbl">Canal</label><select id="logch-${t}"><option value="">Selecione</option>${channelOptions(c.channel)}</select></div></div>`;}).join('')}
<button class="btn" id="saveLogs">Salvar Logs</button></div></div>

</main></div>
<div class="toast" id="toast"></div>
<script>
const guildId="${guild.id}";
let ticketOpts=${tOptionsJson};
const sidebar=document.getElementById('sidebar'),overlay=document.getElementById('overlay');
function openS(){sidebar.classList.add('open');overlay.classList.add('show')}
function closeS(){sidebar.classList.remove('open');overlay.classList.remove('show')}
document.getElementById('openSidebar').onclick=openS;overlay.onclick=closeS;
let sx=0,sy=0;
document.addEventListener('touchstart',e=>{sx=e.changedTouches[0].screenX;sy=e.changedTouches[0].screenY},{passive:true});
document.addEventListener('touchend',e=>{const dx=e.changedTouches[0].screenX-sx,dy=Math.abs(e.changedTouches[0].screenY-sy);if(dy>80)return;if(dx>70)openS();if(dx<-70)closeS()},{passive:true});
document.querySelectorAll('.menu-item').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.menu-item').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));btn.classList.add('active');document.getElementById('s-'+btn.dataset.s).classList.add('active');closeS()});
function toast(m,err){const t=document.getElementById('toast');t.textContent=m;t.className='toast show'+(err?' err':'');setTimeout(()=>t.classList.remove('show'),3000)}
async function post(u,b){return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})}
function bindTog(id,box){const t=document.getElementById(id);if(!t)return;t.onchange=()=>{const b=document.getElementById(box);if(!b)return;if(t.checked)b.classList.add('show');else b.classList.remove('show')}}
bindTog('toggle-welcome','box-welcome');bindTog('toggle-tickets','box-tickets');bindTog('toggle-eco','box-eco');
['ban','kick','timeout','message','messageEdit','member'].forEach(t=>bindTog('log-'+t,'logbox-'+t));
document.getElementById('toggle-automod').onchange=e=>{document.getElementById('am-rules').style.display=e.target.checked?'block':'none'};
function renderOpts(){const list=document.getElementById('t-opts');list.innerHTML='';ticketOpts.forEach((o,i)=>{const d=document.createElement('div');d.className='item';d.innerHTML='<label class="lbl">Nome</label><input data-i="'+i+'" data-f="label" value="'+(o.label||'')+'">'+'<label class="lbl">Emoji</label><input data-i="'+i+'" data-f="emoji" value="'+(o.emoji||'')+'">'+'<button class="btn2" type="button" data-rm="'+i+'">Remover</button>';list.appendChild(d)});list.querySelectorAll('input').forEach(inp=>inp.oninput=()=>{ticketOpts[+inp.dataset.i][inp.dataset.f]=inp.value});list.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ticketOpts.splice(+b.dataset.rm,1);if(!ticketOpts.length)ticketOpts=[{id:'1',label:'Abrir Ticket',emoji:'🎫',description:''}];renderOpts()})}
renderOpts();
document.getElementById('t-add').onclick=()=>{if(ticketOpts.length>=25)return alert('Máx 25');ticketOpts.push({id:String(Date.now()),label:'Nova opção',emoji:'🎫',description:''});renderOpts()};
document.getElementById('savePrefix').onclick=async()=>{const p=document.getElementById('prefix').value.trim();const r=await post('/api/guilds/'+guildId+'/prefix',{prefix:p});toast(r.ok?'Salvo!':'Erro',!r.ok)};
document.getElementById('saveWelcome').onclick=async()=>{const welcome={enabled:document.getElementById('toggle-welcome').checked,channel:document.getElementById('w-channel').value||null,message:document.getElementById('w-msg').value,useEmbed:document.getElementById('w-embed').checked,title:document.getElementById('w-title').value,color:document.getElementById('w-color').value};const r=await post('/api/guilds/'+guildId+'/welcome',{welcome});toast(r.ok?'Salvo!':'Erro',!r.ok)};
document.getElementById('testWelcome').onclick=async()=>{const welcome={enabled:true,channel:document.getElementById('w-channel').value,message:document.getElementById('w-msg').value,useEmbed:document.getElementById('w-embed').checked,title:document.getElementById('w-title').value,color:document.getElementById('w-color').value};if(!welcome.channel)return alert('Canal');const r=await post('/api/guilds/'+guildId+'/welcome/test',{welcome});toast(r.ok?'Teste enviado!':'Erro',!r.ok)};
document.getElementById('saveAutomod').onclick=async()=>{function rule(k){return{enabled:document.getElementById('am-'+k).checked,action:document.getElementById('am-action-'+k).value,reason:document.getElementById('am-reason-'+k).value,duration:10}};const badWords=rule('badWords');badWords.words=(document.getElementById('am-words').value||'').split(',').map(x=>x.trim()).filter(Boolean);const automod={enabled:document.getElementById('toggle-automod').checked,badWords,invites:rule('invites'),links:rule('links'),spam:rule('spam'),massMention:rule('massMention')};const r=await post('/api/guilds/'+guildId+'/automod',{automod});toast(r.ok?'Salvo!':'Erro',!r.ok)};
function getTickets(){return{enabled:document.getElementById('toggle-tickets').checked,panelChannel:document.getElementById('t-panel').value||null,category:document.getElementById('t-cat').value||null,supportRole:document.getElementById('t-role').value||null,embedTitle:document.getElementById('t-title').value,embedDescription:document.getElementById('t-desc').value,displayMode:document.getElementById('t-mode').value,options:ticketOpts}};
document.getElementById('saveTickets').onclick=async()=>{const r=await post('/api/guilds/'+guildId+'/tickets',{tickets:getTickets(),sendPanel:false});toast(r.ok?'Salvo!':'Erro',!r.ok)};
document.getElementById('sendTickets').onclick=async()=>{const t=getTickets();if(!t.panelChannel)return alert('Canal do painel');const r=await post('/api/guilds/'+guildId+'/tickets',{tickets:t,sendPanel:true});toast(r.ok?'Painel enviado!':'Erro',!r.ok)};
document.getElementById('saveEco').onclick=async()=>{const economy={enabled:document.getElementById('toggle-eco').checked,currency:document.getElementById('eco-currency').value||'Almas',symbol:document.getElementById('eco-symbol').value||'💀',startingBalance:+document.getElementById('eco-start').value||0,dailyMin:+document.getElementById('eco-dmin').value||150,dailyMax:+document.getElementById('eco-dmax').value||400,workMin:+document.getElementById('eco-wmin').value||50,workMax:+document.getElementById('eco-wmax').value||250,workCooldownMs:(+document.getElementById('eco-wcd').value||60)*60000,games:{coinflip:document.getElementById('g-cf').checked,slots:document.getElementById('g-slots').checked,dice:document.getElementById('g-dice').checked,roulette:document.getElementById('g-rou').checked}};const r=await post('/api/guilds/'+guildId+'/economy',{economy});toast(r.ok?'Economia salva!':'Erro',!r.ok)};
document.getElementById('saveLogs').onclick=async()=>{const logs={};['ban','kick','timeout','message','messageEdit','member'].forEach(t=>{const en=document.getElementById('log-'+t).checked;logs[t]={enabled:en,channel:en?(document.getElementById('logch-'+t).value||null):null}});const r=await post('/api/guilds/'+guildId+'/logs',{logs});toast(r.ok?'Logs salvos!':'Erro',!r.ok)};
</script></body></html>`;
};
