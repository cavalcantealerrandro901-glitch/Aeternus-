module.exports = (guild, user, userAvatarUrl, config, channels) => {
    const logs = config.logs || {};
    const welcome = config.welcome || {};
    const automod = config.automod || {};

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

    const actionOpts = (selected) => {
        const opts = [
            ['delete', 'Apenas apagar mensagem'],
            ['warn', 'Aviso'],
            ['timeout', 'Timeout (silenciar)'],
            ['kick', 'Expulsar'],
            ['ban', 'Banir']
        ];
        return opts.map(([v, l]) => `<option value="${v}" ${selected === v ? 'selected' : ''}>${l}</option>`).join('');
    };

    const channelOptions = (selected) => channels.map(c =>
        `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>#${c.name}</option>`
    ).join('');

    const guildIcon = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : null;

    function ruleBlock(id, icon, title, desc, cfg, extraFields) {
        const en = !!cfg.enabled;
        return `
        <div class="log-item ${en ? 'active-item' : ''}" id="item-${id}">
            <div class="log-item-header">
                <div class="log-item-info">
                    <strong>${icon} ${title}</strong>
                    <span>${desc}</span>
                </div>
                <label class="toggle">
                    <input type="checkbox" id="toggle-${id}" ${en ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="log-channel-box ${en ? 'show' : ''}" id="channel-box-${id}">
                <label>Tipo de punição</label>
                <select id="action-${id}">${actionOpts(cfg.action || 'timeout')}</select>
                <label>Duração do timeout (minutos)</label>
                <input type="number" id="duration-${id}" value="${cfg.duration || 10}" min="1" max="40320">
                <label>Motivo da punição</label>
                <input type="text" id="reason-${id}" value="${(cfg.reason || '').replace(/"/g, '&quot;')}" placeholder="Motivo da punição">
                ${extraFields || ''}
            </div>
        </div>`;
    }

    const logLabels = {
        ban: ['🔨 Banimentos', 'Ban e desban'],
        kick: ['👢 Expulsões', 'Kicks'],
        timeout: ['🔇 Timeout', 'Castigos'],
        message: ['🗑️ Mensagens apagadas', 'Quando uma msg é deletada'],
        messageEdit: ['✏️ Mensagens editadas', 'Quando uma msg é editada'],
        member: ['👤 Membros', 'Entrada e saída']
    };

    const logCfgs = { ban: banCfg, kick: kickCfg, timeout: timeoutCfg, message: messageCfg, messageEdit: messageEditCfg, member: memberCfg };

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${guild.name} — Aeternus</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        .layout { display: flex; min-height: calc(100vh - 70px); position: relative; overflow-x: hidden; }
        .sidebar { width: 280px; background: var(--card); border-right: 1px solid var(--border); padding: 20px 14px; position: fixed; top: 70px; left: 0; bottom: 0; z-index: 90; transform: translateX(-100%); transition: transform 0.3s ease; overflow-y: auto; }
        .sidebar.open { transform: translateX(0); }
        .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 80; opacity: 0; visibility: hidden; transition: all 0.3s ease; }
        .sidebar-overlay.show { opacity: 1; visibility: visible; }
        .sidebar-server { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: var(--bg); border: 1px solid var(--border); }
        .sidebar-server img, .sidebar-server .fb { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
        .sidebar-server .fb { background: var(--border); display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .sidebar-server .name { font-weight: 600; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .switch-server { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 11px 14px; margin: 12px 0 20px; background: transparent; border: 1px solid var(--border); border-radius: 10px; color: var(--text-muted); font-size: 0.9rem; font-weight: 500; text-decoration: none; }
        .switch-server:hover { border-color: var(--primary); color: var(--primary); }
        .close-btn { background: none; border: none; color: var(--text-muted); font-size: 1.3rem; cursor: pointer; padding: 4px 8px; border-radius: 6px; margin-left: auto; }
        .menu-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; cursor: pointer; border: none; background: none; width: 100%; text-align: left; font-size: 0.95rem; }
        .menu-item:hover, .menu-item.active { background: rgba(124, 58, 237, 0.15); color: #a78bfa; }
        .main-content { flex: 1; padding: 30px 20px; width: 100%; }
        .menu-toggle { background: var(--card); border: 1px solid var(--border); color: var(--text); font-size: 1.35rem; width: 42px; height: 42px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .menu-toggle:hover { border-color: var(--primary); color: var(--primary); }
        .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 30px; }
        .guild-title { display: flex; align-items: center; gap: 14px; }
        .guild-title img, .guild-title .fallback { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; }
        .fallback { background: var(--border); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; }
        .content-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 28px; margin-bottom: 20px; }
        .content-card h2 { font-size: 1.25rem; margin-bottom: 6px; }
        .content-card .desc { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 24px; }
        .form-group { margin-bottom: 18px; }
        .form-group label { display: block; font-weight: 500; margin-bottom: 8px; font-size: 0.9rem; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 11px 14px; border-radius: 10px; font-size: 0.95rem; outline: none; font-family: inherit; }
        .save-btn { background: var(--primary); color: white; border: none; padding: 12px 22px; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .save-btn:hover { background: var(--primary-hover); }
        .test-btn { background: transparent; color: var(--text); border: 1px solid var(--border); padding: 12px 22px; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
        .toast { position: fixed; bottom: 30px; right: 30px; background: var(--success); color: white; padding: 14px 22px; border-radius: 12px; font-weight: 500; opacity: 0; transform: translateY(20px); transition: all 0.3s; z-index: 200; }
        .toast.show { opacity: 1; transform: translateY(0); }
        .toast.error { background: var(--danger); }
        .section { display: none; }
        .section.active { display: block; }
        .log-item { background: var(--bg); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; margin-bottom: 14px; }
        .log-item.active-item { border-color: rgba(124, 58, 237, 0.4); }
        .log-item-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .log-item-info { display: flex; flex-direction: column; gap: 2px; }
        .log-item-info strong { font-size: 0.98rem; }
        .log-item-info span { font-size: 0.82rem; color: var(--text-muted); }
        .toggle { position: relative; width: 52px; height: 30px; flex-shrink: 0; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #333; border-radius: 30px; transition: 0.25s; }
        .toggle-slider:before { position: absolute; content: ""; height: 24px; width: 24px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.25s; }
        .toggle input:checked + .toggle-slider { background: #3b82f6; }
        .toggle input:checked + .toggle-slider:before { transform: translateX(22px); }
        .log-channel-box { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); display: none; }
        .log-channel-box.show { display: block; }
        .log-channel-box label { display: block; font-size: 0.88rem; font-weight: 500; margin-bottom: 8px; color: var(--text-muted); }
        .log-channel-box select, .log-channel-box textarea, .log-channel-box input { width: 100%; background: var(--card); border: 1px solid var(--border); color: var(--text); padding: 11px 14px; border-radius: 10px; font-size: 0.95rem; outline: none; font-family: inherit; margin-bottom: 12px; }
        .log-channel-box textarea { min-height: 80px; resize: vertical; }
        .vars-hint { font-size: 0.75rem; color: var(--text-muted); line-height: 1.7; margin-bottom: 12px; }
        .vars-hint code { background: var(--card); padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; }
        .checkbox-row { display: flex; align-items: center; gap: 10px; margin: 10px 0; cursor: pointer; font-size: 0.9rem; }
        .color-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .color-row input[type="color"] { width: 44px; height: 36px; border: none; background: none; cursor: pointer; }
        @media (min-width: 900px) {
            .sidebar { position: relative; top: 0; transform: translateX(0); }
            .sidebar-overlay { display: none !important; }
            .menu-toggle { display: none; }
            .close-btn { display: none; }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="container" style="display:flex;align-items:center;gap:14px;">
            <button class="menu-toggle" id="openSidebar" title="Menu">☰</button>
            <div class="logo">Aeternus</div>
        </div>
    </nav>

    <div class="layout">
        <div class="sidebar-overlay" id="overlay"></div>
        <aside class="sidebar" id="sidebar">
            <div style="display:flex;align-items:center;margin-bottom:4px;">
                <div class="sidebar-server" style="flex:1;">
                    ${guildIcon ? `<img src="${guildIcon}" alt="">` : `<div class="fb">${guild.name.charAt(0)}</div>`}
                    <div class="name">${guild.name}</div>
                </div>
                <button class="close-btn" id="closeSidebar">✕</button>
            </div>
            <a href="/dashboard" class="switch-server"><span>Mudar de servidor</span><span>▾</span></a>
            <button class="menu-item active" data-section="geral"><span>⚙️</span> Geral</button>
            <button class="menu-item" data-section="welcome"><span>👋</span> Boas-vindas</button>
            <button class="menu-item" data-section="moderacao"><span>🛡️</span> Moderação</button>
            <button class="menu-item" data-section="economia"><span>💰</span> Economia</button>
            <button class="menu-item" data-section="utilidades"><span>🔧</span> Utilidades</button>
            <button class="menu-item" data-section="logs"><span>📋</span> Logs</button>
        </aside>

        <main class="main-content">
            <div class="page-header">
                <div class="guild-title">
                    ${guildIcon ? `<img src="${guildIcon}" alt="">` : `<div class="fallback">${guild.name.charAt(0)}</div>`}
                    <div>
                        <div style="font-weight:600;font-size:1.2rem;">${guild.name}</div>
                        <div style="color:var(--text-muted);font-size:0.85rem;">Configurações do servidor</div>
                    </div>
                </div>
            </div>

            <div class="section active" id="section-geral">
                <div class="content-card">
                    <h2>Prefixo do Bot</h2>
                    <p class="desc">Altere o prefixo dos comandos de texto.</p>
                    <div class="form-group">
                        <label>Prefixo</label>
                        <input type="text" id="prefix" value="${config.prefix || '!'}" maxlength="5" style="max-width:200px;">
                    </div>
                    <button class="save-btn" id="savePrefix">Salvar Prefixo</button>
                </div>
            </div>

            <div class="section" id="section-welcome">
                <div class="content-card">
                    <h2>Mensagem de Boas-vindas</h2>
                    <p class="desc">Enviada automaticamente quando alguém entra.</p>
                    <div class="log-item ${wEnabled ? 'active-item' : ''}" id="item-welcome">
                        <div class="log-item-header">
                            <div class="log-item-info"><strong>👋 Boas-vindas</strong><span>Ativar mensagem ao entrar</span></div>
                            <label class="toggle"><input type="checkbox" id="toggle-welcome" ${wEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label>
                        </div>
                        <div class="log-channel-box ${wEnabled ? 'show' : ''}" id="channel-box-welcome">
                            <label>Canal</label>
                            <select id="channel-welcome"><option value="">Selecione</option>${channelOptions(wChannel)}</select>
                            <label>Mensagem</label>
                            <textarea id="welcome-message">${wMessage}</textarea>
                            <div class="vars-hint"><code>{user}</code> <code>{username}</code> <code>{tag}</code> <code>{id}</code> <code>{server}</code> <code>{memberCount}</code> <code>{createdAt}</code></div>
                            <label class="checkbox-row"><input type="checkbox" id="welcome-mention" ${wMention ? 'checked' : ''}> Mencionar fora do embed</label>
                            <label class="checkbox-row"><input type="checkbox" id="welcome-embed" ${wUseEmbed ? 'checked' : ''}> Enviar como Embed</label>
                            <div id="embed-options" style="display:${wUseEmbed ? 'block' : 'none'};">
                                <label>Título</label><input type="text" id="welcome-title" value="${wTitle}">
                                <label>Autor</label><input type="text" id="welcome-author" value="${wAuthor}">
                                <label>Cor</label><div class="color-row"><input type="color" id="welcome-color-picker" value="${wColor}"><input type="text" id="welcome-color" value="${wColor}"></div>
                                <label>Imagem URL</label><input type="url" id="welcome-image" value="${wImage}">
                                <label>Rodapé</label><input type="text" id="welcome-footer" value="${wFooter}">
                            </div>
                        </div>
                    </div>
                    <div class="btn-row">
                        <button class="save-btn" id="saveWelcome">Salvar</button>
                        <button class="test-btn" id="testWelcome">🧪 Testar</button>
                    </div>
                </div>
            </div>

            <div class="section" id="section-moderacao">
                <div class="content-card">
                    <h2>Moderação Automática</h2>
                    <p class="desc">Filtros com punição e motivo configuráveis.</p>
                    <div class="log-item ${amEnabled ? 'active-item' : ''}" id="item-automod-master">
                        <div class="log-item-header">
                            <div class="log-item-info"><strong>🛡️ AutoMod</strong><span>Liga/desliga tudo</span></div>
                            <label class="toggle"><input type="checkbox" id="toggle-automod" ${amEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label>
                        </div>
                    </div>
                    <div id="automod-rules" style="display:${amEnabled ? 'block' : 'none'};">
                        ${ruleBlock('badWords', '🚫', 'Palavras proibidas', 'Lista de palavras', bw, `<label>Palavras (vírgula)</label><textarea id="words-badWords">${(Array.isArray(bw.words) ? bw.words.join(', ') : '').replace(/</g, '&lt;')}</textarea>`)}
                        ${ruleBlock('invites', '🔗', 'Convites Discord', 'Bloqueia invites', inv)}
                        ${ruleBlock('links', '🌐', 'Links', 'Bloqueia links', lnk)}
                        ${ruleBlock('spam', '📢', 'Spam', 'Msgs repetidas', sp, `<label>Limite</label><input type="number" id="limit-spam" value="${sp.limit || 4}" min="2">`)}
                        ${ruleBlock('massMention', '📣', 'Menções em massa', 'Muitas menções', mm, `<label>Limite</label><input type="number" id="limit-massMention" value="${mm.limit || 5}" min="2">`)}
                    </div>
                    <button class="save-btn" id="saveAutomod">Salvar Moderação</button>
                </div>
            </div>

            <div class="section" id="section-economia"><div class="content-card"><h2>Economia</h2><p class="desc">Em breve.</p></div></div>
            <div class="section" id="section-utilidades"><div class="content-card"><h2>Utilidades</h2><p class="desc">Em breve.</p></div></div>

            <div class="section" id="section-logs">
                <div class="content-card">
                    <h2>Logs de Auditoria</h2>
                    <p class="desc">Ative e escolha o canal de cada evento.</p>
                    ${['ban','kick','timeout','message','messageEdit','member'].map(type => {
                        const cfg = logCfgs[type];
                        const [title, desc] = logLabels[type];
                        return `<div class="log-item ${cfg.enabled ? 'active-item' : ''}" id="item-${type}"><div class="log-item-header"><div class="log-item-info"><strong>${title}</strong><span>${desc}</span></div><label class="toggle"><input type="checkbox" id="toggle-${type}" ${cfg.enabled ? 'checked' : ''}><span class="toggle-slider"></span></label></div><div class="log-channel-box ${cfg.enabled ? 'show' : ''}" id="channel-box-${type}"><label>Canal</label><select id="channel-${type}"><option value="">Selecione</option>${channelOptions(cfg.channel)}</select></div></div>`;
                    }).join('')}
                    <button class="save-btn" id="saveLogs">Salvar Logs</button>
                </div>
            </div>
        </main>
    </div>

    <div class="toast" id="toast">Salvo!</div>

    <script>
        const guildId = "${guild.id}";
        const logTypes = ['ban','kick','timeout','message','messageEdit','member'];
        const amRules = ['badWords','invites','links','spam','massMention'];
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('show'); }
        function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

        document.getElementById('openSidebar').onclick = openSidebar;
        document.getElementById('closeSidebar').onclick = closeSidebar;
        overlay.onclick = closeSidebar;

        // Swipe: qualquer lugar — direita abre, esquerda fecha
        let startX = 0, startY = 0;
        document.addEventListener('touchstart', e => {
            startX = e.changedTouches[0].screenX;
            startY = e.changedTouches[0].screenY;
        }, { passive: true });
        document.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].screenX - startX;
            const dy = Math.abs(e.changedTouches[0].screenY - startY);
            if (dy > 80) return; // ignora scroll vertical
            if (dx > 70) openSidebar();
            if (dx < -70) closeSidebar();
        }, { passive: true });

        document.querySelectorAll('.menu-item').forEach(item => {
            item.onclick = () => {
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                item.classList.add('active');
                document.getElementById('section-' + item.dataset.section).classList.add('active');
                closeSidebar();
            };
        });

        function bindToggle(id) {
            const t = document.getElementById('toggle-' + id);
            const b = document.getElementById('channel-box-' + id);
            const i = document.getElementById('item-' + id);
            if (!t) return;
            t.onchange = () => {
                if (t.checked) { b && b.classList.add('show'); i && i.classList.add('active-item'); }
                else { b && b.classList.remove('show'); i && i.classList.remove('active-item'); }
            };
        }
        logTypes.forEach(bindToggle);
        bindToggle('welcome');
        amRules.forEach(bindToggle);

        document.getElementById('toggle-automod').onchange = e => {
            document.getElementById('automod-rules').style.display = e.target.checked ? 'block' : 'none';
            document.getElementById('item-automod-master').classList.toggle('active-item', e.target.checked);
        };
        document.getElementById('welcome-embed').onchange = e => {
            document.getElementById('embed-options').style.display = e.target.checked ? 'block' : 'none';
        };
        document.getElementById('welcome-color-picker').oninput = e => {
            document.getElementById('welcome-color').value = e.target.value;
        };

        function showToast(msg, err) {
            const t = document.getElementById('toast');
            t.textContent = msg; t.classList.toggle('error', !!err); t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3000);
        }
        async function post(url, body) {
            return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }

        document.getElementById('savePrefix').onclick = async () => {
            const prefix = document.getElementById('prefix').value.trim();
            if (!prefix || prefix.length > 5) return alert('Prefixo inválido');
            const res = await post('/api/guilds/' + guildId + '/prefix', { prefix });
            showToast(res.ok ? 'Salvo!' : 'Erro', !res.ok);
        };

        document.getElementById('saveLogs').onclick = async () => {
            const logs = {};
            logTypes.forEach(type => {
                const enabled = document.getElementById('toggle-' + type).checked;
                logs[type] = { enabled, channel: enabled ? (document.getElementById('channel-' + type).value || null) : null };
            });
            const res = await post('/api/guilds/' + guildId + '/logs', { logs });
            showToast(res.ok ? 'Logs salvos!' : 'Erro', !res.ok);
        };

        function getWelcomeData() {
            return {
                enabled: document.getElementById('toggle-welcome').checked,
                channel: document.getElementById('channel-welcome').value || null,
                message: document.getElementById('welcome-message').value || '',
                useEmbed: document.getElementById('welcome-embed').checked,
                title: document.getElementById('welcome-title').value || '',
                author: document.getElementById('welcome-author').value || '',
                color: document.getElementById('welcome-color').value || '#7c3aed',
                image: document.getElementById('welcome-image').value || '',
                footer: document.getElementById('welcome-footer').value || '',
                mentionUser: document.getElementById('welcome-mention').checked
            };
        }

        document.getElementById('saveWelcome').onclick = async () => {
            const res = await post('/api/guilds/' + guildId + '/welcome', { welcome: getWelcomeData() });
            showToast(res.ok ? 'Salvo!' : 'Erro', !res.ok);
        };

        document.getElementById('testWelcome').onclick = async () => {
            const data = getWelcomeData();
            if (!data.channel) return alert('Selecione um canal');
            const btn = document.getElementById('testWelcome');
            btn.disabled = true;
            const res = await post('/api/guilds/' + guildId + '/welcome/test', { welcome: data });
            const json = await res.json().catch(() => ({}));
            showToast(res.ok ? 'Teste enviado!' : (json.error || 'Erro'), !res.ok);
            btn.disabled = false;
        };

        document.getElementById('saveAutomod').onclick = async () => {
            function rule(id) {
                return {
                    enabled: document.getElementById('toggle-' + id).checked,
                    action: document.getElementById('action-' + id).value,
                    duration: parseInt(document.getElementById('duration-' + id).value) || 10,
                    reason: document.getElementById('reason-' + id).value || ''
                };
            }
            const badWords = rule('badWords');
            badWords.words = (document.getElementById('words-badWords').value || '').split(',').map(w => w.trim()).filter(Boolean);
            const spam = rule('spam');
            spam.limit = parseInt(document.getElementById('limit-spam').value) || 4;
            const massMention = rule('massMention');
            massMention.limit = parseInt(document.getElementById('limit-massMention').value) || 5;
            const automod = {
                enabled: document.getElementById('toggle-automod').checked,
                badWords, invites: rule('invites'), links: rule('links'), spam, massMention
            };
            const res = await post('/api/guilds/' + guildId + '/automod', { automod });
            showToast(res.ok ? 'Moderação salva!' : 'Erro', !res.ok);
        };
    </script>
</body>
</html>
`;
};
