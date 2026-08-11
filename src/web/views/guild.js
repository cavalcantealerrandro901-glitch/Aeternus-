module.exports = (guild, user, userAvatarUrl, config, channels) => {
    const logs = config.logs || {};

    // Helper para ler config de cada tipo (novo + antigo formato)
    function getLogConfig(type) {
        if (logs[type] && typeof logs[type] === 'object') {
            return {
                enabled: !!logs[type].enabled,
                channel: logs[type].channel || ''
            };
        }
        // Formato antigo
        return {
            enabled: logs[type] !== false && !!logs.channel,
            channel: logs.channel || ''
        };
    }

    const banCfg = getLogConfig('ban');
    const kickCfg = getLogConfig('kick');
    const timeoutCfg = getLogConfig('timeout');
    const messageCfg = getLogConfig('message');
    const memberCfg = getLogConfig('member');

    const channelOptions = (selected) => channels.map(c =>
        `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>#${c.name}</option>`
    ).join('');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${guild.name} — Aeternus</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        .layout {
            display: flex;
            min-height: calc(100vh - 70px);
            position: relative;
            overflow-x: hidden;
        }

        .sidebar {
            width: 280px;
            background: var(--card);
            border-right: 1px solid var(--border);
            padding: 24px 16px;
            position: fixed;
            top: 70px;
            left: 0;
            bottom: 0;
            z-index: 90;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            overflow-y: auto;
        }

        .sidebar.open { transform: translateX(0); }

        .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 80;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .sidebar-overlay.show {
            opacity: 1;
            visibility: visible;
        }

        .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 28px;
            padding: 0 8px;
        }

        .sidebar-header h3 { font-size: 1.1rem; font-weight: 600; }

        .close-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 1.4rem;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
        }

        .close-btn:hover {
            color: var(--text);
            background: var(--border);
        }

        .menu-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 10px;
            color: var(--text-muted);
            font-weight: 500;
            margin-bottom: 4px;
            transition: all 0.2s;
            cursor: pointer;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            font-size: 0.95rem;
        }

        .menu-item:hover,
        .menu-item.active {
            background: rgba(124, 58, 237, 0.15);
            color: #a78bfa;
        }

        .main-content {
            flex: 1;
            padding: 30px 20px;
            width: 100%;
        }

        .menu-toggle {
            background: var(--card);
            border: 1px solid var(--border);
            color: var(--text);
            font-size: 1.3rem;
            width: 42px;
            height: 42px;
            border-radius: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .menu-toggle:hover {
            border-color: var(--primary);
            color: var(--primary);
        }

        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }

        .guild-title {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .guild-title img,
        .guild-title .fallback {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            object-fit: cover;
        }

        .fallback {
            background: var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.2rem;
        }

        .content-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 28px;
            margin-bottom: 20px;
        }

        .content-card h2 {
            font-size: 1.25rem;
            margin-bottom: 6px;
        }

        .content-card .desc {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-bottom: 24px;
        }

        .form-group {
            margin-bottom: 22px;
        }

        .form-group label {
            display: block;
            font-weight: 500;
            margin-bottom: 8px;
            font-size: 0.95rem;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            max-width: 320px;
            background: var(--bg);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
            border-color: var(--primary);
        }

        .form-group .hint {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-top: 6px;
        }

        .save-btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }

        .save-btn:hover { background: var(--primary-hover); }
        .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .toast {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: var(--success);
            color: white;
            padding: 14px 22px;
            border-radius: 12px;
            font-weight: 500;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
            z-index: 200;
        }

        .toast.show {
            opacity: 1;
            transform: translateY(0);
        }

        .section { display: none; }
        .section.active { display: block; }

        /* Toggle Switch */
        .log-item {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 18px 20px;
            margin-bottom: 14px;
            transition: border-color 0.2s;
        }

        .log-item.active-item {
            border-color: rgba(124, 58, 237, 0.4);
        }

        .log-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }

        .log-item-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .log-item-info strong {
            font-size: 0.98rem;
            font-weight: 600;
        }

        .log-item-info span {
            font-size: 0.82rem;
            color: var(--text-muted);
        }

        .toggle {
            position: relative;
            width: 52px;
            height: 30px;
            flex-shrink: 0;
        }

        .toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background: #333;
            border-radius: 30px;
            transition: 0.25s;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 24px;
            width: 24px;
            left: 3px;
            bottom: 3px;
            background: white;
            border-radius: 50%;
            transition: 0.25s;
        }

        .toggle input:checked + .toggle-slider {
            background: #3b82f6;
        }

        .toggle input:checked + .toggle-slider:before {
            transform: translateX(22px);
        }

        .log-channel-box {
            margin-top: 16px;
            padding-top: 14px;
            border-top: 1px solid var(--border);
            display: none;
        }

        .log-channel-box.show {
            display: block;
        }

        .log-channel-box label {
            display: block;
            font-size: 0.88rem;
            font-weight: 500;
            margin-bottom: 8px;
            color: var(--text-muted);
        }

        .log-channel-box select {
            width: 100%;
            max-width: 100%;
            background: var(--card);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 11px 14px;
            border-radius: 10px;
            font-size: 0.95rem;
            outline: none;
        }

        .log-channel-box select:focus {
            border-color: var(--primary);
        }

        @media (min-width: 900px) {
            .sidebar {
                position: relative;
                top: 0;
                transform: translateX(0);
            }
            .sidebar-overlay { display: none !important; }
            .menu-toggle { display: none; }
            .close-btn { display: none; }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <div class="logo">Aeternus</div>
            <div class="nav-links">
                <a href="/dashboard" class="btn btn-outline">Voltar</a>
                <a href="/logout" class="btn btn-outline">Sair</a>
            </div>
        </div>
    </nav>

    <div class="layout">
        <div class="sidebar-overlay" id="overlay"></div>

        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h3>Menu</h3>
                <button class="close-btn" id="closeSidebar">✕</button>
            </div>

            <button class="menu-item active" data-section="geral"><span>⚙️</span> Geral</button>
            <button class="menu-item" data-section="moderacao"><span>🛡️</span> Moderação</button>
            <button class="menu-item" data-section="economia"><span>💰</span> Economia</button>
            <button class="menu-item" data-section="utilidades"><span>🔧</span> Utilidades</button>
            <button class="menu-item" data-section="logs"><span>📋</span> Logs</button>
        </aside>

        <main class="main-content">
            <div class="page-header">
                <div class="guild-title">
                    ${guild.icon 
                        ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png" alt="">`
                        : `<div class="fallback">${guild.name.charAt(0)}</div>`
                    }
                    <div>
                        <div style="font-weight:600;font-size:1.2rem;">${guild.name}</div>
                        <div style="color:var(--text-muted);font-size:0.85rem;">Configurações do servidor</div>
                    </div>
                </div>
                <button class="menu-toggle" id="openSidebar">☰</button>
            </div>

            <!-- GERAL -->
            <div class="section active" id="section-geral">
                <div class="content-card">
                    <h2>Prefixo do Bot</h2>
                    <p class="desc">Altere o prefixo usado nos comandos de texto deste servidor.</p>

                    <div class="form-group">
                        <label for="prefix">Prefixo atual</label>
                        <input type="text" id="prefix" value="${config.prefix || '!'}" maxlength="5">
                        <div class="hint">Máximo 5 caracteres. Exemplo: !, ., >, a!</div>
                    </div>

                    <button class="save-btn" id="savePrefix">Salvar Prefixo</button>
                </div>
            </div>

            <!-- MODERAÇÃO -->
            <div class="section" id="section-moderacao">
                <div class="content-card">
                    <h2>Moderação</h2>
                    <p class="desc">Em breve você poderá configurar punições automáticas, avisos e mais.</p>
                </div>
            </div>

            <!-- ECONOMIA -->
            <div class="section" id="section-economia">
                <div class="content-card">
                    <h2>Economia</h2>
                    <p class="desc">Configurações de economia e apostas chegarão em breve.</p>
                </div>
            </div>

            <!-- UTILIDADES -->
            <div class="section" id="section-utilidades">
                <div class="content-card">
                    <h2>Utilidades</h2>
                    <p class="desc">Comandos utilitários e personalizações.</p>
                </div>
            </div>

            <!-- LOGS -->
            <div class="section" id="section-logs">
                <div class="content-card">
                    <h2>Logs de Auditoria</h2>
                    <p class="desc">Ative cada tipo de log e escolha o canal onde ele será enviado.</p>

                    <!-- BAN -->
                    <div class="log-item ${banCfg.enabled ? 'active-item' : ''}" id="item-ban">
                        <div class="log-item-header">
                            <div class="log-item-info">
                                <strong>🔨 Banimentos</strong>
                                <span>Banimentos e desbanimentos</span>
                            </div>
                            <label class="toggle">
                                <input type="checkbox" id="toggle-ban" ${banCfg.enabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="log-channel-box ${banCfg.enabled ? 'show' : ''}" id="channel-box-ban">
                            <label>Canal de destino</label>
                            <select id="channel-ban">
                                <option value="">Selecione um canal</option>
                                ${channelOptions(banCfg.channel)}
                            </select>
                        </div>
                    </div>

                    <!-- KICK -->
                    <div class="log-item ${kickCfg.enabled ? 'active-item' : ''}" id="item-kick">
                        <div class="log-item-header">
                            <div class="log-item-info">
                                <strong>👢 Expulsões</strong>
                                <span>Quando um membro for expulso</span>
                            </div>
                            <label class="toggle">
                                <input type="checkbox" id="toggle-kick" ${kickCfg.enabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="log-channel-box ${kickCfg.enabled ? 'show' : ''}" id="channel-box-kick">
                            <label>Canal de destino</label>
                            <select id="channel-kick">
                                <option value="">Selecione um canal</option>
                                ${channelOptions(kickCfg.channel)}
                            </select>
                        </div>
                    </div>

                    <!-- TIMEOUT -->
                    <div class="log-item ${timeoutCfg.enabled ? 'active-item' : ''}" id="item-timeout">
                        <div class="log-item-header">
                            <div class="log-item-info">
                                <strong>🔇 Castigos (Timeout)</strong>
                                <span>Aplicação e remoção de timeout</span>
                            </div>
                            <label class="toggle">
                                <input type="checkbox" id="toggle-timeout" ${timeoutCfg.enabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="log-channel-box ${timeoutCfg.enabled ? 'show' : ''}" id="channel-box-timeout">
                            <label>Canal de destino</label>
                            <select id="channel-timeout">
                                <option value="">Selecione um canal</option>
                                ${channelOptions(timeoutCfg.channel)}
                            </select>
                        </div>
                    </div>

                    <!-- MESSAGE -->
                    <div class="log-item ${messageCfg.enabled ? 'active-item' : ''}" id="item-message">
                        <div class="log-item-header">
                            <div class="log-item-info">
                                <strong>🗑️ Mensagens</strong>
                                <span>Mensagens apagadas</span>
                            </div>
                            <label class="toggle">
                                <input type="checkbox" id="toggle-message" ${messageCfg.enabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="log-channel-box ${messageCfg.enabled ? 'show' : ''}" id="channel-box-message">
                            <label>Canal de destino</label>
                            <select id="channel-message">
                                <option value="">Selecione um canal</option>
                                ${channelOptions(messageCfg.channel)}
                            </select>
                        </div>
                    </div>

                    <!-- MEMBER -->
                    <div class="log-item ${memberCfg.enabled ? 'active-item' : ''}" id="item-member">
                        <div class="log-item-header">
                            <div class="log-item-info">
                                <strong>👤 Membros</strong>
                                <span>Entrada e saída de membros</span>
                            </div>
                            <label class="toggle">
                                <input type="checkbox" id="toggle-member" ${memberCfg.enabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="log-channel-box ${memberCfg.enabled ? 'show' : ''}" id="channel-box-member">
                            <label>Canal de destino</label>
                            <select id="channel-member">
                                <option value="">Selecione um canal</option>
                                ${channelOptions(memberCfg.channel)}
                            </select>
                        </div>
                    </div>

                    <button class="save-btn" id="saveLogs" style="margin-top:10px;">Salvar Configurações de Logs</button>
                </div>
            </div>
        </main>
    </div>

    <div class="toast" id="toast">Salvo com sucesso!</div>

    <script>
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const openBtn = document.getElementById('openSidebar');
        const closeBtn = document.getElementById('closeSidebar');
        const guildId = "${guild.id}";
        const logTypes = ['ban', 'kick', 'timeout', 'message', 'member'];

        function openSidebar() {
            sidebar.classList.add('open');
            overlay.classList.add('show');
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        }

        openBtn.addEventListener('click', openSidebar);
        closeBtn.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);

        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                item.classList.add('active');
                document.getElementById('section-' + item.dataset.section).classList.add('active');
                closeSidebar();
            });
        });

        let touchStartX = 0;
        document.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', e => {
            const diff = e.changedTouches[0].screenX - touchStartX;
            if (diff > 80 && touchStartX < 40) openSidebar();
            if (diff < -80 && sidebar.classList.contains('open')) closeSidebar();
        }, { passive: true });

        // Toggle → mostra/esconde seletor de canal
        logTypes.forEach(type => {
            const toggle = document.getElementById('toggle-' + type);
            const box = document.getElementById('channel-box-' + type);
            const item = document.getElementById('item-' + type);

            toggle.addEventListener('change', () => {
                if (toggle.checked) {
                    box.classList.add('show');
                    item.classList.add('active-item');
                } else {
                    box.classList.remove('show');
                    item.classList.remove('active-item');
                }
            });
        });

        // Salvar Prefixo
        document.getElementById('savePrefix').addEventListener('click', async () => {
            const btn = document.getElementById('savePrefix');
            const prefix = document.getElementById('prefix').value.trim();
            if (!prefix || prefix.length > 5) return alert('Prefixo inválido');

            btn.disabled = true;
            btn.textContent = 'Salvando...';

            try {
                const res = await fetch('/api/guilds/' + guildId + '/prefix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prefix })
                });
                if (res.ok) showToast('Prefixo salvo com sucesso!');
                else alert('Erro ao salvar');
            } catch {
                alert('Erro de conexão');
            }

            btn.disabled = false;
            btn.textContent = 'Salvar Prefixo';
        });

        // Salvar Logs
        document.getElementById('saveLogs').addEventListener('click', async () => {
            const btn = document.getElementById('saveLogs');
            btn.disabled = true;
            btn.textContent = 'Salvando...';

            const logs = {};
            logTypes.forEach(type => {
                const enabled = document.getElementById('toggle-' + type).checked;
                const channel = document.getElementById('channel-' + type).value || null;
                logs[type] = { enabled, channel: enabled ? channel : null };
            });

            try {
                const res = await fetch('/api/guilds/' + guildId + '/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ logs })
                });
                if (res.ok) showToast('Configurações de logs salvas!');
                else alert('Erro ao salvar');
            } catch {
                alert('Erro de conexão');
            }

            btn.disabled = false;
            btn.textContent = 'Salvar Configurações de Logs';
        });

        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    </script>
</body>
</html>
`;
};
