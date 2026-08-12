module.exports = (guild, user, userAvatarUrl, config, channels, categories = [], roles = []) => {
    const logs = config.logs || {};
    const welcome = config.welcome || {};
    const automod = config.automod || {};
    const tickets = config.tickets || {};

    function getLogConfig(type) {
        if (logs[type] && typeof logs[type] === 'object') {
            return { enabled: !!logs[type].enabled, channel: logs[type].channel || '' };
        }
        return { enabled: logs[type] !== false && !!logs.channel, channel: logs.channel || '' };
    }

    const banCfg = getLogConfig('ban');
    const kickCfg = getLogConfig('kick');
    const timeoutCfg = getLogConfig('timeout');
    const messageCfg = getLogConfig('message');
    const messageEditCfg = getLogConfig('messageEdit');
    const memberCfg = getLogConfig('member');

    const wEnabled = !!welcome.enabled;
    const wChannel = welcome.channel || '';
    const wMessage = (welcome.message || 'Bem-vindo(a) {user} ao **{server}**! Agora somos {memberCount} membros.').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const wUseEmbed = !!welcome.useEmbed;
    const wTitle = (welcome.title || 'Bem-vindo(a)!').replace(/"/g, '&quot;');
    const wAuthor = (welcome.author || '').replace(/"/g, '&quot;');
    const wColor = welcome.color || '#7c3aed';
    const wImage = (welcome.image || '').replace(/"/g, '&quot;');
    const wFooter = (welcome.footer || '').replace(/"/g, '&quot;');
    const wMention = !!welcome.mentionUser;

    const amEnabled = !!automod.enabled;
    const bw = automod.badWords || {};
    const inv = automod.invites || {};
    const lnk = automod.links || {};
    const sp = automod.spam || {};
    const mm = automod.massMention || {};

    const tEnabled = !!tickets.enabled;
    const tPanel = tickets.panelChannel || '';
    const tCategory = tickets.category || '';
    const tRole = tickets.supportRole || '';
    const tTitle = (tickets.embedTitle || '🎫 Central de Suporte').replace(/"/g, '&quot;');
    const tDesc = (tickets.embedDescription || 'Clique no botão abaixo para abrir um ticket e falar com a equipe de suporte.').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tColor = tickets.embedColor || '#7c3aed';
    const tOpenMsg = (tickets.openMessage || 'Olá! A equipe irá atendê-lo em breve. Descreva seu problema com detalhes.').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tDisplayMode = tickets.displayMode || 'buttons';
    let tOptions = Array.isArray(tickets.options) && tickets.options.length
        ? tickets.options
        : [{ id: '1', label: tickets.buttonLabel || 'Abrir Ticket', emoji: '🎫', description: '' }];
    const tOptionsJson = JSON.stringify(tOptions).replace(/</g, '\\u003c');

    const actionOpts = (selected) => {
        const opts = [['delete','Apenas apagar'],['warn','Aviso'],['timeout','Timeout'],['kick','Expulsar'],['ban','Banir']];
        return opts.map(([v,l]) => `<option value="${v}" ${selected===v?'selected':''}>${l}</option>`).join('');
    };

    const channelOptions = (selected) => channels.map(c =>
        `<option value="${c.id}" ${selected===c.id?'selected':''}>#${c.name}</option>`
    ).join('');

    const categoryOptions = (selected) => categories.map(c =>
        `<option value="${c.id}" ${selected===c.id?'selected':''}>${c.name}</option>`
    ).join('');

    const roleOptions = (selected) => roles.map(r =>
        `<option value="${r.id}" ${selected===r.id?'selected':''}>@${r.name}</option>`
    ).join('');

    const guildIcon = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;

    function ruleBlock(id, icon, title, desc, cfg, extra) {
        const en = !!cfg.enabled;
        return `<div class="log-item ${en?'active-item':''}" id="item-${id}"><div class="log-item-header"><div class="log-item-info"><strong>${icon} ${title}</strong><span>${desc}</span></div><label class="toggle"><input type="checkbox" id="toggle-${id}" ${en?'checked':''}><span class="toggle-slider"></span></label></div><div class="log-channel-box ${en?'show':''}" id="channel-box-${id}"><label>Punição</label><select id="action-${id}">${actionOpts(cfg.action||'timeout')}</select><label>Duração timeout (min)</label><input type="number" id="duration-${id}" value="${cfg.duration||10}" min="1"><label>Motivo</label><input type="text" id="reason-${id}" value="${(cfg.reason||'').replace(/"/g,'&quot;')}">${extra||''}</div></div>`;
    }

    const logLabels = {
        ban:['🔨 Banimentos','Ban e desban'], kick:['👢 Expulsões','Kicks'], timeout:['🔇 Timeout','Castigos'],
        message:['🗑️ Msgs apagadas','Deletadas'], messageEdit:['✏️ Msgs editadas','Editadas'], member:['👤 Membros','Entrada/saída']
    };
    const logCfgs = { ban:banCfg, kick:kickCfg, timeout:timeoutCfg, message:messageCfg, messageEdit:messageEditCfg, member:memberCfg };

    return `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${guild.name} — Aeternus</title>
<link rel="stylesheet" href="/style.css">
<style>
.layout{display:flex;min-height:calc(100vh - 70px);position:relative;overflow-x:hidden}
.sidebar{width:280px;background:var(--card);border-right:1px solid var(--border);padding:20px 14px;position:fixed;top:70px;left:0;bottom:0;z-index:90;transform:translateX(-100%);transition:transform .3s;overflow-y:auto}
.sidebar.open{transform:translateX(0)}
.sidebar-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:80;opacity:0;visibility:hidden;transition:all .3s}
.sidebar-overlay.show{opacity:1;visibility:visible}
.sidebar-server{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:var(--bg);border:1px solid var(--border)}
.sidebar-server img,.sidebar-server .fb{width:40px;height:40px;border-radius:10px;object-fit:cover;flex-shrink:0}
.sidebar-server .fb{background:var(--border);display:flex;align-items:center;justify-content:center;font-weight:700}
.sidebar-server .name{font-weight:600;font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.switch-server{display:flex;align-items:center;justify-content:space-between;width:100%;padding:11px 14px;margin:12px 0 20px;background:transparent;border:1px solid var(--border);border-radius:10px;color:var(--text-muted);font-size:.9rem;text-decoration:none}
.switch-server:hover{border-color:var(--primary);color:var(--primary)}
.close-btn{background:none;border:none;color:var(--text-muted);font-size:1.3rem;cursor:pointer;padding:4px 8px;margin-left:auto}
.menu-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;color:var(--text-muted);font-weight:500;margin-bottom:4px;cursor:pointer;border:none;background:none;width:100%;text-align:left;font-size:.95rem}
.menu-item:hover,.menu-item.active{background:rgba(124,58,237,.15);color:#a78bfa}
.main-content{flex:1;padding:30px 20px;width:100%}
.menu-toggle{background:var(--card);border:1px solid var(--border);color:var(--text);font-size:1.35rem;width:42px;height:42px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.page-header{display:flex;align-items:center;gap:14px;margin-bottom:30px}
.guild-title{display:flex;align-items:center;gap:14px}
.guild-title img,.guild-title .fallback{width:48px;height:48px;border-radius:12px;object-fit:cover}
.fallback{background:var(--border);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.2rem}
.content-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;margin-bottom:20px}
.content-card h2{font-size:1.25rem;margin-bottom:6px}
.content-card .desc{color:var(--text-muted);font-size:.9rem;margin-bottom:24px}
.form-group{margin-bottom:16px}
.form-group label{display:block;font-weight:500;margin-bottom:8px;font-size:.9rem}
.form-group input,.form-group select,.form-group textarea{width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:11px 14px;border-radius:10px;font-size:.95rem;outline:none;font-family:inherit}
.form-group textarea{min-height:80px;resize:vertical}
.save-btn{background:var(--primary);color:#fff;border:none;padding:12px 22px;border-radius:10px;font-weight:600;cursor:pointer}
.test-btn{background:transparent;color:var(--text);border:1px solid var(--border);padding:12px 22px;border-radius:10px;font-weight:600;cursor:pointer}
.btn-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.toast{position:fixed;bottom:30px;right:30px;background:var(--success);color:#fff;padding:14px 22px;border-radius:12px;font-weight:500;opacity:0;transform:translateY(20px);transition:all .3s;z-index:200}
.toast.show{opacity:1;transform:translateY(0)}
.toast.error{background:var(--danger)}
.section{display:none}.section.active{display:block}
.log-item{background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:14px}
.log-item.active-item{border-color:rgba(124,58,237,.4)}
.log-item-header{display:flex;justify-content:space-between;align-items:center;gap:16px}
.log-item-info{display:flex;flex-direction:column;gap:2px}
.log-item-info strong{font-size:.98rem}
.log-item-info span{font-size:.82rem;color:var(--text-muted)}
.toggle{position:relative;width:52px;height:30px;flex-shrink:0}
.toggle input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;cursor:pointer;inset:0;background:#333;border-radius:30px;transition:.25s}
.toggle-slider:before{position:absolute;content:"";height:24px;width:24px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.25s}
.toggle input:checked+.toggle-slider{background:#3b82f6}
.toggle input:checked+.toggle-slider:before{transform:translateX(22px)}
.log-channel-box{margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:none}
.log-channel-box.show{display:block}
.log-channel-box label{display:block;font-size:.88rem;font-weight:500;margin-bottom:8px;color:var(--text-muted)}
.log-channel-box select,.log-channel-box textarea,.log-channel-box input{width:100%;background:var(--card);border:1px solid var(--border);color:var(--text);padding:11px 14px;border-radius:10px;font-size:.95rem;outline:none;font-family:inherit;margin-bottom:12px}
.vars-hint{font-size:.75rem;color:var(--text-muted);line-height:1.7;margin-bottom:12px}
.vars-hint code{background:var(--card);padding:2px 6px;border-radius:4px;font-size:.72rem}
.checkbox-row{display:flex;align-items:center;gap:10px;margin:10px 0;cursor:pointer;font-size:.9rem}
.color-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.color-row input[type=color]{width:44px;height:36px;border:none;background:none;cursor:pointer}
@media(min-width:900px){.sidebar{position:relative;top:0;transform:translateX(0)}.sidebar-overlay{display:none!important}.menu-toggle{display:none}.close-btn{display:none}}
</style></head>
<body>
<nav class="navbar"><div class="container" style="display:flex;align-items:center;gap:14px">
<button class="menu-toggle" id="openSidebar">☰</button><div class="logo">Aeternus</div>
</div></nav>
<div class="layout">
<div class="sidebar-overlay" id="overlay"></div>
<aside class="sidebar" id="sidebar">
<div style="display:flex;align-items:center;margin-bottom:4px">
<div class="sidebar-server" style="flex:1">${guildIcon?`<img src="${guildIcon}">`:`<div class="fb">${guild.name.charAt(0)}</div>`}<div class="name">${guild.name}</div></div>
<button class="close-btn" id="closeSidebar">✕</button></div>
<a href="/dashboard" class="switch-server"><span>Mudar de servidor</span><span>▾</span></a>
<button class="menu-item active" data-section="geral"><span>⚙️</span> Geral</button>
<button class="menu-item" data-section="welcome"><span>👋</span> Boas-vindas</button>
<button class="menu-item" data-section="moderacao"><span>🛡️</span> Moderação</button>
<button class="menu-item" data-section="tickets"><span>🎫</span> Tickets</button>
<button class="menu-item" data-section="economia"><span>💰</span> Economia</button>
<button class="menu-item" data-section="logs"><span>📋</span> Logs</button>
</aside>
<main class="main-content">
<div class="page-header"><div class="guild-title">${guildIcon?`<img src="${guildIcon}">`:`<div class="fallback">${guild.name.charAt(0)}</div>`}<div><div style="font-weight:600;font-size:1.2rem">${guild.name}</div><div style="color:var(--text-muted);font-size:.85rem">Configurações</div></div></div></div>

<div class="section active" id="section-geral"><div class="content-card"><h2>Prefixo</h2><p class="desc">Prefixo dos comandos de texto.</p><div class="form-group"><label>Prefixo</label><input type="text" id="prefix" value="${config.prefix||'!'}" maxlength="5" style="max-width:200px"></div><button class="save-btn" id="savePrefix">Salvar</button></div></div>

<div class="section" id="section-welcome"><div class="content-card"><h2>Boas-vindas</h2><p class="desc">Mensagem automática ao entrar.</p>
<div class="log-item ${wEnabled?'active-item':''}" id="item-welcome"><div class="log-item-header"><div class="log-item-info"><strong>👋 Boas-vindas</strong><span>Ativar</span></div><label class="toggle"><input type="checkbox" id="toggle-welcome" ${wEnabled?'checked':''}><span class="toggle-slider"></span></label></div>
<div class="log-channel-box ${wEnabled?'show':''}" id="channel-box-welcome">
<label>Canal</label><select id="channel-welcome"><option value="">Selecione</option>${channelOptions(wChannel)}</select>
<label>Mensagem</label><textarea id="welcome-message">${wMessage}</textarea>
<div class="vars-hint"><code>{user}</code> <code>{username}</code> <code>{server}</code> <code>{memberCount}</code> <code>{createdAt}</code></div>
<label class="checkbox-row"><input type="checkbox" id="welcome-mention" ${wMention?'checked':''}> Mencionar fora do embed</label>
<label class="checkbox-row"><input type="checkbox" id="welcome-embed" ${wUseEmbed?'checked':''}> Embed</label>
<div id="embed-options" style="display:${wUseEmbed?'block':'none'}">
<label>Título</label><input id="welcome-title" value="${wTitle}">
<label>Autor</label><input id="welcome-author" value="${wAuthor}">
<label>Cor</label><div class="color-row"><input type="color" id="welcome-color-picker" value="${wColor}"><input id="welcome-color" value="${wColor}"></div>
<label>Imagem URL</label><input id="welcome-image" value="${wImage}">
<label>Rodapé</label><input id="welcome-footer" value="${wFooter}">
</div></div></div>
<div class="btn-row"><button class="save-btn" id="saveWelcome">Salvar</button><button class="test-btn" id="testWelcome">🧪 Testar</button></div></div></div>

<div class="section" id="section-moderacao"><div class="content-card"><h2>Moderação Automática</h2><p class="desc">Filtros com punição.</p>
<div class="log-item ${amEnabled?'active-item':''}" id="item-automod-master"><div class="log-item-header"><div class="log-item-info"><strong>🛡️ AutoMod</strong><span>Liga/desliga</span></div><label class="toggle"><input type="checkbox" id="toggle-automod" ${amEnabled?'checked':''}><span class="toggle-slider"></span></label></div></div>
<div id="automod-rules" style="display:${amEnabled?'block':'none'}">
${ruleBlock('badWords','🚫','Palavras proibidas','Lista',bw,`<label>Palavras</label><textarea id="words-badWords">${(Array.isArray(bw.words)?bw.words.join(', '):'').replace(/</g,'&lt;')}</textarea>`)}
${ruleBlock('invites','🔗','Convites','Discord invites',inv)}
${ruleBlock('links','🌐','Links','Qualquer link',lnk)}
${ruleBlock('spam','📢','Spam','Repetidas',sp,`<label>Limite</label><input type="number" id="limit-spam" value="${sp.limit||4}" min="2">`)}
${ruleBlock('massMention','📣','Menções','Em massa',mm,`<label>Limite</label><input type="number" id="limit-massMention" value="${mm.limit||5}" min="2">`)}
</div><button class="save-btn" id="saveAutomod">Salvar Moderação</button></div></div>

<div class="section" id="section-tickets"><div class="content-card">
<h2>🎫 Tickets de Suporte</h2>
<p class="desc">Painel com botões ou menu de categorias para abrir tickets.</p>

<div class="log-item ${tEnabled?'active-item':''}" id="item-tickets">
<div class="log-item-header">
<div class="log-item-info"><strong>Sistema de Tickets</strong><span>Ativar tickets</span></div>
<label class="toggle"><input type="checkbox" id="toggle-tickets" ${tEnabled?'checked':''}><span class="toggle-slider"></span></label>
</div>
<div class="log-channel-box ${tEnabled?'show':''}" id="channel-box-tickets">
<label>Canal do painel</label>
<select id="ticket-panel"><option value="">Selecione</option>${channelOptions(tPanel)}</select>

<label>Categoria dos tickets</label>
<select id="ticket-category"><option value="">Nenhuma</option>${categoryOptions(tCategory)}</select>

<label>Cargo de suporte</label>
<select id="ticket-role"><option value="">Nenhum</option>${roleOptions(tRole)}</select>

<label>Título do embed</label>
<input id="ticket-title" value="${tTitle}">

<label>Descrição do embed</label>
<textarea id="ticket-desc">${tDesc}</textarea>

<label>Cor do embed</label>
<div class="color-row"><input type="color" id="ticket-color-picker" value="${tColor}"><input id="ticket-color" value="${tColor}"></div>

<label>Mensagem ao abrir o ticket</label>
<textarea id="ticket-open-msg">${tOpenMsg}</textarea>

<label style="margin-top:8px">Opções de ticket (botões / categorias)</label>
<div id="ticket-options-list"></div>
<button type="button" class="test-btn" id="add-ticket-option" style="margin-bottom:14px">+ Adicionar opção</button>

<label>Exibir como</label>
<select id="ticket-display-mode">
<option value="buttons" ${tDisplayMode==='buttons'?'selected':''}>Botões</option>
<option value="select" ${tDisplayMode==='select'?'selected':''}>Menu de categorias (select)</option>
</select>
</div></div>

<div class="btn-row">
<button class="save-btn" id="saveTickets">Salvar Tickets</button>
<button class="test-btn" id="sendTicketPanel">📤 Salvar e enviar painel</button>
</div>
</div></div>

<div class="section" id="section-economia"><div class="content-card"><h2>Economia</h2><p class="desc">Em breve.</p></div></div>

<div class="section" id="section-logs"><div class="content-card"><h2>Logs</h2><p class="desc">Canal por evento.</p>
${['ban','kick','timeout','message','messageEdit','member'].map(type=>{
 const cfg=logCfgs[type]; const [title,desc]=logLabels[type];
 return `<div class="log-item ${cfg.enabled?'active-item':''}" id="item-${type}"><div class="log-item-header"><div class="log-item-info"><strong>${title}</strong><span>${desc}</span></div><label class="toggle"><input type="checkbox" id="toggle-${type}" ${cfg.enabled?'checked':''}><span class="toggle-slider"></span></label></div><div class="log-channel-box ${cfg.enabled?'show':''}" id="channel-box-${type}"><label>Canal</label><select id="channel-${type}"><option value="">Selecione</option>${channelOptions(cfg.channel)}</select></div></div>`;
}).join('')}
<button class="save-btn" id="saveLogs">Salvar Logs</button></div></div>

</main></div>
<div class="toast" id="toast">Salvo!</div>
<script>
const guildId="${guild.id}";
const logTypes=['ban','kick','timeout','message','messageEdit','member'];
const amRules=['badWords','invites','links','spam','massMention'];
const sidebar=document.getElementById('sidebar'),overlay=document.getElementById('overlay');
function openSidebar(){sidebar.classList.add('open');overlay.classList.add('show')}
function closeSidebar(){sidebar.classList.remove('open');overlay.classList.remove('show')}
document.getElementById('openSidebar').onclick=openSidebar;
document.getElementById('closeSidebar').onclick=closeSidebar;
overlay.onclick=closeSidebar;
let sx=0,sy=0;
document.addEventListener('touchstart',e=>{sx=e.changedTouches[0].screenX;sy=e.changedTouches[0].screenY},{passive:true});
document.addEventListener('touchend',e=>{const dx=e.changedTouches[0].screenX-sx,dy=Math.abs(e.changedTouches[0].screenY-sy);if(dy>80)return;if(dx>70)openSidebar();if(dx<-70)closeSidebar()},{passive:true});
document.querySelectorAll('.menu-item').forEach(item=>{item.onclick=()=>{document.querySelectorAll('.menu-item').forEach(i=>i.classList.remove('active'));document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));item.classList.add('active');document.getElementById('section-'+item.dataset.section).classList.add('active');closeSidebar()}});
function bindToggle(id){const t=document.getElementById('toggle-'+id),b=document.getElementById('channel-box-'+id),i=document.getElementById('item-'+id);if(!t)return;t.onchange=()=>{if(t.checked){b&&b.classList.add('show');i&&i.classList.add('active-item')}else{b&&b.classList.remove('show');i&&i.classList.remove('active-item')}}}
logTypes.forEach(bindToggle);bindToggle('welcome');bindToggle('tickets');amRules.forEach(bindToggle);
document.getElementById('toggle-automod').onchange=e=>{document.getElementById('automod-rules').style.display=e.target.checked?'block':'none';document.getElementById('item-automod-master').classList.toggle('active-item',e.target.checked)};
document.getElementById('welcome-embed').onchange=e=>{document.getElementById('embed-options').style.display=e.target.checked?'block':'none'};
document.getElementById('welcome-color-picker').oninput=e=>{document.getElementById('welcome-color').value=e.target.value};
document.getElementById('ticket-color-picker').oninput=e=>{document.getElementById('ticket-color').value=e.target.value};
function showToast(m,err){const t=document.getElementById('toast');t.textContent=m;t.classList.toggle('error',!!err);t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}
async function post(url,body){return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
document.getElementById('savePrefix').onclick=async()=>{const p=document.getElementById('prefix').value.trim();if(!p||p.length>5)return alert('Inválido');const r=await post('/api/guilds/'+guildId+'/prefix',{prefix:p});showToast(r.ok?'Salvo!':'Erro',!r.ok)};
document.getElementById('saveLogs').onclick=async()=>{const logs={};logTypes.forEach(t=>{const en=document.getElementById('toggle-'+t).checked;logs[t]={enabled:en,channel:en?(document.getElementById('channel-'+t).value||null):null}});const r=await post('/api/guilds/'+guildId+'/logs',{logs});showToast(r.ok?'Logs salvos!':'Erro',!r.ok)};
function getWelcome(){return{enabled:document.getElementById('toggle-welcome').checked,channel:document.getElementById('channel-welcome').value||null,message:document.getElementById('welcome-message').value||'',useEmbed:document.getElementById('welcome-embed').checked,title:document.getElementById('welcome-title').value||'',author:document.getElementById('welcome-author').value||'',color:document.getElementById('welcome-color').value||'#7c3aed',image:document.getElementById('welcome-image').value||'',footer:document.getElementById('welcome-footer').value||'',mentionUser:document.getElementById('welcome-mention').checked}};
document.getElementById('saveWelcome').onclick=async()=>{const r=await post('/api/guilds/'+guildId+'/welcome',{welcome:getWelcome()});showToast(r.ok?'Salvo!':'Erro',!r.ok)};
document.getElementById('testWelcome').onclick=async()=>{const d=getWelcome();if(!d.channel)return alert('Selecione canal');const r=await post('/api/guilds/'+guildId+'/welcome/test',{welcome:d});const j=await r.json().catch(()=>({}));showToast(r.ok?'Teste enviado!':(j.error||'Erro'),!r.ok)};
document.getElementById('saveAutomod').onclick=async()=>{function rule(id){return{enabled:document.getElementById('toggle-'+id).checked,action:document.getElementById('action-'+id).value,duration:parseInt(document.getElementById('duration-'+id).value)||10,reason:document.getElementById('reason-'+id).value||''}};const badWords=rule('badWords');badWords.words=(document.getElementById('words-badWords').value||'').split(',').map(w=>w.trim()).filter(Boolean);const spam=rule('spam');spam.limit=parseInt(document.getElementById('limit-spam').value)||4;const massMention=rule('massMention');massMention.limit=parseInt(document.getElementById('limit-massMention').value)||5;const r=await post('/api/guilds/'+guildId+'/automod',{automod:{enabled:document.getElementById('toggle-automod').checked,badWords,invites:rule('invites'),links:rule('links'),spam,massMention}});showToast(r.ok?'Moderação salva!':'Erro',!r.ok)};
let ticketOpts = ${tOptionsJson};
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function renderTicketOpts(){
  const list=document.getElementById('ticket-options-list');
  list.innerHTML='';
  ticketOpts.forEach(function(o,i){
    const div=document.createElement('div');
    div.style.cssText='background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px';
    div.innerHTML='<label>Nome do botão/opção</label><input data-i="'+i+'" data-f="label" value="'+esc(o.label)+'" placeholder="Ex: Suporte">'
      +'<label>Emoji</label><input data-i="'+i+'" data-f="emoji" value="'+esc(o.emoji)+'" placeholder="🎫">'
      +'<label>Descrição (só no select)</label><input data-i="'+i+'" data-f="description" value="'+esc(o.description)+'" placeholder="Opcional">'
      +'<button type="button" class="test-btn" data-remove="'+i+'" style="margin-top:4px">Remover</button>';
    list.appendChild(div);
  });
  list.querySelectorAll('input[data-f]').forEach(function(inp){
    inp.oninput=function(){ticketOpts[+inp.dataset.i][inp.dataset.f]=inp.value};
  });
  list.querySelectorAll('[data-remove]').forEach(function(btn){
    btn.onclick=function(){
      ticketOpts.splice(+btn.dataset.remove,1);
      if(!ticketOpts.length) ticketOpts=[{id:'1',label:'Abrir Ticket',emoji:'🎫',description:''}];
      renderTicketOpts();
    };
  });
}
renderTicketOpts();
document.getElementById('add-ticket-option').onclick=function(){
  if(ticketOpts.length>=25) return alert('Máximo 25 opções');
  ticketOpts.push({id:String(Date.now()),label:'Nova opção',emoji:'🎫',description:''});
  renderTicketOpts();
};
function getTickets(){
  return{
    enabled:document.getElementById('toggle-tickets').checked,
    panelChannel:document.getElementById('ticket-panel').value||null,
    category:document.getElementById('ticket-category').value||null,
    supportRole:document.getElementById('ticket-role').value||null,
    embedTitle:document.getElementById('ticket-title').value||'',
    embedDescription:document.getElementById('ticket-desc').value||'',
    embedColor:document.getElementById('ticket-color').value||'#7c3aed',
    openMessage:document.getElementById('ticket-open-msg').value||'',
    displayMode:document.getElementById('ticket-display-mode').value||'buttons',
    options:ticketOpts.map(function(o,i){return{id:o.id||String(i+1),label:o.label||'Opção',emoji:o.emoji||'🎫',description:o.description||''}})
  };
}
document.getElementById('saveTickets').onclick=async()=>{const r=await post('/api/guilds/'+guildId+'/tickets',{tickets:getTickets(),sendPanel:false});showToast(r.ok?'Tickets salvos!':'Erro',!r.ok)};
document.getElementById('sendTicketPanel').onclick=async()=>{const data=getTickets();if(!data.panelChannel)return alert('Selecione o canal do painel');if(!data.options.length)return alert('Adicione ao menos uma opção');const btn=document.getElementById('sendTicketPanel');btn.disabled=true;btn.textContent='Enviando...';const r=await post('/api/guilds/'+guildId+'/tickets',{tickets:data,sendPanel:true});const j=await r.json().catch(()=>({}));showToast(r.ok?'Painel enviado!':(j.error||'Erro'),!r.ok);btn.disabled=false;btn.textContent='📤 Salvar e enviar painel'};
</script></body></html>`;
};
